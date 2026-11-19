package de.lucabose.aufgabenliste;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class ReadingTimerService extends Service {
    public static final String CHANNEL_ID = "reading_timer_channel";
    public static final int NOTIFICATION_ID = 4201;

    public static final String ACTION_UPDATE = "de.lucabose.aufgabenliste.ACTION_TIMER_UPDATE";
    public static final String ACTION_TOGGLE = "de.lucabose.aufgabenliste.ACTION_TIMER_TOGGLE";
    public static final String ACTION_FINISH = "de.lucabose.aufgabenliste.ACTION_TIMER_FINISH";
    public static final String ACTION_STOP_SERVICE = "de.lucabose.aufgabenliste.ACTION_TIMER_STOP_SERVICE";

    public static void syncNotification(Context ctx) {
        boolean running = WidgetDataStore.isTimerRunning(ctx);
        long elapsed = WidgetDataStore.getCurrentElapsedMs(ctx);

        if (!running && elapsed <= 0L) {
            Intent stopIntent = new Intent(ctx, ReadingTimerService.class);
            stopIntent.setAction(ACTION_STOP_SERVICE);
            try {
                ctx.stopService(stopIntent);
            } catch (Exception ignored) {}
            return;
        }

        Intent intent = new Intent(ctx, ReadingTimerService.class);
        intent.setAction(ACTION_UPDATE);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent);
            } else {
                ctx.startService(intent);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_UPDATE;

        if (ACTION_STOP_SERVICE.equals(action)) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_TOGGLE.equals(action)) {
            WidgetDataStore.toggleTimer(this);
            ReadingTimerWidgetProvider.refreshAll(this);
        } else if (ACTION_FINISH.equals(action)) {
            WidgetDataStore.finishTimerForSave(this);
            ReadingTimerWidgetProvider.refreshAll(this);
            stopForeground(true);
            stopSelf();

            Intent openApp = new Intent(this, MainActivity.class);
            openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openApp.putExtra("open_reading_save", true);
            startActivity(openApp);
            return START_NOT_STICKY;
        }

        boolean running = WidgetDataStore.isTimerRunning(this);
        long elapsed = WidgetDataStore.getCurrentElapsedMs(this);
        if (!running && elapsed <= 0L) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification notification = buildNotification(running, elapsed);
        startForeground(NOTIFICATION_ID, notification);
        return START_STICKY;
    }

    private Notification buildNotification(boolean running, long elapsedMs) {
        String bookName = WidgetDataStore.getSelectedBookName(this);

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
            this, 10, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent toggleIntent = new Intent(this, ReadingTimerService.class);
        toggleIntent.setAction(ACTION_TOGGLE);
        PendingIntent togglePending = PendingIntent.getService(
            this, 11, toggleIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent finishIntent = new Intent(this, ReadingTimerService.class);
        finishIntent.setAction(ACTION_FINISH);
        PendingIntent finishPending = PendingIntent.getService(
            this, 12, finishIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_book)
            .setContentTitle(bookName)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(openPending)
            .addAction(0, running ? "Pausieren" : "Fortsetzen", togglePending)
            .addAction(0, "Beenden", finishPending);

        if (running) {
            builder
                .setContentText("Lese-Session läuft")
                .setUsesChronometer(true)
                .setShowWhen(true)
                .setWhen(System.currentTimeMillis() - elapsedMs);
        } else {
            builder
                .setContentText("Pausiert · " + WidgetDataStore.formatDuration(elapsedMs))
                .setUsesChronometer(false)
                .setShowWhen(false);
        }

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Lese-Timer",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Zeigt den aktiven Lese-Timer auf dem Sperrbildschirm und in der Statusleiste");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
