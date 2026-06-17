import React, { useState } from 'react';
import { X, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthModal = ({ isOpen, onClose }) => {
  const { loginWithEmail, registerWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--bg-color)', padding: '2rem', borderRadius: 'var(--border-radius)',
        width: '90%', maxWidth: '400px', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer'
        }}>
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          {isLogin ? 'Anmelden' : 'Registrieren'}
        </h2>

        {error && (
          <div style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>E-Mail Adresse</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.2rem',
                  backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem', color: 'var(--text-color)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Passwort</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
                style={{
                  width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.2rem',
                  backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem', color: 'var(--text-color)'
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '1rem' }}
          >
            {loading ? 'Bitte warten...' : (isLogin ? 'Einloggen' : 'Account erstellen')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? "Noch keinen Account? " : "Bereits einen Account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLogin ? 'Hier registrieren' : 'Hier anmelden'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
