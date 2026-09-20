package cz.promptlab.hapanel;

import android.app.admin.DeviceAdminReceiver;

/**
 * Prazdny prijemce spravy zarizeni. Existuje jen proto, aby system mel co
 * povolit - jedina vyuzita pravomoc je "zhasnout displej" (force-lock).
 */
public class AdminReceiver extends DeviceAdminReceiver {
}
