package cz.promptlab.hapanel;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

/**
 * Vsechno nastaveni na jednom miste.
 *
 * Ulozene je v SharedPreferences, ne v localStorage stranky: pri
 * file:// adrese neni localStorage spolehlivy a nastaveni by se ztratilo
 * pri kazdem vycisteni dat WebView. Stranka si ho pres most (Panel.config)
 * precte jako JSON a zpatky uklada tez pres most.
 */
public final class Config {

    private static final String FILE = "panel";

    /* ---- klice ---- */
    public static final String SOURCE        = "source";        // "ha" | "url"
    public static final String BASE_URL      = "baseUrl";
    public static final String TOKEN         = "token";
    public static final String CUSTOM_URL    = "customUrl";

    public static final String IDLE_SEC      = "idleSec";       // prechod do klidoveho rezimu
    public static final String DIM_SEC       = "dimSec";        // zhasnuti displeje
    public static final String BRIGHT_DAY    = "brightDay";
    public static final String BRIGHT_NIGHT  = "brightNight";
    public static final String NIGHT_FROM    = "nightFrom";     // hodina
    public static final String NIGHT_TO      = "nightTo";

    public static final String MOTION        = "motion";
    public static final String MOTION_DIM_ONLY = "motionDimOnly";
    public static final String SENSITIVITY   = "sensitivity";   // 1..10
    public static final String PROXIMITY     = "proximity";
    public static final String AUTO_BRIGHT   = "autoBright";
    public static final String TRUE_SLEEP    = "trueSleep";

    public static final String BOOT          = "boot";
    public static final String ORIENTATION   = "orientation";   // "sensor" | "land" | "port"
    public static final String PIN           = "pin";
    public static final String REPORT        = "report";
    public static final String DEVICE_NAME   = "deviceName";

    public static final String LAYOUT        = "layout";        // rozvrzeni panelu (JSON od stranky)

    private final SharedPreferences p;

    public Config(Context ctx) {
        p = ctx.getApplicationContext().getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    /* ---- cteni ---- */
    public String str(String k, String def) { return p.getString(k, def); }
    public boolean bool(String k, boolean def) { return p.getBoolean(k, def); }
    public int integer(String k, int def) { return p.getInt(k, def); }

    public String baseUrl() { return normalizeUrl(p.getString(BASE_URL, "")); }
    public String token()   { return p.getString(TOKEN, ""); }

    public boolean configured() {
        if ("url".equals(p.getString(SOURCE, "ha"))) {
            return !p.getString(CUSTOM_URL, "").trim().isEmpty();
        }
        return !baseUrl().isEmpty() && !token().isEmpty();
    }

    /** Uzivatel adresu pise rucne - srovname konec i chybejici schema. */
    public static String normalizeUrl(String raw) {
        if (raw == null) return "";
        String u = raw.trim();
        if (u.isEmpty()) return "";
        if (!u.contains("://")) u = "http://" + u;
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        return u;
    }

    /* ---- zapis ---- */
    public void put(String k, String v) { p.edit().putString(k, v).apply(); }
    public void put(String k, boolean v) { p.edit().putBoolean(k, v).apply(); }
    public void put(String k, int v) { p.edit().putInt(k, v).apply(); }

    /* ---- pro stranku ----
       Token se posila taky: stranka ho potrebuje k prihlaseni pres
       WebSocket. Stranka bezi z assets teto aplikace, jinam se nedostane. */
    public JSONObject toJson() {
        JSONObject o = new JSONObject();
        try {
            o.put("source", str(SOURCE, "ha"));
            o.put("baseUrl", baseUrl());
            o.put("token", token());
            o.put("idleSec", integer(IDLE_SEC, 120));
            o.put("dimSec", integer(DIM_SEC, 300));
            o.put("deviceName", str(DEVICE_NAME, "Panel"));
            o.put("pinSet", !str(PIN, "").isEmpty());
            o.put("native", true);
            o.put("motion", bool(MOTION, true));
            o.put("layout", str(LAYOUT, ""));
        } catch (Exception ignored) { }
        return o;
    }

    /** Vsechno nastaveni jako JSON - pro zalohu a prenos na dalsi tablet. */
    public JSONObject export(boolean withSecrets) {
        JSONObject o = new JSONObject();
        try {
            o.put(SOURCE, str(SOURCE, "ha"));
            o.put(BASE_URL, baseUrl());
            if (withSecrets) o.put(TOKEN, token());
            o.put(CUSTOM_URL, str(CUSTOM_URL, ""));
            o.put(IDLE_SEC, integer(IDLE_SEC, 120));
            o.put(DIM_SEC, integer(DIM_SEC, 300));
            o.put(BRIGHT_DAY, integer(BRIGHT_DAY, 100));
            o.put(BRIGHT_NIGHT, integer(BRIGHT_NIGHT, 20));
            o.put(NIGHT_FROM, integer(NIGHT_FROM, 22));
            o.put(NIGHT_TO, integer(NIGHT_TO, 7));
            o.put(MOTION, bool(MOTION, true));
            o.put(MOTION_DIM_ONLY, bool(MOTION_DIM_ONLY, true));
            o.put(SENSITIVITY, integer(SENSITIVITY, 5));
            o.put(PROXIMITY, bool(PROXIMITY, true));
            o.put(AUTO_BRIGHT, bool(AUTO_BRIGHT, false));
            o.put(TRUE_SLEEP, bool(TRUE_SLEEP, false));
            o.put(BOOT, bool(BOOT, true));
            o.put(ORIENTATION, str(ORIENTATION, "sensor"));
            o.put(REPORT, bool(REPORT, true));
            o.put(DEVICE_NAME, str(DEVICE_NAME, "Panel"));
            String layout = str(LAYOUT, "");
            if (!layout.isEmpty()) o.put(LAYOUT, new JSONObject(layout));
        } catch (Exception ignored) { }
        return o;
    }

    /** Protejsek k export() - co v JSONu neni, zustane, jak bylo. */
    public void importJson(JSONObject o) {
        SharedPreferences.Editor e = p.edit();
        putIfString(e, o, SOURCE); putIfString(e, o, BASE_URL); putIfString(e, o, TOKEN);
        putIfString(e, o, CUSTOM_URL); putIfString(e, o, ORIENTATION); putIfString(e, o, DEVICE_NAME);
        putIfInt(e, o, IDLE_SEC); putIfInt(e, o, DIM_SEC); putIfInt(e, o, BRIGHT_DAY);
        putIfInt(e, o, BRIGHT_NIGHT); putIfInt(e, o, NIGHT_FROM); putIfInt(e, o, NIGHT_TO);
        putIfInt(e, o, SENSITIVITY);
        putIfBool(e, o, MOTION); putIfBool(e, o, MOTION_DIM_ONLY); putIfBool(e, o, PROXIMITY);
        putIfBool(e, o, AUTO_BRIGHT); putIfBool(e, o, TRUE_SLEEP); putIfBool(e, o, BOOT);
        putIfBool(e, o, REPORT);
        JSONObject layout = o.optJSONObject(LAYOUT);
        if (layout != null) e.putString(LAYOUT, layout.toString());
        e.apply();
    }

    private static void putIfString(SharedPreferences.Editor e, JSONObject o, String k) {
        if (o.has(k)) e.putString(k, o.optString(k, ""));
    }
    private static void putIfInt(SharedPreferences.Editor e, JSONObject o, String k) {
        if (o.has(k)) e.putInt(k, o.optInt(k));
    }
    private static void putIfBool(SharedPreferences.Editor e, JSONObject o, String k) {
        if (o.has(k)) e.putBoolean(k, o.optBoolean(k));
    }
}
