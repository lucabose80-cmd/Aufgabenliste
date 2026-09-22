importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAlC4cf1RU4HdlMTn4wQOBlrMhLM1ZD4qE",
  authDomain: "thabit-tracker.firebaseapp.com",
  projectId: "thabit-tracker",
  storageBucket: "thabit-tracker.firebasestorage.app",
  messagingSenderId: "178691558776",
  appId: "1:178691558776:web:f261d90853d653f52a4c8d",
  measurementId: "G-5LEJG8SYHD"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Wenn der Payload ein 'notification' Objekt hat, zeigt Firebase/Browser 
  // die Benachrichtigung automatisch. Wir müssen sie nicht nochmal manuell zeigen,
  // sonst kommt sie doppelt!
  if (!payload.notification) {
    const notificationTitle = payload.data?.title || "TaskMaster";
    const notificationOptions = {
      body: payload.data?.body,
      icon: 'https://aufgabenliste-beta.vercel.app/pwa-192x192.png'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});
