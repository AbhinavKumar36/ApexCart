import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, Mail, AlertTriangle, KeyRound, Eye, EyeOff, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../assets/logo.png';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [attempts, setAttempts] = useState(3);
  const [lockoutTime, setLockoutTime] = useState(() => {
    // Check if there is an active lockout in localStorage from a previous refresh
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

      // On first run, if default accounts don't exist in the new Auth console, auto-create them!
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        if (
          (email === 'admin@apexcart.com' && password === 'admin123') ||
          (email === 'staff@apexcart.com' && password === 'staff123') ||
          (email === 'employee@apexcart.com' && password === 'emp123') ||
          (email === 'grocery_staff@apexcart.com' && password === 'staff123') ||
          (email === 'fresh_staff@apexcart.com' && password === 'staff123')
        ) {
          try {
            console.log("Seeding default account on Firebase Authentication...");
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            setError('');
            setIsAuthenticating(false);
            onLoginSuccess(userCredential.user);
            return;
          } catch (createErr) {
            console.warn("Auto-signup failed, probably already created or password policy issue:", createErr);
            // If it failed because user already exists (wrong password was entered), allow it to fall through to standard error
            if (createErr.code === 'auth/email-already-in-use') {
              // Proceed to show standard incorrect password error
            } else {
              setError(`System configuration error: ${createErr.message}`);
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
          (email === 'staff@apexcart.com' && password === 'staff123') ||
          (email === 'employee@apexcart.com' && password === 'emp123') ||
          (email === 'grocery_staff@apexcart.com' && password === 'staff123') ||
          (email === 'fresh_staff@apexcart.com' && password === 'staff123')
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
        // Format common firebase error codes
        let msg = 'Incorrect email or password.';
        if (err.code === 'auth/invalid-email') {
          msg = 'Please enter a valid email address.';
        } else if (err.code === 'auth/user-not-found') {
          msg = 'No operator account found with this email.';
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = `Incorrect password. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`;
        } else if (err.code === 'auth/too-many-requests') {
          msg = 'Account has been temporarily disabled due to unusual activity. Try again later.';
        } else if (err.code === 'auth/network-request-failed') {
          msg = 'Network connection failed. Double-check your Wi-Fi/Internet.';
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
      <div style={styles.backgroundGlow} />
      <motion.div 
        style={styles.card} 
        className="glass glow"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
      >
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img src={logo} alt="ApexCart Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>
          <h1 style={styles.title}>ApexCart</h1>
          <p style={styles.subtitle}>Superstore Control Center</p>
        </div>

        {error && (
          <div style={lockoutTime > 0 ? styles.errorContainerLock : styles.errorContainer} className="animate-fade">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {lockoutTime > 0 ? (
          <div style={styles.lockoutContent} className="animate-fade">
            <div style={styles.lockIconContainer}>
              <KeyRound size={40} color="var(--color-danger)" />
            </div>
            <h2 style={styles.lockoutTitle}>Access Suspended</h2>
            <p style={styles.lockoutText}>Too many failed attempts. Security cooldown active.</p>
            <div style={styles.countdownBox}>
              <span style={styles.countdownLabel}>TRY AGAIN IN</span>
              <span style={styles.countdownTime} className="font-mono">{formatLockoutTime(lockoutTime)}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Operator Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="name@apexcart.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  className="input-field font-mono"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  className="input-field font-mono"
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

            <button 
              type="submit" 
              disabled={isAuthenticating}
              style={styles.submitButton} 
              className="btn btn-primary"
            >
              {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
            </button>

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
  backgroundGlow: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--color-primary-glow) 0%, rgba(0,0,0,0) 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '2.5rem',
    borderRadius: '24px',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoContainer: {
    display: 'inline-flex',
    padding: '1rem',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-light)',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    lineHeight: '1.2',
  },
  subtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
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
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none',
  },
  input: {
    paddingLeft: '2.75rem',
    paddingRight: '3rem',
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
    padding: '0.25rem',
  },
  submitButton: {
    marginTop: '0.5rem',
    padding: '0.875rem',
  },
  errorContainer: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  errorContainerLock: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    animation: 'pulseGlow 2s infinite',
  },
  lockoutContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '1.5rem 0',
  },
  lockIconContainer: {
    display: 'inline-flex',
    padding: '1rem',
    borderRadius: '50%',
    backgroundColor: 'var(--color-danger-light)',
    marginBottom: '1rem',
  },
  lockoutTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  lockoutText: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
  },
  countdownBox: {
    background: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    width: '100%',
  },
  countdownLabel: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--color-text-muted)',
    letterSpacing: '1px',
  },
  countdownTime: {
    fontSize: '2rem',
    fontFamily: 'var(--font-heading)',
    fontWeight: '800',
    color: 'var(--color-danger)',
    letterSpacing: '1px',
  },
  hintBox: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary-light)',
    border: '1px solid var(--color-primary-glow)',
    fontSize: '0.75rem',
    textAlign: 'left',
    color: 'var(--color-text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  hintTitle: {
    fontWeight: '700',
    marginBottom: '0.15rem',
    textAlign: 'center',
  },
  hintValue: {
    fontFamily: 'monospace',
    fontSize: '0.71875rem',
  }
};
