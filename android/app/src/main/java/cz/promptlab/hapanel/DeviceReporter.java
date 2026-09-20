package cz.promptlab.hapanel;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import org.json.JSONObject;

import java.util.Locale;

/**
 * Tablet neni jen obrazovka - hlasi zpatky, co sam vi.
 *
 * V Home Assistantu takhle vzniknou ctyri entity (nazev se odvodi od nazvu
 * zarizeni v nastaveni, napr. "Panel v kuchyni"):
 *
 *   sensor.panel_v_kuchyni_baterie      - nabiti v procentech + zda se nabiji
 *   sensor.panel_v_kuchyni_osvetleni    - okolni svetlo v luxech
 *   binary_sensor.panel_v_kuchyni_pohyb - pohyb pred tabletem
 *   binary_sensor.panel_v_kuchyni_displej - jestli displej sviti
 *
 * Jde je pouzit v automatizacich: rozsvitit svetlo, kdyz panel vidi pohyb,
 * nebo upozornit na vybitou baterii.
 *
 * Pozor: stavy zapsane pres REST nejsou trvale entity - po restartu Home
 * Assistantu zmizi a objevi se znovu pri prvnim dalsim hlaseni (do minuty).
 */
public final class DeviceReporter {

    private static final long PERIOD_MS = 60_000;      // pravidelne hlaseni
    private static final long MIN_GAP_MS = 2_000;      // nejcastejsi hlaseni pri zmene

    private final Context ctx;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private HaClient ha;
    private String slug = "panel";
    private String title = "Panel";
    private boolean on;

    private volatile boolean motion, screenOn = true;
    private volatile float light = -1;
    private long lastSent;
    private final long startedAt = SystemClock.elapsedRealtime();

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            send();
            handler.postDelayed(this, PERIOD_MS);
        }
    };

    public DeviceReporter(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    public void configure(Config cfg) {
        title = cfg.str(Config.DEVICE_NAME, "Panel").trim();
        if (title.isEmpty()) title = "Panel";
        slug = slug(title);
        ha = new HaClient(cfg.baseUrl(), cfg.token());
        boolean want = cfg.bool(Config.REPORT, true)
                && "ha".equals(cfg.str(Config.SOURCE, "ha")) && ha.usable();
        if (want && !on) start();
        else if (!want && on) stop();
    }

    public void start() {
        if (on) return;
        on = true;
        handler.post(tick);
    }

    public void stop() {
        if (!on) return;
        on = false;
        handler.removeCallbacks(tick);
    }

    /** Zmena, ktera nepocka na pravidelne hlaseni (pohyb, zhasnuti). */
    public void push(boolean motion, boolean screenOn, float light) {
        boolean changed = this.motion != motion || this.screenOn != screenOn;
        this.motion = motion;
        this.screenOn = screenOn;
        this.light = light;
        if (!on || !changed) return;
        long now = SystemClock.elapsedRealtime();
        if (now - lastSent < MIN_GAP_MS) return;
        send();
    }

    private void send() {
        if (!on || ha == null || !ha.usable()) return;
        lastSent = SystemClock.elapsedRealtime();

        int battery = -1;
        boolean charging = false;
        try {
            Intent b = ctx.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (b != null) {
                int level = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = b.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                if (level >= 0 && scale > 0) battery = Math.round(level * 100f / scale);
                int st = b.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                charging = st == BatteryManager.BATTERY_STATUS_CHARGING
                        || st == BatteryManager.BATTERY_STATUS_FULL;
            }
        } catch (Exception ignored) { }

        long upMin = (SystemClock.elapsedRealtime() - startedAt) / 60000;

        if (battery >= 0) {
            ha.setState("sensor." + slug + "_baterie", String.valueOf(battery),
                    attrs(title + " baterie", "%", "battery", null,
                          "charging", charging, "uptime_min", upMin));
        }
        if (light >= 0) {
            ha.setState("sensor." + slug + "_osvetleni", String.format(Locale.US, "%.0f", light),
                    attrs(title + " osvětlení", "lx", "illuminance", null));
        }
        ha.setState("binary_sensor." + slug + "_pohyb", motion ? "on" : "off",
                attrs(title + " pohyb", null, "motion", "mdi:motion-sensor"));
        ha.setState("binary_sensor." + slug + "_displej", screenOn ? "on" : "off",
                attrs(title + " displej", null, null, "mdi:tablet-dashboard"));
    }

    private static JSONObject attrs(String name, String unit, String deviceClass, String icon,
                                    Object... extra) {
        JSONObject a = new JSONObject();
        try {
            a.put("friendly_name", name);
            if (unit != null) a.put("unit_of_measurement", unit);
            if (deviceClass != null) a.put("device_class", deviceClass);
            if (icon != null) a.put("icon", icon);
            a.put("source", "HA Panel");
            for (int i = 0; i + 1 < extra.length; i += 2) {
                a.put(String.valueOf(extra[i]), extra[i + 1]);
            }
        } catch (Exception ignored) { }
        return a;
    }

    /** "Panel v kuchyni" -> "panel_v_kuchyni" (entity_id snese jen a-z, 0-9 a _) */
    static String slug(String s) {
        String t = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.US)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        return t.isEmpty() ? "panel" : t;
    }
}
