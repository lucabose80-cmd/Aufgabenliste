package de.lucabose.aufgabenliste;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class TasksCompactWidgetProvider extends AppWidgetProvider {

    private static final int[] ROW_IDS = {
        R.id.row_task_0, R.id.row_task_1, R.id.row_task_2,
        R.id.row_task_3, R.id.row_task_4, R.id.row_task_5
    };
    private static final int[] DOT_IDS = {
        R.id.dot_task_0, R.id.dot_task_1, R.id.dot_task_2,
        R.id.dot_task_3, R.id.dot_task_4, R.id.dot_task_5
    };
    private static final int[] TEXT_IDS = {
        R.id.tv_task_0, R.id.tv_task_1, R.id.tv_task_2,
        R.id.tv_task_3, R.id.tv_task_4, R.id.tv_task_5
    };

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, TasksCompactWidgetProvider.class);
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

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks_compact);

        JSONArray tasks = WidgetDataStore.getTasks(context);
        int total = tasks.length();

        views.setTextViewText(R.id.tv_tasks_count, total == 0 ? "0 offen" : total + " offen");

        if (total == 0) {
            views.setViewVisibility(R.id.tv_tasks_empty, View.VISIBLE);
            views.setViewVisibility(R.id.tv_tasks_more, View.GONE);
            for (int i = 0; i < ROW_IDS.length; i++) {
                views.setViewVisibility(ROW_IDS[i], View.GONE);
            }
        } else {
            views.setViewVisibility(R.id.tv_tasks_empty, View.GONE);
            int maxRows = ROW_IDS.length;
            for (int i = 0; i < maxRows; i++) {
                if (i < total) {
                    JSONObject item = tasks.optJSONObject(i);
                    String title = item != null ? item.optString("title", "") : "";
                    String colorStr = item != null ? item.optString("color", "#A8C7FA") : "#A8C7FA";

                    views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
                    views.setTextViewText(TEXT_IDS[i], title);
                    try {
                        int parsedColor = Color.parseColor(colorStr);
                        views.setInt(DOT_IDS[i], "setColorFilter", parsedColor);
                    } catch (Exception e) {
                        views.setInt(DOT_IDS[i], "setColorFilter", 0xFFA8C7FA);
                    }
                } else {
                    views.setViewVisibility(ROW_IDS[i], View.GONE);
                }
            }

            if (total > maxRows) {
                views.setViewVisibility(R.id.tv_tasks_more, View.VISIBLE);
                views.setTextViewText(R.id.tv_tasks_more, "+" + (total - maxRows) + " weitere");
            } else {
                views.setViewVisibility(R.id.tv_tasks_more, View.GONE);
            }
        }

        // Open app when tapping the widget
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
            context, 300, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_tasks_root, openPending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
