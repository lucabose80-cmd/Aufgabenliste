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

export const checkOtaUpdate = async () => {
  if (!isNativeAndroid()) {
    return { status: 'web', message: 'Nur in der Android-App verfügbar' };
  }
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { status: 'offline', message: 'Keine Internetverbindung' };
    }

    const res = await fetch(`${OTA_MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      return { status: 'error', message: `Manifest nicht erreichbar (HTTP ${res.status})` };
    }
    const manifest = await res.json();
    if (!manifest?.version || !manifest?.url) {
      return { status: 'error', message: 'Ungültiges Update-Manifest' };
    }

    const currentVersion = localStorage.getItem(OTA_VERSION_STORAGE_KEY);
    if (currentVersion === manifest.version) {
      return { status: 'up-to-date', version: manifest.version, message: 'App ist auf dem neuesten Stand' };
    }

    const bundle = await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
    });

    if (bundle?.id) {
      // Queue for next restart automatically so even dismissing the banner applies it
      await CapacitorUpdater.next({ id: bundle.id });
      localStorage.setItem(OTA_VERSION_STORAGE_KEY, manifest.version);
      return {
        status: 'ready',
        version: manifest.version,
        message: 'Update heruntergeladen und bereit',
        applyNow: async () => {
          await CapacitorUpdater.set({ id: bundle.id });
        },
      };
    }

    return { status: 'error', message: 'Bundle konnte nicht gespeichert werden' };
  } catch (e) {
    console.warn('OTA update check failed:', e);
    return { status: 'error', message: e?.message || 'Update-Prüfung fehlgeschlagen' };
  }
};

export const initOfflineFirstOtaUpdater = async (onUpdateDownloaded) => {
  if (!isNativeAndroid()) return;
  try {
    await CapacitorUpdater.notifyAppReady();
    const result = await checkOtaUpdate();
    if (result.status === 'ready' && typeof onUpdateDownloaded === 'function') {
      onUpdateDownloaded(result.applyNow);
    }
  } catch (e) {
    console.warn('OTA init skipped:', e);
  }
};
