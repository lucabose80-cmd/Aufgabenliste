import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "thabit-tracker",
      clientEmail: "DEINE_CLIENT_EMAIL_HIER",
      privateKey: "DEIN_PRIVATE_KEY_HIER".replace(/\\n/g, '\n'),
    })
  });
}

export default async function handler(req, res) {
  // Wir erlauben CORS, falls das Frontend es direkt aufrufen möchte
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { listName, completedByUid } = req.body;
    
    if (!listName || !completedByUid) {
      return res.status(400).json({ error: "Fehlende Parameter" });
    }

    const db = admin.firestore();
    const messaging = admin.messaging();
    
    // Wir benachrichtigen einfach mal alle anderen User, die in der App sind.
    // (Da geteilte Aufgaben global sind, gehen wir davon aus, dass Einkäufe die ganze Familie betreffen).
    // Alternativ könnte man hier nur spezifische User auslesen.
    
    const usersSnap = await db.collection('users').get();
    let notificationsSent = 0;
    
    for (const userDoc of usersSnap.docs) {
      if (userDoc.id === completedByUid) continue; // Dem Einkäufer selbst keine Push schicken
      
      const userData = userDoc.data();
      if (!userData.fcmToken) continue;
      
      await messaging.send({
        token: userData.fcmToken,
        notification: {
          title: "Einkauf erledigt!",
          body: `Alles von der Liste "${listName}" wurde eingekauft.`
        }
      });
      notificationsSent++;
    }

    return res.status(200).json({ success: true, sent: notificationsSent });
  } catch (error) {
    console.error("Shopping Notification Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
