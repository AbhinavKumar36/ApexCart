import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, Mail, AlertTriangle, KeyRound, Eye, EyeOff, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import logoImg from '../assets/logo.png';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [attempts, setAttempts] = useState(3);
  const [lockoutTime, setLockoutTime] = useState(() => {
    const savedLockoutEnd = localStorage.getItem('login_lockout_end');
    if (savedLockoutEnd) {
      const remaining = Math.ceil((parseInt(savedLockoutEnd, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        return remaining;
      } else {
        localStorage.removeItem('login_lockout_end');
      }
    }
    return 0;
  }); // in seconds

  useEffect(() => {
    let timer;
    if (lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            localStorage.removeItem('login_lockout_end');
            setAttempts(3);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutTime > 0) return;
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsAuthenticating(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setError('');
      setIsAuthenticating(false);
      onLoginSuccess(userCredential.user);
    } catch (err) {
      console.error("Auth error code:", err.code);

      // Seed fallback
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        if (
          (email === 'admin@apexcart.com' && password === 'admin123') ||
          (email === 'staff@apexcart.com' && password === 'staff123')
        ) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            setError('');
            setIsAuthenticating(false);
            onLoginSuccess(userCredential.user);
            return;
          } catch (createErr) {
            if (createErr.code !== 'auth/email-already-in-use') {
              setError(`System error: ${createErr.message}`);
              setIsAuthenticating(false);
              return;
            }
          }
        }
      }

      // Offline Sign-In Fallback if network fails
      if (err.code === 'auth/network-request-failed' || err.code === 'auth/internal-error') {
        const localUser = email.split('@')[0];
        if (
          (email === 'admin@apexcart.com' && password === 'admin123') ||
          (email === 'staff@apexcart.com' && password === 'staff123')
        ) {
          setError('');
          setIsAuthenticating(false);
          onLoginSuccess({
            email,
            uid: `offline-${localUser}-uid`,
            isOffline: true
          });
          return;
        }
      }

      setIsAuthenticating(false);
      const remainingAttempts = attempts - 1;
      setAttempts(remainingAttempts);

      if (remainingAttempts <= 0) {
        const lockDuration = 600; // 10 minutes
        const end = Date.now() + lockDuration * 1000;
        localStorage.setItem('login_lockout_end', end.toString());
        setLockoutTime(lockDuration);
        setError('Maximum login attempts exceeded. System locked for 10 minutes.');
      } else {
        let msg = 'Incorrect email or password.';
        if (err.code === 'auth/invalid-email') {
          msg = 'Please enter a valid email address.';
        } else if (err.code === 'auth/user-not-found') {
          msg = 'No operator account found with this email.';
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = `Incorrect password. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`;
        } else if (err.code === 'auth/too-many-requests') {
          msg = 'Account disabled due to unusual activity. Try again later.';
        } else if (err.code === 'auth/network-request-failed') {
          msg = 'Network connection failed. Double-check your Wi-Fi.';
        }
        setError(msg);
      }
    }
  };



  const formatLockoutTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.ambientBackground}>
        <div style={styles.orb1} />
        <div style={styles.orb2} />
      </div>
      
      <motion.div 
        style={styles.card} 
        className="glass-panel"
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={styles.header}>
          <motion.div 
            style={styles.logoContainer}
            whileHover={{ rotate: 10, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <img src={logoImg} alt="ApexCart Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </motion.div>
          <h1 style={styles.title}>ApexCart</h1>
          <p style={styles.subtitle}>Superstore Control Center</p>
        </div>

        {error && (
          <motion.div 
            style={lockoutTime > 0 ? styles.errorContainerLock : styles.errorContainer}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </motion.div>
        )}

        {lockoutTime > 0 ? (
          <motion.div style={styles.lockoutContent} className="animate-fade">
            <div style={styles.lockIconContainer}>
              <KeyRound size={40} color="var(--color-danger)" />
            </div>
            <h2 style={styles.lockoutTitle}>Access Suspended</h2>
            <p style={styles.lockoutText}>Too many failed attempts. Security cooldown active.</p>
            <div style={styles.countdownBox}>
              <span style={styles.countdownLabel}>TRY AGAIN IN</span>
              <span style={styles.countdownTime} className="font-mono">{formatLockoutTime(lockoutTime)}</span>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Operator ID / Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="name@apexcart.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  className="input-field"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Security Key</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  className="input-field"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={styles.actionRow}>
              <a href="#" style={styles.forgotLink}>Forgot credentials?</a>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
              <strong style={{display: 'block', marginBottom: '0.25rem', color: 'var(--color-text-primary)'}}>Test Credentials:</strong>
              <div>Admin: <b>admin@apexcart.com</b> / <b>admin123</b></div>
              <div>Staff: <b>staff@apexcart.com</b> / <b>staff123</b></div>
            </div>

            <motion.button 
              type="submit" 
              disabled={isAuthenticating}
              style={styles.submitButton} 
              className="btn btn-primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isAuthenticating ? 'Authenticating Sequence...' : 'Authenticate'}
            </motion.button>
            
            <div style={styles.footerInfo}>
              <Lock size={12} style={{marginRight: '4px'}}/> End-to-end encrypted session
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    position: 'relative',
    backgroundColor: 'var(--color-bg-base)',
    overflow: 'hidden',
    padding: '1.5rem',
  },
  ambientBackground: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  orb1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '60vw',
    height: '60vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--color-primary-light) 0%, rgba(255,255,255,0) 70%)',
    filter: 'blur(60px)',
    animation: 'pulseGlow 8s infinite alternate',
  },
  orb2: {
    position: 'absolute',
    bottom: '-20%',
    right: '-10%',
    width: '50vw',
    height: '50vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0) 70%)',
    filter: 'blur(60px)',
    animation: 'pulseGlow 12s infinite alternate-reverse',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '3rem 2.5rem',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  logoContainer: {
    display: 'inline-flex',
    padding: '1.25rem',
    borderRadius: '20px',
    backgroundColor: 'var(--color-bg-surface)',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: '1.5rem',
    border: '1px solid var(--color-border)',
  },
  title: {
    fontSize: '2.25rem',
    letterSpacing: '-0.03em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.9375rem',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.02em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '1.25rem',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none',
  },
  input: {
    paddingLeft: '3.25rem',
    paddingRight: '3rem',
    height: '3.25rem',
  },
  eyeButton: {
    position: 'absolute',
    right: '1rem',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    transition: 'color 0.2s',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '-0.5rem',
  },
  forgotLink: {
    fontSize: '0.8125rem',
    color: 'var(--color-primary)',
    textDecoration: 'none',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: '0.5rem',
    height: '3.25rem',
    fontSize: '1rem',
    width: '100%',
  },
  footerInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '1rem',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  errorContainerLock: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    animation: 'pulseGlow 2s infinite',
  },
  lockoutContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '2rem 0',
  },
  lockIconContainer: {
    display: 'inline-flex',
    padding: '1.25rem',
    borderRadius: '50%',
    backgroundColor: 'var(--color-danger-light)',
    marginBottom: '1.5rem',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  lockoutTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    color: 'var(--color-text-primary)'
  },
  lockoutText: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.9375rem',
    marginBottom: '2rem',
  },
  countdownBox: {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: 'var(--shadow-sm)',
  },
  countdownLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.1em',
  },
  countdownTime: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: 'var(--color-danger)',
    letterSpacing: '0.05em',
  }
};
