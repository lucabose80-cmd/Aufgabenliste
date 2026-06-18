import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, IconButton, Box, Alert, InputAdornment } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const AuthModal = ({ isOpen, onClose }) => {
  const { loginWithEmail, registerWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      onClose(); // Schließen bei Erfolg
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Falsche E-Mail oder falsches Passwort.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Diese E-Mail wird bereits verwendet.');
      } else if (err.code === 'auth/weak-password') {
        setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      } else {
        setError('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
        {isLogin ? 'Anmelden' : 'Registrieren'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="E-Mail Adresse"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Passwort"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            inputProps={{ minLength: 6 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            size="large"
            sx={{ mt: 2, mb: 2 }}
          >
            {loading ? 'Bitte warten...' : (isLogin ? 'Einloggen' : 'Account erstellen')}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {isLogin ? "Noch keinen Account? " : "Bereits einen Account? "}
              <Button 
                variant="text" 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                {isLogin ? 'Hier registrieren' : 'Hier anmelden'}
              </Button>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
