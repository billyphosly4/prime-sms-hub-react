import { useState } from 'react';
import './Login.css';

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Placeholder for Firebase authentication
      // Replace this with actual Firebase code once firebase is installed
      console.log('Login attempt with:', { email, password });
      alert('Login successful ✅');
      
      // Navigate to dashboard or home
      if (onNavigate) {
        onNavigate('home');
      } else {
        window.location.href = 'dashboard.html';
      }
    } catch (error) {
      alert(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();

    if (!email.trim()) {
      alert('Enter your email first');
      return;
    }

    // Placeholder for Firebase password reset
    console.log('Password reset requested for:', email);
    alert('Password reset email sent 📧');
  };

  return (
    <main className="login-container">
      <div className="login">
        <div className="logo">
          <img src="/hero.png" alt="PrimeSmsHub Logo" />
        </div>

        <h1>Welcome back! 👏</h1>
        <h2>Login with your account</h2>

        <form onSubmit={handleLogin}>
          <div className="input-area">
            <div className="input-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-button">
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetPassword}
            className="reset-password-btn"
          >
            Reset Password
          </button>

          <p>
            Don't have an account?{' '}
            <a href="#" onClick={() => onNavigate && onNavigate('signup')}>
              Sign Up Now
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
