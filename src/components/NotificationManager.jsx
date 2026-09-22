import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { messaging, db } from '../firebase';
import { getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';

const NotificationManager = () => {
  const { user } = useAuth();

  useEffect(() => {
    const requestPermissionAndGetToken = async () => {
      if (!user || !messaging) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const currentToken = await getToken(messaging, { 
            vapidKey: 'BO7em0OjRyHX89V3Dsu023QZOA_DUoC_FoAt6bzY7mR1oVaHWo3_jnDLzOVA-wG3op4tagAdCi_zw_4pHTMtqic' 
          });
          
          if (currentToken) {
            // Token in Firestore speichern
            await setDoc(doc(db, 'users', user.uid), {
              fcmToken: currentToken
            }, { merge: true });
            console.log('FCM Token gespeichert!');
          }
        }
      } catch (err) {
        console.error('Fehler beim Abrufen des FCM Tokens:', err);
      }
    };

    requestPermissionAndGetToken();
  }, [user]);

  return null;
};

export default NotificationManager;
