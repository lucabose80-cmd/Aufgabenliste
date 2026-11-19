import { Capacitor, registerPlugin } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const NativeWidgets = registerPlugin('NativeWidgets');
const OTA_MANIFEST_URL = 'https://aufgabenliste-beta.vercel.app/ota-manifest.json';
const OTA_VERSION_STORAGE_KEY = 'aufgabenliste_ota_version';

export const isNativeAndroid = () => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
};

export const syncNativeBooks = async (books, selectedBookId = '') => {
  if (!isNativeAndroid()) return;
  try {
    const activeBooks = (books || [])
      .filter((b) => !b.completed)
      .map((b) => ({
        id: b.id,
        name: b.name || 'Buch',
        author: b.author || '',
      }));
    await NativeWidgets.syncBooks({
      booksJson: JSON.stringify(activeBooks),
      selectedBookId: selectedBookId || '',
    });
  } catch (e) {
    console.warn('syncNativeBooks failed:', e);
  }
};

export const syncNativeTasks = async (tasks) => {
  if (!isNativeAndroid()) return;
  try {
    const compact = (tasks || []).slice(0, 12).map((t) => ({
      id: t.id,
      title: t.title || '',
      color: t.categoryColor || '#A8C7FA',
    }));
    await NativeWidgets.syncTasks({
      tasksJson: JSON.stringify(compact),
    });
  } catch (e) {
    console.warn('syncNativeTasks failed:', e);
  }
};

export const syncNativeTimer = async (running, elapsedSeconds, bookId = null) => {
  if (!isNativeAndroid()) return;
  try {
    await NativeWidgets.syncTimer({
      running: !!running,
      elapsedSeconds: Math.max(0, Math.round(elapsedSeconds || 0)),
      bookId: bookId !== undefined ? bookId : null,
    });
  } catch (e) {
    console.warn('syncNativeTimer failed:', e);
  }
};

export const getNativePendingState = async () => {
  if (!isNativeAndroid()) return null;
  try {
    return await NativeWidgets.getPendingState();
  } catch (e) {
    console.warn('getNativePendingState failed:', e);
    return null;
  }
};

export const clearNativePendingFinish = async () => {
  if (!isNativeAndroid()) return;
  try {
    await NativeWidgets.clearPendingFinish();
  } catch (e) {
    console.warn('clearNativePendingFinish failed:', e);
  }
};

export const requestNativeNotificationPermission = async () => {
  if (!isNativeAndroid()) return;
  try {
    await NativeWidgets.requestNotificationPermission();
  } catch (e) {
    console.warn('requestNativeNotificationPermission failed:', e);
  }
};

export const initOfflineFirstOtaUpdater = async (onUpdateDownloaded) => {
  if (!isNativeAndroid()) return;
  try {
    // Always tell CapacitorUpdater the current bundle booted cleanly
    await CapacitorUpdater.notifyAppReady();

    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const res = await fetch(`${OTA_MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const manifest = await res.json();
    if (!manifest?.version || !manifest?.url) return;

    const currentVersion = localStorage.getItem(OTA_VERSION_STORAGE_KEY);
    if (currentVersion === manifest.version) return;

    const bundle = await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
    });

    if (bundle?.id) {
      localStorage.setItem(OTA_VERSION_STORAGE_KEY, manifest.version);
      if (typeof onUpdateDownloaded === 'function') {
        onUpdateDownloaded(async () => {
          await CapacitorUpdater.set(bundle);
        });
      } else {
        await CapacitorUpdater.next(bundle);
      }
    }
  } catch (e) {
    console.warn('OTA update check skipped:', e);
  }
};
