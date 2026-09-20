package cz.promptlab.hapanel;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.view.View;
import android.view.WindowManager;

/**
 * Vsechno kolem sviceni displeje na jednom miste.
 *
 * Android obycejne aplikaci nedovoli displej zhasnout. Jsou tedy dve
 * cesty a panel umi obe:
 *
 *   1) UTLUM (vychozi, funguje vzdy a bez opravneni) - jas okna sjede na
 *      nulu a pres obsah lehne cerna plocha. Displej sice technicky sviti,
 *      ale na OLED panelu je cerna nerozeznatelna od zhasnuteho a system
 *      po svem casovem limitu stejne zhasne uplne.
 *   2) OPRAVDOVE ZHASNUTI (volitelne) - pres spravce zarizeni zavolame
 *      lockNow(). Displej zhasne okamzite, probuzeni resi budici zamek.
 *
 * Probuzeni: aktivita ma setTurnScreenOn() a kratky budici zamek, takze
 * displej rozsviti i ze zamcene obrazovky, aniz by uzivatel cokoli zmackl.
 */
public final class ScreenManager {

    private final Activity act;
    private final View cover;             // cerna plocha pres panel
    private PowerManager.WakeLock wake;
    private boolean dimmed;

    public ScreenManager(Activity act, View cover) {
        this.act = act;
        this.cover = cover;
    }

    public boolean dimmed() { return dimmed; }

    /** Jas okna v procentech (0-100); -1 znamena "nech na systemu". */
    public void setBrightness(int percent) {
        WindowManager.LayoutParams lp = act.getWindow().getAttributes();
        lp.screenBrightness = percent < 0
                ? WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                : Math.max(0.01f, Math.min(1f, percent / 100f));
        act.getWindow().setAttributes(lp);
    }

    /** Utlum do cerna (nebo opravdove zhasnuti, pokud je povolene). */
    public void sleep(boolean deep) {
        dimmed = true;
        if (cover != null) cover.setVisibility(View.VISIBLE);
        WindowManager.LayoutParams lp = act.getWindow().getAttributes();
        lp.screenBrightness = 0.004f;
        act.getWindow().setAttributes(lp);
        act.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (deep && adminActive()) {
            DevicePolicyManager dpm = dpm();
            try { if (dpm != null) dpm.lockNow(); } catch (SecurityException ignored) { }
        }
    }

    /** Probuzeni: rozsvitit, odemknout, vratit jas. */
    public void wake(int brightnessPercent) {
        dimmed = false;
        if (cover != null) cover.setVisibility(View.GONE);
        act.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setBrightness(brightnessPercent);

        if (Build.VERSION.SDK_INT >= 27) {
            act.setTurnScreenOn(true);
            act.setShowWhenLocked(true);
            KeyguardManager km = (KeyguardManager) act.getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                try { km.requestDismissKeyguard(act, null); } catch (Exception ignored) { }
            }
        } else {
            act.getWindow().addFlags(
                  WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        pulseWakeLock();
    }

    /**
     * Po opravdovem zhasnuti uz samotny priznak okna nestaci - displej
     * rozsviti az budici zamek. Drzi se jen chvili, pak se pousti.
     */
    @SuppressWarnings("deprecation")
    private void pulseWakeLock() {
        try {
            PowerManager pm = (PowerManager) act.getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            if (wake != null && wake.isHeld()) { try { wake.release(); } catch (Exception ignored) { } }
            wake = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "hapanel:wake");
            wake.acquire(3000);
        } catch (Exception ignored) { }
    }

    public void release() {
        if (wake != null && wake.isHeld()) { try { wake.release(); } catch (Exception ignored) { } }
        wake = null;
    }

    /* ---------- spravce zarizeni ---------- */

    private DevicePolicyManager dpm() {
        return (DevicePolicyManager) act.getSystemService(Context.DEVICE_POLICY_SERVICE);
    }

    public boolean adminActive() {
        DevicePolicyManager d = dpm();
        return d != null && d.isAdminActive(new ComponentName(act, AdminReceiver.class));
    }

    /** Otevre systemovou obrazovku, kde uzivatel spravce zarizeni povoli. */
    public static Intent adminIntent(Context ctx) {
        Intent i = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        i.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, new ComponentName(ctx, AdminReceiver.class));
        i.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Povolením smí panel zhasnout displej, když před tabletem nikdo není. "
              + "Žádné jiné oprávnění správce zařízení aplikace nepoužívá.");
        return i;
    }
}
