import React, { useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { format } from 'date-fns';

const NotificationManager = () => {
  const { tasks, calorieLogs, getTodayDateString } = useTaskContext();

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

        // Erst ab 20 Uhr
        if (hours >= 20) {
          // Wurde heute schon benachrichtigt?
          const lastNotified = localStorage.getItem('lastNotificationDate');
          if (lastNotified !== todayStr) {
            
            // Check ob noch Aufgaben offen sind (nur tägliche Routinen)
            const incompleteRoutines = tasks.filter(t => {
              if (t.type !== 'daily') return false;
              if (t.completedDates.includes(todayStr)) return false;
              return true;
            });

            // Check ob Kalorien eingetragen wurden
            const caloriesLogged = calorieLogs.some(l => l.date === todayStr);

            if (incompleteRoutines.length > 0 || !caloriesLogged) {
              // Benachrichtigung senden
              let message = "Erinnerung: Du hast heute noch offene Routinen!";
              if (incompleteRoutines.length === 0 && !caloriesLogged) {
                message = "Erinnerung: Du hast dein Kalorienziel für heute noch nicht eingetragen!";
              } else if (incompleteRoutines.length > 0 && !caloriesLogged) {
                message = "Erinnerung: Es fehlen noch Routinen und dein Kalorien-Eintrag!";
              }

              new Notification("TaskMaster", {
                body: message,
                icon: "/vite.svg" // oder ein passendes Icon
              });

              // Speichern, dass wir heute benachrichtigt haben, um Spam zu vermeiden
              localStorage.setItem('lastNotificationDate', todayStr);
            } else {
              // Alles erledigt, wir speichern auch, dass wir heute nicht mehr prüfen müssen
              localStorage.setItem('lastNotificationDate', todayStr);
            }
          }
        }
      }
    }, 60000); // alle 60 Sekunden prüfen

    return () => clearInterval(checkInterval);
  }, [tasks, calorieLogs, getTodayDateString]);

  return null; // Rendered nichts ins UI
};

export default NotificationManager;
