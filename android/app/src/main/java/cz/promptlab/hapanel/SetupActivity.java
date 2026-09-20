package cz.promptlab.hapanel;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

/**
 * Nastaveni panelu: pripojeni k Home Assistantu, chovani displeje a kiosek.
 *
 * Obsah panelu (ktere entity a v jakych sekcich) se nastavuje primo v
 * panelu - ozubene kolo v rohu. Tady je jen to, co musi byt po ruce jeste
 * nez se panel k necemu pripoji.
 */
public class SetupActivity extends Activity {

    private static final int REQ_CAMERA = 72;

    private Config cfg;

    private EditText url, token, customUrl, idle, dim, brightDay, brightNight, pin, deviceName;
    private RadioButton srcHa, srcUrl;
    private Switch motion, motionDimOnly, proximity, autoBright, trueSleep, boot, report;
    private SeekBar sensitivity;
    private Spinner orientation;
    private TextView testResult;

    private static final String[] ORIENT_KEYS = { "sensor", "land", "port" };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        cfg = new Config(this);
        setContentView(R.layout.activity_setup);

        url = findViewById(R.id.url);
        token = findViewById(R.id.token);
        customUrl = findViewById(R.id.customUrl);
        idle = findViewById(R.id.idle);
        dim = findViewById(R.id.dim);
        brightDay = findViewById(R.id.brightDay);
        brightNight = findViewById(R.id.brightNight);
        pin = findViewById(R.id.pin);
        deviceName = findViewById(R.id.deviceName);
        srcHa = findViewById(R.id.srcHa);
        srcUrl = findViewById(R.id.srcUrl);
        motion = findViewById(R.id.motion);
        motionDimOnly = findViewById(R.id.motionDimOnly);
        proximity = findViewById(R.id.proximity);
        autoBright = findViewById(R.id.autoBright);
        trueSleep = findViewById(R.id.trueSleep);
        boot = findViewById(R.id.boot);
        report = findViewById(R.id.report);
        sensitivity = findViewById(R.id.sensitivity);
        orientation = findViewById(R.id.orientation);
        testResult = findViewById(R.id.testResult);

        ArrayAdapter<String> oa = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{ "Podle senzoru", "Na šířku", "Na výšku" });
        orientation.setAdapter(oa);

        load();

        findViewById(R.id.test).setOnClickListener(v -> test());
        findViewById(R.id.save).setOnClickListener(v -> { save(); finish(); });
        findViewById(R.id.export).setOnClickListener(v -> export());
        findViewById(R.id.importBtn).setOnClickListener(v -> importFromClipboard());
        findViewById(R.id.admin).setOnClickListener(v ->
                startActivity(ScreenManager.adminIntent(this)));
        findViewById(R.id.camPerm).setOnClickListener(v -> {
            if (MotionDetector.permitted(this)) {
                toast("Kamera už povolená je.");
            } else {
                requestPermissions(new String[]{ Manifest.permission.CAMERA }, REQ_CAMERA);
            }
        });

        TextView version = findViewById(R.id.version);
        version.setText("Verze " + BuildConfig.VERSION_NAME
                + " · " + android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL
                + "\nAutomatický start po zapnutí tabletu potřebuje na Androidu 10 a novějším "
                + "povolení „Zobrazovat přes ostatní aplikace“"
                + (canOverlay() ? " (povoleno)." : " (zatím nepovoleno)."));
        version.setOnClickListener(v -> {
            try {
                startActivity(new android.content.Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        android.net.Uri.parse("package:" + getPackageName())));
            } catch (Exception ignored) { }
        });
    }

    private boolean canOverlay() {
        try { return Settings.canDrawOverlays(this); } catch (Exception e) { return false; }
    }

    /* ---------- nacteni a ulozeni ---------- */

    private void load() {
        boolean ha = !"url".equals(cfg.str(Config.SOURCE, "ha"));
        srcHa.setChecked(ha);
        srcUrl.setChecked(!ha);
        url.setText(cfg.baseUrl());
        token.setText(cfg.token());
        customUrl.setText(cfg.str(Config.CUSTOM_URL, ""));
        idle.setText(String.valueOf(cfg.integer(Config.IDLE_SEC, 120)));
        dim.setText(String.valueOf(cfg.integer(Config.DIM_SEC, 300)));
        brightDay.setText(String.valueOf(cfg.integer(Config.BRIGHT_DAY, 100)));
        brightNight.setText(String.valueOf(cfg.integer(Config.BRIGHT_NIGHT, 20)));
        pin.setText(cfg.str(Config.PIN, ""));
        deviceName.setText(cfg.str(Config.DEVICE_NAME, "Panel"));
        motion.setChecked(cfg.bool(Config.MOTION, true));
        motionDimOnly.setChecked(cfg.bool(Config.MOTION_DIM_ONLY, true));
        proximity.setChecked(cfg.bool(Config.PROXIMITY, true));
        autoBright.setChecked(cfg.bool(Config.AUTO_BRIGHT, false));
        trueSleep.setChecked(cfg.bool(Config.TRUE_SLEEP, false));
        boot.setChecked(cfg.bool(Config.BOOT, true));
        report.setChecked(cfg.bool(Config.REPORT, true));
        sensitivity.setProgress(Math.max(1, Math.min(10, cfg.integer(Config.SENSITIVITY, 5))) - 1);
        String o = cfg.str(Config.ORIENTATION, "sensor");
        for (int i = 0; i < ORIENT_KEYS.length; i++) {
            if (ORIENT_KEYS[i].equals(o)) orientation.setSelection(i);
        }
    }

    private void save() {
        cfg.put(Config.SOURCE, srcUrl.isChecked() ? "url" : "ha");
        cfg.put(Config.BASE_URL, Config.normalizeUrl(text(url)));
        cfg.put(Config.TOKEN, text(token).replaceAll("\\s+", ""));
        cfg.put(Config.CUSTOM_URL, Config.normalizeUrl(text(customUrl)));
        cfg.put(Config.IDLE_SEC, number(idle, 120, 10, 86400));
        cfg.put(Config.DIM_SEC, number(dim, 300, 15, 86400));
        cfg.put(Config.BRIGHT_DAY, number(brightDay, 100, 1, 100));
        cfg.put(Config.BRIGHT_NIGHT, number(brightNight, 20, 1, 100));
        cfg.put(Config.PIN, text(pin));
        cfg.put(Config.DEVICE_NAME, text(deviceName).isEmpty() ? "Panel" : text(deviceName));
        cfg.put(Config.MOTION, motion.isChecked());
        cfg.put(Config.MOTION_DIM_ONLY, motionDimOnly.isChecked());
        cfg.put(Config.PROXIMITY, proximity.isChecked());
        cfg.put(Config.AUTO_BRIGHT, autoBright.isChecked());
        cfg.put(Config.TRUE_SLEEP, trueSleep.isChecked() && new ScreenManager(this, null).adminActive());
        cfg.put(Config.BOOT, boot.isChecked());
        cfg.put(Config.REPORT, report.isChecked());
        cfg.put(Config.SENSITIVITY, sensitivity.getProgress() + 1);
        int sel = orientation.getSelectedItemPosition();
        cfg.put(Config.ORIENTATION, ORIENT_KEYS[Math.max(0, Math.min(ORIENT_KEYS.length - 1, sel))]);

        if (motion.isChecked() && !MotionDetector.permitted(this)) {
            requestPermissions(new String[]{ Manifest.permission.CAMERA }, REQ_CAMERA);
        }
        toast(getString(R.string.msg_saved));
    }

    private void test() {
        testResult.setText("Zkouším…");
        new HaClient(Config.normalizeUrl(text(url)), text(token).replaceAll("\\s+", ""))
                .ping((ok, message) -> testResult.setText((ok ? "✓ " : "✗ ") + message));
    }

    /* ---------- zaloha nastaveni ---------- */

    private void export() {
        save();
        String json = cfg.export(true).toString();
        clipboard().setPrimaryClip(ClipData.newPlainText("HA Panel", json));
        toast("Nastavení i s tokenem je ve schránce.");
    }

    private void importFromClipboard() {
        try {
            ClipData clip = clipboard().getPrimaryClip();
            if (clip == null || clip.getItemCount() == 0) { toast("Schránka je prázdná."); return; }
            String txt = String.valueOf(clip.getItemAt(0).coerceToText(this));
            cfg.importJson(new JSONObject(txt));
            load();
            toast("Nastavení načteno ze schránky.");
        } catch (Exception e) {
            toast("Ve schránce není nastavení panelu.");
        }
    }

    private ClipboardManager clipboard() {
        return (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
    }

    /* ---------- drobnosti ---------- */

    @Override
    public void onRequestPermissionsResult(int req, String[] p, int[] granted) {
        super.onRequestPermissionsResult(req, p, granted);
        if (req == REQ_CAMERA) {
            boolean ok = granted.length > 0 && granted[0] == PackageManager.PERMISSION_GRANTED;
            toast(ok ? "Kamera povolena." : "Bez kamery se panel budí dotykem.");
        }
    }

    private static String text(EditText e) {
        return e.getText() == null ? "" : e.getText().toString().trim();
    }

    private static int number(EditText e, int def, int min, int max) {
        try {
            int v = Integer.parseInt(text(e));
            return Math.max(min, Math.min(max, v));
        } catch (Exception ex) {
            return def;
        }
    }

    private void toast(String m) { Toast.makeText(this, m, Toast.LENGTH_SHORT).show(); }

    @Override
    public void onBackPressed() {
        save();
        super.onBackPressed();
    }
}
