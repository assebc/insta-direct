package expo.modules.instadirectnotifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Watches notifications from the official Instagram app (installed, never
 * opened). Message notifications are re-posted as InstaDirect notifications
 * that open InstaDirect, and Instagram's own copy is removed so tapping can
 * never land in the real app. Everything else from Instagram is left alone;
 * turn those off in Instagram's notification settings.
 */
class InstagramNotificationListener : NotificationListenerService() {

  override fun onListenerConnected() {
    // Pick up messages that arrived while the listener wasn't bound.
    try {
      activeNotifications?.forEach { handle(it) }
    } catch (e: SecurityException) {
      Log.w(TAG, "Listener connected without access", e)
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    handle(sbn)
  }

  private fun handle(sbn: StatusBarNotification) {
    if (sbn.packageName !in Forwarder.INSTAGRAM_PACKAGES) return
    val n = sbn.notification ?: return
    if (!Forwarder.isMessage(n)) return

    try {
      // A group summary carries no message of its own: just remove it.
      if (n.flags and Notification.FLAG_GROUP_SUMMARY == 0) Forwarder.forward(this, sbn)
      cancelNotification(sbn.key)
    } catch (e: Exception) {
      // Never crash the listener; worst case Instagram's own notification stays.
      Log.w(TAG, "Couldn't forward Instagram notification", e)
    }
  }

  private companion object {
    const val TAG = "InstaDirect"
  }
}
