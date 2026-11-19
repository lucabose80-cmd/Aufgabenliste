package de.lucabose.aufgabenliste;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

public class ReadingTimerWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_PREV_BOOK = "de.lucabose.aufgabenliste.WIDGET_PREV_BOOK";
    public static final String ACTION_NEXT_BOOK = "de.lucabose.aufgabenliste.WIDGET_NEXT_BOOK";
    public static final String ACTION_TOGGLE_TIMER = "de.lucabose.aufgabenliste.WIDGET_TOGGLE_TIMER";
    public static final String ACTION_FINISH_TIMER = "de.lucabose.aufgabenliste.WIDGET_FINISH_TIMER";

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, ReadingTimerWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids != null && ids.length > 0) {
            for (int id : ids) {
                updateAppWidget(context, manager, id);
            }
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        if (ACTION_PREV_BOOK.equals(action)) {
            if (!WidgetDataStore.isTimerRunning(context)) {
                WidgetDataStore.cycleSelectedBook(context, -1);
                refreshAll(context);
            }
        } else if (ACTION_NEXT_BOOK.equals(action)) {
            if (!WidgetDataStore.isTimerRunning(context)) {
                WidgetDataStore.cycleSelectedBook(context, 1);
                refreshAll(context);
            }
        } else if (ACTION_TOGGLE_TIMER.equals(action)) {
            WidgetDataStore.toggleTimer(context);
            refreshAll(context);
            ReadingTimerService.syncNotification(context);
        } else if (ACTION_FINISH_TIMER.equals(action)) {
            WidgetDataStore.finishTimerForSave(context);
            refreshAll(context);
            ReadingTimerService.syncNotification(context);

            Intent openApp = new Intent(context, MainActivity.class);
            openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openApp.putExtra("open_reading_save", true);
            context.startActivity(openApp);
        }
    }

    private static PendingIntent broadcastIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, ReadingTimerWidgetProvider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_reading_timer);

        String bookName = WidgetDataStore.getSelectedBookName(context);
        boolean running = WidgetDataStore.isTimerRunning(context);
        long elapsedMs = WidgetDataStore.getCurrentElapsedMs(context);

        views.setTextViewText(R.id.tv_book_name, bookName);

        if (running) {
            long baseRealtime = SystemClock.elapsedRealtime() - elapsedMs;
            views.setViewVisibility(R.id.chronometer_timer, View.VISIBLE);
            views.setViewVisibility(R.id.tv_paused_time, View.GONE);
            views.setChronometer(R.id.chronometer_timer, baseRealtime, null, true);
            views.setTextViewText(R.id.tv_timer_status, "Läuft");
            views.setTextColor(R.id.tv_timer_status, 0xFFA8C7FA);
            views.setTextViewText(R.id.btn_toggle_timer, "Pausieren");
            views.setViewVisibility(R.id.btn_finish_timer, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.chronometer_timer, View.GONE);
            views.setViewVisibility(R.id.tv_paused_time, View.VISIBLE);
            views.setChronometer(R.id.chronometer_timer, SystemClock.elapsedRealtime(), null, false);
            views.setTextViewText(R.id.tv_paused_time, WidgetDataStore.formatDuration(elapsedMs));

            if (elapsedMs > 0L) {
                views.setTextViewText(R.id.tv_timer_status, "Pausiert");
                views.setTextColor(R.id.tv_timer_status, 0xFFFDD663);
                views.setTextViewText(R.id.btn_toggle_timer, "Fortsetzen");
                views.setViewVisibility(R.id.btn_finish_timer, View.VISIBLE);
            } else {
                views.setTextViewText(R.id.tv_timer_status, "Bereit");
                views.setTextColor(R.id.tv_timer_status, 0xFF9AA0A6);
                views.setTextViewText(R.id.btn_toggle_timer, "Starten");
                views.setViewVisibility(R.id.btn_finish_timer, View.GONE);
            }
        }

        // Open app when tapping book title
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
            context, 200, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.tv_book_name, openPending);

        views.setOnClickPendingIntent(R.id.btn_prev_book, broadcastIntent(context, ACTION_PREV_BOOK, 201));
        views.setOnClickPendingIntent(R.id.btn_next_book, broadcastIntent(context, ACTION_NEXT_BOOK, 202));
        views.setOnClickPendingIntent(R.id.btn_toggle_timer, broadcastIntent(context, ACTION_TOGGLE_TIMER, 203));
        views.setOnClickPendingIntent(R.id.btn_finish_timer, broadcastIntent(context, ACTION_FINISH_TIMER, 204));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
