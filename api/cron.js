import admin from 'firebase-admin';

// Initialize Firebase Admin (Only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "thabit-tracker",
      // WICHTIG: Hier kommen die Daten aus deiner Service Account JSON rein!
      clientEmail: "DEINE_CLIENT_EMAIL_HIER",
      // Das .replace ist wichtig, da Vercel/Node manchmal Zeilenumbrüche zerschießt
      privateKey: "DEIN_PRIVATE_KEY_HIER".replace(/\\n/g, '\n'),
    })
  });
}

export default async function handler(req, res) {
  try {
    // 1. Passwort Prüfung
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer mein_cron_passwort_123`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = admin.firestore();
    const messaging = admin.messaging();
    
    // 2. Hole alle Benutzer
    const usersSnap = await db.collection('users').get();
    let notificationsSent = 0;
    
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (!userData.fcmToken) continue; // Kein Token -> kann keine Push empfangen
      
      // 3. Hole die persönlichen Aufgaben des Benutzers
      const tasksSnap = await db.collection('users').doc(userDoc.id).collection('tasks').get();
      const tasks = tasksSnap.docs.map(d => d.data());
      
      // Heutiges Datum (YYYY-MM-DD Format wie im Frontend)
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      
      // 4. Suche nach offenen täglichen Routinen
      const incompleteRoutines = tasks.filter(t => {
        if (t.type !== 'daily') return false;
        if ((t.completedDates || []).includes(todayStr)) return false;
        return true;
      });
      
      // 5. Benachrichtigung senden, falls noch was offen ist
      if (incompleteRoutines.length > 0) {
        await messaging.send({
          token: userData.fcmToken,
          notification: {
            title: "TaskMaster",
            body: `Erinnerung: Du hast heute noch ${incompleteRoutines.length} offene Routine(n)!`
          }
        });
        notificationsSent++;
      }
    }

    return res.status(200).json({ success: true, sent: notificationsSent });
  } catch (error) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
