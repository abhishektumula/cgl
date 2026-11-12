package expo.modules.focusnotification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class LiveTimerOptions : Record {
  @Field val title: String = ""
  @Field val body: String = ""
  /** Epoch ms when the countdown reaches zero. Ignored while paused. */
  @Field val endAt: Double = 0.0
  @Field val remainingMs: Double = 0.0
  @Field val totalMs: Double = 0.0
  @Field val paused: Boolean = false
  @Field val color: String = "#E68AAE"
  @Field val url: String? = null
}

/**
 * Shows an ongoing notification whose time counts down by itself (Android Chronometer),
 * so it keeps ticking in the shade and on the lock screen while the JS runtime is asleep.
 */
class FocusNotificationModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FocusNotification")

    AsyncFunction("show") { options: LiveTimerOptions ->
      show(options)
    }

    AsyncFunction("hide") {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }
  }

  private fun canPost(): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return false
    }
    return NotificationManagerCompat.from(context).areNotificationsEnabled()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Running timer", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Live countdown while a focus or break timer is running"
      setShowBadge(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      setSound(null, null)
      enableVibration(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun contentIntent(url: String?): PendingIntent? {
    val intent = if (url != null) {
      Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(context.packageName)
    } else {
      context.packageManager.getLaunchIntentForPackage(context.packageName)
    } ?: return null
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context, NOTIFICATION_ID, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun show(o: LiveTimerOptions): Boolean {
    if (!canPost()) return false
    ensureChannel()

    val now = System.currentTimeMillis()
    val remaining = if (o.paused) o.remainingMs.toLong() else (o.endAt.toLong() - now).coerceAtLeast(0L)
    if (!o.paused && remaining <= 0) {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
      return false
    }
    val totalSec = (o.totalMs / 1000).toInt().coerceAtLeast(1)
    val doneSec = (totalSec - (remaining / 1000).toInt()).coerceIn(0, totalSec)
    val accent = try { Color.parseColor(o.color) } catch (e: IllegalArgumentException) { Color.MAGENTA }

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.focus_notification_icon)
      .setContentTitle(o.title)
      .setContentText(o.body)
      .setColor(accent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setAutoCancel(false)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setProgress(totalSec, doneSec, false)
      .setContentIntent(contentIntent(o.url))

    if (o.paused) {
      builder.setShowWhen(false).setUsesChronometer(false)
    } else {
      builder
        .setShowWhen(true)
        .setWhen(o.endAt.toLong())
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
        // a countdown chronometer would keep going below zero – remove it when the time is up
        .setTimeoutAfter(remaining + 1000)
    }

    return try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
      true
    } catch (e: SecurityException) {
      false
    }
  }

  companion object {
    private const val CHANNEL_ID = "focus_live_timer"
    private const val NOTIFICATION_ID = 4207
  }
}
