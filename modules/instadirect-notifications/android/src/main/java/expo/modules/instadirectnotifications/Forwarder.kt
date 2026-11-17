package expo.modules.instadirectnotifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.service.notification.StatusBarNotification

/** Turns an Instagram message notification into an InstaDirect one. */
object Forwarder {
  const val TAG = "instadirect"
  private const val CHANNEL_ID = "instadirect_messages"
  private const val GROUP = "instadirect_messages"
  private const val INBOX_URI = "instadirect://direct/inbox"

  val INSTAGRAM_PACKAGES = setOf("com.instagram.android", "com.instagram.lite")

  /** Instagram's DM channels have had names like "ig_direct" / "direct_v2_*"; matched loosely. */
  private val MESSAGE_CHANNEL = Regex("direct|message|\\bdm\\b|thread|chat", RegexOption.IGNORE_CASE)

  fun isMessage(n: Notification): Boolean {
    if (n.category == Notification.CATEGORY_MESSAGE) return true
    val extras = n.extras ?: return false
    if (extras.containsKey(Notification.EXTRA_MESSAGES)) return true
    if (extras.getString(Notification.EXTRA_TEMPLATE)?.contains("MessagingStyle") == true) return true
    val channel = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) n.channelId.orEmpty() else ""
    return MESSAGE_CHANNEL.containsMatchIn(channel)
  }

  fun forward(context: Context, sbn: StatusBarNotification) {
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    if (!nm.areNotificationsEnabled()) return
    ensureChannel(context, nm)

    val src = sbn.notification
    val extras = src.extras ?: Bundle()
    val title: CharSequence = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)
      ?: extras.getCharSequence(Notification.EXTRA_TITLE)
      ?: "Instagram"
    val lines = messageLines(extras, title)
    val text: CharSequence = lines.lastOrNull()
      ?: extras.getCharSequence(Notification.EXTRA_TEXT)
      ?: "New message"
    val id = sbn.key.hashCode()

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context).setPriority(Notification.PRIORITY_HIGH)
    }
    builder
      .setSmallIcon(R.drawable.instadirect_notification)
      .setContentTitle(title)
      .setContentText(text)
      .setWhen(src.`when`)
      .setShowWhen(true)
      .setCategory(Notification.CATEGORY_MESSAGE)
      .setAutoCancel(true)
      .setGroup(GROUP)
      .setContentIntent(openInbox(context, id))

    if (lines.size > 1) {
      val style = Notification.InboxStyle().setBigContentTitle(title)
      lines.takeLast(6).forEach { style.addLine(it) }
      builder.setStyle(style)
    } else {
      builder.setStyle(Notification.BigTextStyle().bigText(text))
    }

    // The sender's profile picture.
    src.getLargeIcon()?.let { builder.setLargeIcon(it) }

    // Keep Instagram's inline "Reply" so you can answer from the shade. It is
    // handled by Instagram in the background; nothing opens.
    src.actions
      ?.filter { !it.remoteInputs.isNullOrEmpty() }
      ?.forEach { builder.addAction(it) }

    nm.notify(TAG, id, builder.build())
  }

  /** Removes every forwarded notification (called when InstaDirect is opened). */
  fun clearAll(context: Context) {
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    nm.activeNotifications.filter { it.tag == TAG }.forEach { nm.cancel(TAG, it.id) }
  }

  /** "Sender: text" lines from a MessagingStyle notification; sender omitted in 1:1 chats. */
  private fun messageLines(extras: Bundle, title: CharSequence): List<CharSequence> {
    @Suppress("DEPRECATION")
    val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES) ?: return emptyList()
    return messages.mapNotNull { item ->
      val bundle = item as? Bundle ?: return@mapNotNull null
      val body = bundle.getCharSequence("text") ?: return@mapNotNull null
      val sender = bundle.getCharSequence("sender")
      if (sender.isNullOrBlank() || sender.toString() == title.toString()) body else "$sender: $body"
    }
  }

  private fun ensureChannel(context: Context, nm: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Messages", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Instagram messages, shown by InstaDirect"
    }
    nm.createNotificationChannel(channel)
  }

  private fun openInbox(context: Context, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(INBOX_URI))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
