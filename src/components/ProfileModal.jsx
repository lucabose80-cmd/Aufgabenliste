import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, CircularProgress, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ProfileModal = ({ open, onClose }) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      const loadProfile = async () => {
        setIsLoading(true);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().displayName) {
            setDisplayName(userDoc.data().displayName);
          } else {
            setDisplayName('');
          }
        } catch (err) {
          console.error('Fehler beim Laden des Profils:', err);
        }
        setIsLoading(false);
      };
      loadProfile();
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        uid: user.uid,
        displayName: displayName.trim()
      }, { merge: true });
      onClose();
    } catch (err) {
      console.error('Fehler beim Speichern des Profils:', err);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Profil bearbeiten</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: 1 }}>
              Lege einen Anzeigenamen fest. Dieser Name wird anstelle deiner E-Mail-Adresse für andere Nutzer angezeigt.
            </Typography>
            <TextField
              label="Anzeigename"
              fullWidth
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="z.B. Alex"
              autoFocus
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Abbrechen</Button>
        <Button onClick={handleSave} variant="contained" disabled={isLoading}>Speichern</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileModal;
