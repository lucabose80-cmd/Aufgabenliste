import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "thabit-tracker",
      clientEmail: "firebase-adminsdk-fbsvc@thabit-tracker.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDYeatRs6vttOEv\nmS1Fbqmg7Wa/6xDs+LihqvyVNJVZDg0IbzrIceeGeRhEpdU8Sj2878V2d0aM0Xvd\nABBcQIHsQkYsL9L4ErHGL/cLQo9xdqT5IgDeKoa5ANq0Xk4hr7jVyTp7VWiWMmJ0\ncPUoe6Ff+ag3dBN8sdXWlJVP+XfRWBKoPPCpMweq2ADI7/v65btAO15sgYB/IfB7\n4uZgevVRQ3mhQh8qh8XLID2VRXuEoh7L07uOZLc+Z4nLpMiJjSVrCN1nSOnh8reP\n+vaDrAXDuoMktk8kl0IMb2SfblpfNoRqUv9qonp25rz3owsVUwhEmpx52grmPRgE\nRMP2ZIbDAgMBAAECggEAAzolHK2yBXQp2zzMWPmiW7zOSFQnx3CZyAc1hr/m7hHw\njcyisrRIAFAz1WoneKOesf9dETwL+DNzRkMm+0kW5r/CLgx0d7BHqC204B0Y6Fcd\ndH1WR/mYUo+5svCo94WYGs/KKGaIjZyorRW2Ael96WFeaZ04YSaBipZid3O/noZL\nkpyOAoS9icB7vsaiVSHQlfSd08x/ZkzGbYYPkgyRFySDAOyyGoL/RRQk3g0nXggr\ngVTOV6DFU8qGfeWZS3tDuXYevJTyBWVABtsVZohnLwMM6nneMspd/ahrKMZ/VjEK\nlFOgjBupcSGVVJkdOn4ePrmV7AMs5cHZDpE0wXbDEQKBgQD1F0KjlP02kmj5BtNo\n5LViWTGceqXLK34kXk0Rkk40assKmBzDONlaBhHrq8jkcVVZWHQx2yVcU2u23o/5\nkKBm691dKW9g6IhT08z221PYDv6SgzPbOmiqSs++v9ILWwpedOu5AyhbPaf4Kpet\neQkHvPUbamJxI9sMFiZyyY4EaQKBgQDiHFeuiJ2QggZZ93c1FJP9xwSS7uQKidVk\nRlVZGZo+fLdIJDalQdXIPso1CbXdP/c1upAZLVJ+qxZ5/QqKCc9X2qhvjM2V/H0l\nFT1kHUKBLwoK9ScXPzFFNh5BNFXLTGSLRDgkrBK9R6ZpC0pMKGHqTHkNWZhgp7kW\nkIGKYifcSwKBgF+51whHP+MZqjBhjx7v/TxNdAgXCzxgX2NbBaTwTOVCNM2NfeZu\nBM6ZglRXAx7eeSRtXOzAGEaIOpDxOrCR4WRxiUNC1MK378818V8VaRkBOkMFRbLB\njHG+yIdLKoHO7CzaY9seNZv1Z+6QzC8wD+vazK0Jjyt7gqmk2R2KRZLJAoGBAIye\nv9El2YgjtTuCcbqrP5aWjTusIlqDehjQvQeaqpiuC3ZsPyfrl77fffYaQeaFf4ME\nsdVWoHVyhZn8Su+qRi8HJ7WoRbs/uby0RufaYp/g10gVSuhkPooirBI1MB4tNmJ+\nXMRB162rv8yYXu6aNrr2MFqjG+cQqEVmPYoInW2dAoGANHjze/iAzZLGq3jJimM8\nPDnWoAJqz7ZSkgZf6SbR6JW0OBVkfYuzy06tEFQ1mFh6WsKRDGlTX5GT4RnWRM78\nN7/Qt1XQOxa9Gos5bEnkf+zUDWg9dg/aYVojm5tR1GTkNX9/bB3wNpSAakk1LiI8\nLnE1Iijgh4HxiRYTV3af7ys=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
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
