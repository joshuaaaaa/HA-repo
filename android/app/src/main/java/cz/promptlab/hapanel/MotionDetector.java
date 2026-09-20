package cz.promptlab.hapanel;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.Image;
import android.media.ImageReader;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import android.util.Size;
import android.view.Surface;

import java.nio.ByteBuffer;
import java.util.Collections;

/**
 * Detekce pohybu pred tabletem z obrazu predni kamery.
 *
 * Jak to funguje: ze snimku se cte jen jasova slozka (Y), ta se zmensi na
 * mrizku 16x12 policek a porovna s predchozim snimkem. Kdyz se dost policek
 * zmeni dost vyrazne, je to pohyb.
 *
 * Co se s obrazem NEDEJE: nikam se neposila, nikam neuklada, nikde se
 * nezobrazuje. Z kazdeho snimku zbyde 192 cisel, ktera hned prepise dalsi
 * snimek. Kamera je otevrena jen tehdy, kdy je detekce opravdu potreba
 * (volitelne jen pri zhasnutem displeji).
 */
public final class MotionDetector {

    public interface Listener {
        /** Volano ve vlakne kamery, kdyz se pred tabletem neco pohnulo. */
        void onMotion(int strength);
    }

    private static final int COLS = 16, ROWS = 12;
    private static final long FRAME_MS = 250;      // castejsi kontrola nema smysl
    private static final long WARMUP_MS = 1200;    // prvni snimky po otevreni zahodit

    private final Context ctx;
    private final Listener listener;

    private HandlerThread thread;
    private Handler bg;
    private CameraDevice camera;
    private CameraCaptureSession session;
    private ImageReader reader;

    private final int[] prev = new int[COLS * ROWS];
    private boolean havePrev;
    private long nextFrameAt, openedAt;
    private volatile boolean running;
    private volatile int threshold = 12;           // rozdil jasu policka (0-255)
    private volatile int minCells = 4;             // kolik policek se musi zmenit

    public MotionDetector(Context ctx, Listener listener) {
        this.ctx = ctx.getApplicationContext();
        this.listener = listener;
    }

    public static boolean permitted(Context ctx) {
        return ctx.checkSelfPermission(Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
    }

    public boolean running() { return running; }

    /** citlivost 1 (nejmene citliva) az 10 (nejcitlivejsi) */
    public void setSensitivity(int s) {
        int v = Math.max(1, Math.min(10, s));
        threshold = 26 - 2 * v;                    // 24 .. 6
        minCells = Math.max(2, 9 - v);             // 8 .. 2
    }

    public synchronized void start() {
        if (running || !permitted(ctx)) return;
        String id = pickCamera();
        if (id == null) return;

        thread = new HandlerThread("motion");
        thread.start();
        bg = new Handler(thread.getLooper());
        havePrev = false;
        openedAt = SystemClock.elapsedRealtime();
        nextFrameAt = 0;
        running = true;

        try {
            CameraManager cm = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
            Size size = pickSize(cm, id);
            reader = ImageReader.newInstance(size.getWidth(), size.getHeight(),
                    ImageFormat.YUV_420_888, 2);
            reader.setOnImageAvailableListener(new ImageReader.OnImageAvailableListener() {
                @Override public void onImageAvailable(ImageReader r) { onFrame(r); }
            }, bg);
            cm.openCamera(id, new CameraDevice.StateCallback() {
                @Override public void onOpened(CameraDevice cd) { camera = cd; configure(); }
                @Override public void onDisconnected(CameraDevice cd) { stop(); }
                @Override public void onError(CameraDevice cd, int err) { stop(); }
            }, bg);
        } catch (CameraAccessException | SecurityException | IllegalArgumentException e) {
            stop();
        }
    }

    public synchronized void stop() {
        running = false;
        try { if (session != null) session.close(); } catch (Exception ignored) { }
        try { if (camera != null) camera.close(); } catch (Exception ignored) { }
        try { if (reader != null) reader.close(); } catch (Exception ignored) { }
        session = null; camera = null; reader = null;
        if (thread != null) { thread.quitSafely(); thread = null; bg = null; }
        havePrev = false;
    }

    /**
     * Po rozsviceni displeje se obraz zmeni svetlem z panelu - chvili se
     * tedy nic nevyhodnocuje, jinak by se panel budil sam od sebe.
     */
    public void resetBaseline() {
        havePrev = false;
        openedAt = SystemClock.elapsedRealtime();
    }

    /* ---------- vnitrek ---------- */

    private String pickCamera() {
        try {
            CameraManager cm = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
            if (cm == null) return null;
            String[] ids = cm.getCameraIdList();
            String fallback = null;
            for (String id : ids) {
                Integer facing = cm.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) return id;
                if (fallback == null) fallback = id;
            }
            return fallback;
        } catch (Exception e) {
            return null;
        }
    }

    /** Nejmensi rozumne rozliseni - na rozdil jasu staci a sezere nejmin proudu. */
    private Size pickSize(CameraManager cm, String id) throws CameraAccessException {
        StreamConfigurationMap map = cm.getCameraCharacteristics(id)
                .get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
        Size best = new Size(320, 240);
        if (map == null) return best;
        Size[] sizes = map.getOutputSizes(ImageFormat.YUV_420_888);
        if (sizes == null || sizes.length == 0) return best;
        long bestArea = Long.MAX_VALUE;
        for (Size s : sizes) {
            long area = (long) s.getWidth() * s.getHeight();
            if (s.getWidth() >= 160 && area < bestArea) { bestArea = area; best = s; }
        }
        return best;
    }

    private void configure() {
        try {
            if (camera == null || reader == null) return;
            final Surface surface = reader.getSurface();
            camera.createCaptureSession(Collections.singletonList(surface),
                new CameraCaptureSession.StateCallback() {
                    @Override public void onConfigured(CameraCaptureSession s) {
                        session = s;
                        try {
                            CaptureRequest.Builder b =
                                    camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
                            b.addTarget(surface);
                            b.set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON);
                            b.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_OFF);
                            s.setRepeatingRequest(b.build(), null, bg);
                        } catch (Exception e) { stop(); }
                    }
                    @Override public void onConfigureFailed(CameraCaptureSession s) { stop(); }
                }, bg);
        } catch (Exception e) {
            stop();
        }
    }

    private void onFrame(ImageReader r) {
        Image img = null;
        try {
            img = r.acquireLatestImage();
            if (img == null) return;
            long now = SystemClock.elapsedRealtime();
            if (now < nextFrameAt) return;
            nextFrameAt = now + FRAME_MS;

            int[] grid = sample(img);
            if (grid == null) return;

            if (!havePrev || now - openedAt < WARMUP_MS) {
                System.arraycopy(grid, 0, prev, 0, grid.length);
                havePrev = true;
                return;
            }

            int changed = 0, sum = 0;
            for (int i = 0; i < grid.length; i++) {
                int d = Math.abs(grid[i] - prev[i]);
                if (d > threshold) { changed++; sum += d; }
            }
            System.arraycopy(grid, 0, prev, 0, grid.length);

            if (changed >= minCells && listener != null) {
                listener.onMotion(Math.min(100, sum / Math.max(1, changed)));
            }
        } catch (Exception ignored) {
            // Snimek muze prijit ve chvili zavirani kamery - nic se nedeje.
        } finally {
            if (img != null) { try { img.close(); } catch (Exception ignored) { } }
        }
    }

    /** Prumerny jas v mrizce COLS x ROWS. */
    private int[] sample(Image img) {
        Image.Plane[] planes = img.getPlanes();
        if (planes == null || planes.length == 0) return null;
        ByteBuffer buf = planes[0].getBuffer();
        int rowStride = planes[0].getRowStride();
        int pixStride = planes[0].getPixelStride();
        int w = img.getWidth(), h = img.getHeight();
        int[] grid = new int[COLS * ROWS];

        for (int cy = 0; cy < ROWS; cy++) {
            for (int cx = 0; cx < COLS; cx++) {
                int x0 = cx * w / COLS, x1 = (cx + 1) * w / COLS;
                int y0 = cy * h / ROWS, y1 = (cy + 1) * h / ROWS;
                int sum = 0, n = 0;
                // krok 2 px staci - jde o prumer, ne o detail
                for (int y = y0; y < y1; y += 2) {
                    int base = y * rowStride;
                    for (int x = x0; x < x1; x += 2) {
                        int idx = base + x * pixStride;
                        if (idx < 0 || idx >= buf.limit()) continue;
                        sum += buf.get(idx) & 0xFF;
                        n++;
                    }
                }
                grid[cy * COLS + cx] = n > 0 ? sum / n : 0;
            }
        }
        return grid;
    }
}
