package cz.promptlab.hapanel;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Maly klient REST rozhrani Home Assistantu. Stranka si zive stavy tahá
 * sama pres WebSocket; tady zustava jen to, co WebView neumi:
 *
 *   - overeni adresy a tokenu v nastaveni (GET /api/),
 *   - hlaseni stavu tabletu zpet do Home Assistantu (POST /api/states/...).
 *
 * Proc nativne a ne ze stranky: zapis stavu je jiny puvod nez file://
 * adresa stranky, takze by ho prohlizec zastavil na kontrole CORS.
 * HttpURLConnection zadne CORS nezna.
 */
public final class HaClient {

    public interface Result {
        void done(boolean ok, String message);
    }

    private static final ExecutorService POOL = Executors.newSingleThreadExecutor();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private final String base;
    private final String token;

    public HaClient(String baseUrl, String token) {
        this.base = Config.normalizeUrl(baseUrl);
        this.token = token == null ? "" : token.trim();
    }

    public boolean usable() { return !base.isEmpty() && !token.isEmpty(); }

    /** Overi, ze adresa odpovida a token plati. */
    public void ping(final Result cb) {
        POOL.execute(new Runnable() {
            @Override public void run() {
                String msg;
                boolean ok = false;
                try {
                    HttpURLConnection c = open("/api/", "GET");
                    int code = c.getResponseCode();
                    if (code == 200) {
                        ok = true;
                        msg = "Spojení v pořádku.";
                    } else if (code == 401 || code == 403) {
                        msg = "Token neplatí (" + code + "). Vytvoř nový v profilu Home Assistantu.";
                    } else {
                        msg = "Server odpověděl " + code + ".";
                    }
                    c.disconnect();
                } catch (Exception e) {
                    msg = "Nedosažitelné: " + e.getClass().getSimpleName()
                        + (e.getMessage() == null ? "" : " – " + e.getMessage());
                }
                post(cb, ok, msg);
            }
        });
    }

    /**
     * Zapise stav jednoho cidla. Takhle vznikne v Home Assistantu entita,
     * kterou jde pouzit v automatizacich (napr. "pohyb u panelu" -> rozsvit).
     */
    public void setState(final String entityId, final String state, final JSONObject attributes) {
        if (!usable()) return;
        POOL.execute(new Runnable() {
            @Override public void run() {
                try {
                    JSONObject body = new JSONObject();
                    body.put("state", state);
                    if (attributes != null) body.put("attributes", attributes);
                    HttpURLConnection c = open("/api/states/" + entityId, "POST");
                    c.setDoOutput(true);
                    c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    OutputStream os = c.getOutputStream();
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    os.close();
                    c.getResponseCode();      // odpoved nas nezajima, jen ji musime precist
                    drain(c);
                    c.disconnect();
                } catch (Exception ignored) {
                    // Vypadek site neni duvod cokoli hlasit - zapise se priste.
                }
            }
        });
    }

    private HttpURLConnection open(String path, String method) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(base + path).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(6000);
        c.setReadTimeout(8000);
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Accept", "application/json");
        return c;
    }

    private static void drain(HttpURLConnection c) {
        try {
            InputStream in = c.getResponseCode() >= 400 ? c.getErrorStream() : c.getInputStream();
            if (in == null) return;
            BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            while (r.readLine() != null) { /* zahodit */ }
            r.close();
        } catch (Exception ignored) { }
    }

    private static void post(final Result cb, final boolean ok, final String msg) {
        if (cb == null) return;
        MAIN.post(new Runnable() {
            @Override public void run() { cb.done(ok, msg); }
        });
    }
}
