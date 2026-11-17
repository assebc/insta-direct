package expo.modules.instadirectnotifications

import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS bridge for the notification forwarder (Android only). */
class InstaDirectNotificationsModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private val prefs
    get() = context.getSharedPreferences("instadirect_notifications", Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("InstaDirectNotifications")

    /** Whether the user granted Notification access to our listener. */
    Function("hasNotificationAccess") {
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        ?: return@Function false
      val me = ComponentName(context, InstagramNotificationListener::class.java)
      enabled.split(':').any { ComponentName.unflattenFromString(it) == me }
    }

    Function("isInstagramInstalled") {
      Forwarder.INSTAGRAM_PACKAGES.any { isInstalled(it) }
    }

    /** Opens the Notification access screen, on our entry when the OS supports it. */
    Function("openNotificationAccessSettings") {
      val component = ComponentName(context, InstagramNotificationListener::class.java)
      val detail = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
          .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, component.flattenToString())
      } else {
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      }
      start(detail) || start(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }

    Function("clearForwarded") {
      Forwarder.clearAll(context)
    }

    Function("getSetupDismissedAt") {
      prefs.getLong("setupDismissedAt", 0L).toDouble()
    }

    Function("setSetupDismissedAt") { ms: Double ->
      prefs.edit().putLong("setupDismissedAt", ms.toLong()).apply()
    }
  }

  private fun start(intent: Intent): Boolean {
    val activity = appContext.currentActivity
    return try {
      if (activity != null) activity.startActivity(intent)
      else context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    } catch (e: ActivityNotFoundException) {
      false
    }
  }

  private fun isInstalled(pkg: String): Boolean = try {
    val pm = context.packageManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.getPackageInfo(pkg, PackageManager.PackageInfoFlags.of(0))
    } else {
      @Suppress("DEPRECATION")
      pm.getPackageInfo(pkg, 0)
    }
    true
  } catch (e: PackageManager.NameNotFoundException) {
    false
  }
}
