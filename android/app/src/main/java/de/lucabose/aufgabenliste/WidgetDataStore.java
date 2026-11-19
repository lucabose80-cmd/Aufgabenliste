package de.lucabose.aufgabenliste;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

public class WidgetDataStore {
    private static final String PREFS = "aufgabenliste_widget_prefs";
    private static final String KEY_BOOKS = "books_json";
    private static final String KEY_SELECTED_BOOK_ID = "selected_book_id";
    private static final String KEY_TASKS = "tasks_json";
    private static final String KEY_TIMER_RUNNING = "timer_running";
    private static final String KEY_TIMER_BASE_MS = "timer_base_ms";
    private static final String KEY_TIMER_START_EPOCH_MS = "timer_start_epoch_ms";
    private static final String KEY_PENDING_FINISH = "pending_finish";
    private static final String KEY_PENDING_FINISH_SECONDS = "pending_finish_seconds";
    private static final String KEY_PENDING_FINISH_BOOK_ID = "pending_finish_book_id";

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void saveBooks(Context ctx, String booksJson, String selectedBookId) {
        SharedPreferences.Editor ed = prefs(ctx).edit();
        ed.putString(KEY_BOOKS, booksJson != null ? booksJson : "[]");
        if (selectedBookId != null && !selectedBookId.isEmpty()) {
            ed.putString(KEY_SELECTED_BOOK_ID, selectedBookId);
        }
        ed.apply();
    }

    public static JSONArray getBooks(Context ctx) {
        String raw = prefs(ctx).getString(KEY_BOOKS, "[]");
        try {
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static String getSelectedBookId(Context ctx) {
        return prefs(ctx).getString(KEY_SELECTED_BOOK_ID, "");
    }

    public static void setSelectedBookId(Context ctx, String bookId) {
        prefs(ctx).edit().putString(KEY_SELECTED_BOOK_ID, bookId != null ? bookId : "").apply();
    }

    public static String getSelectedBookName(Context ctx) {
        JSONArray books = getBooks(ctx);
        String selectedId = getSelectedBookId(ctx);
        if (books.length() == 0) return "Kein aktives Buch";
        if (selectedId != null && !selectedId.isEmpty()) {
            for (int i = 0; i < books.length(); i++) {
                JSONObject b = books.optJSONObject(i);
                if (b != null && selectedId.equals(b.optString("id"))) {
                    return b.optString("name", "Buch");
                }
            }
        }
        JSONObject first = books.optJSONObject(0);
        if (first != null) {
            setSelectedBookId(ctx, first.optString("id", ""));
            return first.optString("name", "Buch");
        }
        return "Kein aktives Buch";
    }

    public static void cycleSelectedBook(Context ctx, int direction) {
        JSONArray books = getBooks(ctx);
        if (books.length() == 0) return;
        String currentId = getSelectedBookId(ctx);
        int currentIdx = 0;
        for (int i = 0; i < books.length(); i++) {
            JSONObject b = books.optJSONObject(i);
            if (b != null && currentId.equals(b.optString("id"))) {
                currentIdx = i;
                break;
            }
        }
        int nextIdx = (currentIdx + direction + books.length()) % books.length();
        JSONObject next = books.optJSONObject(nextIdx);
        if (next != null) {
            setSelectedBookId(ctx, next.optString("id", ""));
        }
    }

    public static void saveTasks(Context ctx, String tasksJson) {
        prefs(ctx).edit().putString(KEY_TASKS, tasksJson != null ? tasksJson : "[]").apply();
    }

    public static JSONArray getTasks(Context ctx) {
        String raw = prefs(ctx).getString(KEY_TASKS, "[]");
        try {
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static boolean isTimerRunning(Context ctx) {
        return prefs(ctx).getBoolean(KEY_TIMER_RUNNING, false);
    }

    public static long getCurrentElapsedMs(Context ctx) {
        SharedPreferences p = prefs(ctx);
        long base = p.getLong(KEY_TIMER_BASE_MS, 0L);
        if (p.getBoolean(KEY_TIMER_RUNNING, false)) {
            long start = p.getLong(KEY_TIMER_START_EPOCH_MS, System.currentTimeMillis());
            long diff = Math.max(0L, System.currentTimeMillis() - start);
            return base + diff;
        }
        return base;
    }

    public static void setTimerState(Context ctx, boolean running, long elapsedMs, String bookId) {
        SharedPreferences.Editor ed = prefs(ctx).edit();
        ed.putBoolean(KEY_TIMER_RUNNING, running);
        ed.putLong(KEY_TIMER_BASE_MS, Math.max(0L, elapsedMs));
        ed.putLong(KEY_TIMER_START_EPOCH_MS, System.currentTimeMillis());
        if (bookId != null) {
            ed.putString(KEY_SELECTED_BOOK_ID, bookId);
        }
        ed.apply();
    }

    public static void toggleTimer(Context ctx) {
        boolean running = isTimerRunning(ctx);
        long elapsed = getCurrentElapsedMs(ctx);
        setTimerState(ctx, !running, elapsed, null);
    }

    public static void finishTimerForSave(Context ctx) {
        long elapsedMs = getCurrentElapsedMs(ctx);
        int elapsedSec = Math.max(1, (int) Math.round(elapsedMs / 1000.0));
        String bookId = getSelectedBookId(ctx);
        prefs(ctx).edit()
            .putBoolean(KEY_TIMER_RUNNING, false)
            .putLong(KEY_TIMER_BASE_MS, 0L)
            .putBoolean(KEY_PENDING_FINISH, true)
            .putInt(KEY_PENDING_FINISH_SECONDS, elapsedSec)
            .putString(KEY_PENDING_FINISH_BOOK_ID, bookId != null ? bookId : "")
            .apply();
    }

    public static boolean hasPendingFinish(Context ctx) {
        return prefs(ctx).getBoolean(KEY_PENDING_FINISH, false);
    }

    public static int getPendingFinishSeconds(Context ctx) {
        return prefs(ctx).getInt(KEY_PENDING_FINISH_SECONDS, 0);
    }

    public static String getPendingFinishBookId(Context ctx) {
        return prefs(ctx).getString(KEY_PENDING_FINISH_BOOK_ID, "");
    }

    public static void clearPendingFinish(Context ctx) {
        prefs(ctx).edit()
            .putBoolean(KEY_PENDING_FINISH, false)
            .putInt(KEY_PENDING_FINISH_SECONDS, 0)
            .putString(KEY_PENDING_FINISH_BOOK_ID, "")
            .apply();
    }

    public static String formatDuration(long elapsedMs) {
        long totalSeconds = Math.max(0L, elapsedMs / 1000L);
        long h = totalSeconds / 3600L;
        long m = (totalSeconds % 3600L) / 60L;
        long s = totalSeconds % 60L;
        if (h > 0) {
            return String.format("%02d:%02d:%02d", h, m, s);
        }
        return String.format("%02d:%02d", m, s);
    }
}
