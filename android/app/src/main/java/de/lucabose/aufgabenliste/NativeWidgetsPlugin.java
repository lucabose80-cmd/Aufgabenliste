package de.lucabose.aufgabenliste;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeWidgets")
public class NativeWidgetsPlugin extends Plugin {

    @PluginMethod
    public void syncBooks(PluginCall call) {
        String booksJson = call.getString("booksJson", "[]");
        String selectedBookId = call.getString("selectedBookId", "");
        Context ctx = getContext();
        WidgetDataStore.saveBooks(ctx, booksJson, selectedBookId);
        ReadingTimerWidgetProvider.refreshAll(ctx);
        ReadingTimerService.syncNotification(ctx);
        call.resolve();
    }

    @PluginMethod
    public void syncTasks(PluginCall call) {
        String tasksJson = call.getString("tasksJson", "[]");
        Context ctx = getContext();
        WidgetDataStore.saveTasks(ctx, tasksJson);
        TasksCompactWidgetProvider.refreshAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void syncTimer(PluginCall call) {
        boolean running = call.getBoolean("running", false);
        int elapsedSeconds = call.getInt("elapsedSeconds", 0);
        String bookId = call.getString("bookId", null);
        Context ctx = getContext();
        WidgetDataStore.setTimerState(ctx, running, elapsedSeconds * 1000L, bookId);
        ReadingTimerWidgetProvider.refreshAll(ctx);
        ReadingTimerService.syncNotification(ctx);
        call.resolve();
    }

    @PluginMethod
    public void getPendingState(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("timerRunning", WidgetDataStore.isTimerRunning(ctx));
        ret.put("elapsedSeconds", (int) Math.round(WidgetDataStore.getCurrentElapsedMs(ctx) / 1000.0));
        ret.put("selectedBookId", WidgetDataStore.getSelectedBookId(ctx));
        ret.put("pendingFinish", WidgetDataStore.hasPendingFinish(ctx));
        ret.put("pendingFinishSeconds", WidgetDataStore.getPendingFinishSeconds(ctx));
        ret.put("pendingFinishBookId", WidgetDataStore.getPendingFinishBookId(ctx));
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingFinish(PluginCall call) {
        WidgetDataStore.clearPendingFinish(getContext());
        call.resolve();
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    1001
                );
            }
        }
        call.resolve();
    }
}
