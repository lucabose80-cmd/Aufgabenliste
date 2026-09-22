import React, { useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format } from 'date-fns';

const NotificationManager = () => {
  const { tasks, getTodayDateString } = useTaskContext();

  useEffect(() => {
    // 1. Berechtigung anfragen, falls noch nicht passiert
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // 2. Intervall-Check jede Minute
    const checkInterval = setInterval(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const now = new Date();
        const hours = now.getHours();
        const todayStr = getTodayDateString();

        // Stündlich zwischen 20 und 24 Uhr (20, 21, 22, 23)
        if (hours >= 20 && hours < 24) {
          const notificationKey = `${todayStr}-${hours}`;
          const lastNotified = localStorage.getItem('lastNotificationDate');
          
          if (lastNotified !== notificationKey) {
            
            // Check ob noch Aufgaben offen sind (nur tägliche Routinen)
            const incompleteRoutines = tasks.filter(t => {
              if (t.type !== 'daily') return false;
              if (t.completedDates.includes(todayStr)) return false;
              return true;
            });

            if (incompleteRoutines.length > 0) {
              // Benachrichtigung senden
              new Notification("TaskMaster", {
                body: "Erinnerung: Du hast heute noch offene Routinen!",
                icon: "/vite.svg" // oder ein passendes Icon
              });

              // Speichern, dass wir in dieser Stunde benachrichtigt haben
              localStorage.setItem('lastNotificationDate', notificationKey);
            } else {
              // Alles erledigt, wir speichern auch, dass wir in dieser Stunde nicht mehr prüfen müssen
              localStorage.setItem('lastNotificationDate', notificationKey);
            }
          }
        }
      }
    }, 60000); // alle 60 Sekunden prüfen

    return () => clearInterval(checkInterval);
  }, [tasks, getTodayDateString]);

  return null; // Rendered nichts ins UI
};

export default NotificationManager;
