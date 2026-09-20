package cz.promptlab.hapanel;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Po startu systemu (a po aktualizaci aplikace) znovu spusti panel.
 *
 * Android 10 a novejsi pusti spusteni obrazovky z pozadi jen aplikaci,
 * ktera smi kreslit pres ostatni aplikace. Pokud to opravneni uzivatel
 * nedal, system start tise zahodi - proto je v nastaveni popsane.
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        if (!new Config(ctx).bool(Config.BOOT, true)) return;

        Intent start = new Intent(ctx, MainActivity.class);
        start.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try {
            ctx.startActivity(start);
        } catch (Exception ignored) {
            // Nepovolene spusteni z pozadi - panel nabehne az klepnutim na ikonu.
        }
    }
}
