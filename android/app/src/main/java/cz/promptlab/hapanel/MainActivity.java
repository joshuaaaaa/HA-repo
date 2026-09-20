package cz.promptlab.hapanel;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.text.InputType;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.FrameLayout;

import java.util.Calendar;

/**
 * Panel pro tablet na zdi.
 *
 * Aktivita dela ctyri veci a nic jineho:
 *   1) drzi stranku panelu pres celou obrazovku, bez pruhu a bez moznosti
 *      odejit (kiosek),
 *   2) hlida, jestli je pred tabletem clovek - dotykem, cidlem priblizeni
 *      a kamerou (jen rozdil jasu mezi snimky, viz MotionDetector),
 *   3) podle toho rizeni displeje: plny jas -> klidovy rezim -> tma,
 *   4) hlasi stav tabletu do Home Assistantu (DeviceReporter).
 *
 * Stranka si zive stavy tahá sama pres WebSocket Home Assistantu; aktivita
 * jí pres most "Panel" pujcuje jen to, co prohlizec neumi.
 */
public class MainActivity extends Activity implements SensorEventListener {

    private static final String PAGE = "file:///android_asset/index.html";
    private static final int REQ_CAMERA = 71;
    private static final long TICK_MS = 1000;

    private WebView web;
    private View cover;
    private Config cfg;
    private ScreenManager display;
    private MotionDetector motion;
    private DeviceReporter reporter;
    private SensorManager sensors;
    private Sensor lightSensor, proximitySensor;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private long lastActivity = SystemClock.elapsedRealtime();
    private String phase = "active";            // active | idle | dim
    private float lastLight = -1;
    private long lastMotionAt;

    /* ---------------- zivotni cyklus ---------------- */

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        cfg = new Config(this);

        if (Build.VERSION.SDK_INT >= 27) {
            setTurnScreenOn(true);
            setShowWhenLocked(true);
        } else {
            getWindow().addFlags(
                  WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setTextZoom(100);                       // panel ma pevne rozvrzeni
        web.setBackgroundColor(Color.BLACK);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "Panel");
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) { return true; }
            @Override public void onPermissionRequest(PermissionRequest r) { r.deny(); }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));

        // Cerna plocha pres panel pri utlumu. Chyta dotyk, takze prvni
        // klepnuti tablet jen probudi a nic omylem nezapne.
        cover = new View(this);
        cover.setBackgroundColor(Color.BLACK);
        cover.setVisibility(View.GONE);
        cover.setOnTouchListener(new View.OnTouchListener() {
            @Override public boolean onTouch(View v, MotionEvent e) {
                if (e.getAction() == MotionEvent.ACTION_DOWN) note("dotyk");
                return true;
            }
        });
        root.addView(cover, new FrameLayout.LayoutParams(-1, -1));

        // Zachranny vychod: dlouhy stisk levého horního rohu otevre
        // nastaveni i tehdy, kdyz se stranka vubec nenacte.
        View corner = new View(this);
        corner.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) { askSettings(); return true; }
        });
        FrameLayout.LayoutParams cl = new FrameLayout.LayoutParams(dp(64), dp(64));
        cl.gravity = Gravity.TOP | Gravity.START;
        root.addView(corner, cl);

        setContentView(root);

        display = new ScreenManager(this, cover);
        motion = new MotionDetector(this, new MotionDetector.Listener() {
            @Override public void onMotion(int strength) {
                ui.post(new Runnable() { @Override public void run() { onMotionSeen(); } });
            }
        });
        reporter = new DeviceReporter(this);
        sensors = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensors != null) {
            lightSensor = sensors.getDefaultSensor(Sensor.TYPE_LIGHT);
            proximitySensor = sensors.getDefaultSensor(Sensor.TYPE_PROXIMITY);
        }

        load();
        hideBars();
        ui.postDelayed(ticker, TICK_MS);

        if (!cfg.configured()) {
            // Prvni spusteni: rovnou nastaveni, panel nema co ukazovat.
            startActivity(new Intent(this, SetupActivity.class));
        } else if (cfg.bool(Config.MOTION, true) && !MotionDetector.permitted(this)) {
            requestPermissions(new String[]{ Manifest.permission.CAMERA }, REQ_CAMERA);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyOrientation();
        reporter.configure(cfg);
        registerSensors();
        wake("návrat");
        hideBars();
        if (web != null && reloadPending) { reloadPending = false; load(); }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Kameru pustit vzdy: Android od verze 9 stejne zabere kameru
        // aplikaci, ktera neni v popredi - drzet si ji nema smysl.
        motion.stop();
        // Cidlo priblizeni ale necháme bezet, kdyz panel jen zhasnul:
        // diky nemu probudi displej mavnuti rukou i po opravdovem
        // zhasnuti. Pri odchodu do nastaveni cidla pustime.
        if (sensors != null && !"dim".equals(phase)) sensors.unregisterListener(this);
        display.release();
    }

    @Override
    protected void onDestroy() {
        ui.removeCallbacksAndMessages(null);
        motion.stop();
        reporter.stop();
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /** Kiosek: tlacitko zpet panel nezavira. */
    @Override
    public void onBackPressed() { /* zamerne prazdne */ }

    @Override
    public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) hideBars();
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent e) {
        if (e.getAction() == MotionEvent.ACTION_DOWN) note("dotyk");
        return super.dispatchTouchEvent(e);
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] granted) {
        super.onRequestPermissionsResult(req, perms, granted);
        if (req == REQ_CAMERA && granted.length > 0
                && granted[0] == PackageManager.PERMISSION_GRANTED) {
            applyMotionSource();
        }
    }

    /* ---------------- stranka ---------------- */

    private boolean reloadPending;

    private void load() {
        if (web == null) return;
        if ("url".equals(cfg.str(Config.SOURCE, "ha"))) {
            String url = Config.normalizeUrl(cfg.str(Config.CUSTOM_URL, ""));
            if (url.isEmpty()) url = PAGE;
            web.setWebViewClient(new RetryClient(web, url));
            web.loadUrl(url);
        } else {
            web.setWebViewClient(new RetryClient(web, PAGE));
            web.loadUrl(PAGE);
        }
    }

    private void js(final String code) {
        if (web == null) return;
        ui.post(new Runnable() {
            @Override public void run() {
                try { web.evaluateJavascript(code, null); } catch (Exception ignored) { }
            }
        });
    }

    /* ---------------- pritomnost a displej ---------------- */

    /** Neco se stalo - clovek je tu. */
    private void note(String reason) {
        lastActivity = SystemClock.elapsedRealtime();
        if (!"active".equals(phase)) wake(reason);
    }

    private void onMotionSeen() {
        lastMotionAt = SystemClock.elapsedRealtime();
        reporter.push(true, !display.dimmed(), lastLight);
        note("pohyb");
    }

    private void wake(String reason) {
        boolean was = !"active".equals(phase);
        phase = "active";
        lastActivity = SystemClock.elapsedRealtime();
        display.wake(brightnessNow());
        hideBars();
        motion.resetBaseline();
        applyMotionSource();
        if (was) {
            js("window.panelPresence && window.panelPresence('active');");
            reporter.push(lastMotionAt > 0
                    && SystemClock.elapsedRealtime() - lastMotionAt < 10000, true, lastLight);
        }
    }

    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            try { step(); } catch (Exception ignored) { }
            ui.postDelayed(this, TICK_MS);
        }
    };

    /**
     * Jediny prechod stavu: prace -> klid -> tma. Zpet se skace rovnou do
     * prace, at uz probudi cokoli (dotyk, pohyb, ruka nad cidlem, prikaz
     * z Home Assistantu).
     */
    private void step() {
        long idle = (SystemClock.elapsedRealtime() - lastActivity) / 1000;
        int toIdle = Math.max(10, cfg.integer(Config.IDLE_SEC, 120));
        int toDim = Math.max(toIdle + 5, cfg.integer(Config.DIM_SEC, 300));

        if (idle >= toDim && !"dim".equals(phase)) {
            phase = "dim";
            js("window.panelPresence && window.panelPresence('dim');");
            display.sleep(cfg.bool(Config.TRUE_SLEEP, false));
            applyMotionSource();
            reporter.push(false, false, lastLight);
        } else if (idle >= toIdle && "active".equals(phase)) {
            phase = "idle";
            js("window.panelPresence && window.panelPresence('idle');");
        }

        // Pohyb "vyprchá" - jinak by v Home Assistantu zustal viset zapnuty.
        if (lastMotionAt > 0 && SystemClock.elapsedRealtime() - lastMotionAt > 30000) {
            lastMotionAt = 0;
            reporter.push(false, !display.dimmed(), lastLight);
        }
    }

    /** Kamera bezi bud porad, nebo jen pri zhasnutem displeji (setri proud). */
    private void applyMotionSource() {
        boolean want = cfg.bool(Config.MOTION, true) && MotionDetector.permitted(this);
        if (want && cfg.bool(Config.MOTION_DIM_ONLY, true) && !"dim".equals(phase)) want = false;
        motion.setSensitivity(cfg.integer(Config.SENSITIVITY, 5));
        if (want && !motion.running()) motion.start();
        else if (!want && motion.running()) motion.stop();
    }

    /** Jas podle denni doby, pripadne podle svetelneho cidla. */
    private int brightnessNow() {
        int day = clampPercent(cfg.integer(Config.BRIGHT_DAY, 100));
        int night = clampPercent(cfg.integer(Config.BRIGHT_NIGHT, 20));
        int from = cfg.integer(Config.NIGHT_FROM, 22), to = cfg.integer(Config.NIGHT_TO, 7);
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        boolean night_ = from <= to ? (hour >= from && hour < to) : (hour >= from || hour < to);
        int base = night_ ? night : day;

        if (cfg.bool(Config.AUTO_BRIGHT, false) && lastLight >= 0) {
            // 0 lx -> nocni jas, 400 lx a vic -> denni; mezi tim plynule
            float k = Math.min(1f, lastLight / 400f);
            base = Math.round(night + (day - night) * k);
        }
        return clampPercent(base);
    }

    static int clampPercent(int v) { return Math.max(1, Math.min(100, v)); }

    private void registerSensors() {
        if (sensors == null) return;
        if (lightSensor != null) {
            sensors.registerListener(this, lightSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
        if (proximitySensor != null && cfg.bool(Config.PROXIMITY, true)) {
            sensors.registerListener(this, proximitySensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        if (e.sensor.getType() == Sensor.TYPE_LIGHT) {
            lastLight = e.values[0];
            if (cfg.bool(Config.AUTO_BRIGHT, false) && "active".equals(phase)) {
                display.setBrightness(brightnessNow());
            }
        } else if (e.sensor.getType() == Sensor.TYPE_PROXIMITY) {
            // Ruka nad tabletem = blizko. Probouzime az pri priblizeni,
            // ne pri oddaleni, at se panel nebudi sam po zhasnuti.
            float max = e.sensor.getMaximumRange();
            if (e.values[0] < Math.max(1f, max / 2f)) note("přiblížení");
        }
    }

    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    /* ---------------- kiosek ---------------- */

    private void hideBars() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(
              View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    private void applyOrientation() {
        String o = cfg.str(Config.ORIENTATION, "sensor");
        if ("land".equals(o)) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        } else if ("port".equals(o)) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR);
        }
    }

    /** Nastaveni je za PINem, pokud si ho uzivatel zapnul. */
    private void askSettings() {
        final String pin = cfg.str(Config.PIN, "");
        if (pin.isEmpty()) {
            reloadPending = true;
            startActivity(new Intent(this, SetupActivity.class));
            return;
        }
        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.msg_pin))
                .setView(input)
                .setNegativeButton(android.R.string.cancel, null)
                .setPositiveButton(android.R.string.ok, (d, w) -> {
                    if (pin.equals(input.getText().toString())) {
                        reloadPending = true;
                        startActivity(new Intent(this, SetupActivity.class));
                    } else {
                        js("window.panelToast && window.panelToast('"
                                + getString(R.string.msg_pin_bad) + "');");
                    }
                })
                .show();
    }

    private int dp(int v) { return Math.round(getResources().getDisplayMetrics().density * v); }

    /* ---------------- most do stranky ---------------- */

    /**
     * Co si stranka muze vyzadat. Zamerne uzky seznam: nastaveni, rizeni
     * displeje a udaje o tabletu. Stranka bezi z assets teto aplikace,
     * nic ciziho se k mostu nedostane.
     */
    public final class Bridge {

        @JavascriptInterface
        public boolean isNativeApp() { return true; }

        /** Adresa, token a ulozene rozvrzeni panelu. */
        @JavascriptInterface
        public String config() { return cfg.toJson().toString(); }

        /** Rozvrzeni z editoru - uklada se do aplikace, ne do localStorage. */
        @JavascriptInterface
        public void saveLayout(String json) {
            if (json == null) return;
            cfg.put(Config.LAYOUT, json);
        }

        @JavascriptInterface
        public void openSettings() {
            ui.post(MainActivity.this::askSettings);
        }

        /** Stranka hlasi dotyk/interakci - odklada klidovy rezim. */
        @JavascriptInterface
        public void activity() { ui.post(() -> note("stránka")); }

        /** Rizeni displeje z Home Assistantu ("on" / "off"). */
        @JavascriptInterface
        public void screen(final String state) {
            ui.post(() -> {
                if ("off".equals(state)) {
                    lastActivity = 0;
                    phase = "dim";
                    js("window.panelPresence && window.panelPresence('dim');");
                    display.sleep(cfg.bool(Config.TRUE_SLEEP, false));
                    applyMotionSource();
                } else {
                    wake("Home Assistant");
                }
            });
        }

        @JavascriptInterface
        public void setBrightness(final int percent) {
            ui.post(() -> display.setBrightness(clampPercent(percent)));
        }

        /** Kratke cuknuti pri klepnuti na dlazdici - potvrzeni, ze to vzalo. */
        @JavascriptInterface
        public void tap() {
            ui.post(() -> {
                if (web != null) web.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
            });
        }

        /** Legacy most puvodni telemetrie: stranka rika, ma-li displej svitit. */
        @JavascriptInterface
        public void setAwake(final boolean awake) {
            ui.post(() -> { if (awake) wake("stránka"); else screen("off"); });
        }

        @JavascriptInterface
        public void reload() { ui.post(MainActivity.this::load); }
    }
}
