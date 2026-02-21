import { useState } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import './Login.css';

// Firebase Config
const firebaseConfig = {
  apiKey: 'AIzaSyCIK3C5qAOUZUtUixX1knFRSkXAYXOCDaA',
  authDomain: 'primesmshub-c0f58.firebaseapp.com',
  projectId: 'primesmshub-c0f58',
  storageBucket: 'primesmshub-c0f58.firebasestorage.app',
  messagingSenderId: '40273399506',
  appId: '1:40273399506:web:349a116c082d830987a70b',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function Signup({ onNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { name, email, phone, password, confirmPassword } = formData;

    // Validation
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: name,
        email: email,
        phone: phone || '',
        country: '',
        address: '',
        wallet: 0,
        createdAt: new Date(),
      });

      alert('You have signed up successfully! ✅\n\nWelcome to PrimeSmsHub!');
      onNavigate('home');
      // window.location.href = 'dashboard.html'; // Uncomment if you have a dashboard page
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <div className="login">
        <div className="logo">
          <img src="/hero.png" alt="Logo" />
        </div>

        <h1>Welcome! 👋</h1>
        <h2>Create your account</h2>

        {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSignup}>
            <div className="input-area">
              <div className="input-field">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-field">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-field">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  placeholder="Your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="input-field">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="auth-button">
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Register Now'}
              </button>
            </div>

            <p>
              Already have an account?{' '}
              <a href="#" onClick={() => onNavigate('login')}>
                Login Here
              </a>
            </p>
          </form>
        </div>
      </main>
  );
}
