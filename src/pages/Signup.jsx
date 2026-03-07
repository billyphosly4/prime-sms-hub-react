// src/pages/Signup.jsx
import React, { useState } from 'react';
import { auth, db } from '../firebasejs/config';  // Changed from '/firebasejs/config'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Navbar from '/src/components/Navbar';  // Changed from '/components/Navbar'
import './Signup.css';

export default function Signup({ onNavigate }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      });
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);

    // Validation
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: formData.fullName
      });

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || '',
        wallet: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        emailVerified: user.emailVerified,
        uid: user.uid
      });

      // Navigate to login
      if (onNavigate) {
        onNavigate('login');
      }
    } catch (err) {
      console.error('Signup error:', err);
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          setFieldErrors({ email: 'Email already in use. Please login instead.' });
          break;
        case 'auth/invalid-email':
          setFieldErrors({ email: 'Invalid email address' });
          break;
        case 'auth/weak-password':
          setFieldErrors({ password: 'Password is too weak' });
          break;
        default:
          setFieldErrors({ form: err.message || 'Signup failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar onNavigate={onNavigate} />
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <img src="/hero.png" alt="PrimeSmsHub" className="signup-logo" />
            <h2>Create Account</h2>
            <p>Join PrimeSmsHub today</p>
          </div>

          {fieldErrors.form && (
            <div className="error-message">
              ⚠️ {fieldErrors.form}
            </div>
          )}

          <form onSubmit={handleSignup} className="signup-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
                disabled={loading}
                className={fieldErrors.fullName ? 'input-error' : ''}
              />
              {fieldErrors.fullName && (
                <span className="field-error">❌ {fieldErrors.fullName}</span>
              )}
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className={fieldErrors.email ? 'input-error' : ''}
              />
              {fieldErrors.email && (
                <span className="field-error">❌ {fieldErrors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label>Phone Number (Optional)</label>
              <input
                type="tel"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                minLength="6"
                className={fieldErrors.password ? 'input-error' : ''}
              />
              {fieldErrors.password && (
                <span className="field-error">❌ {fieldErrors.password}</span>
              )}
              {!fieldErrors.password && (
                <small>Must be at least 6 characters</small>
              )}
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                className={fieldErrors.confirmPassword ? 'input-error' : ''}
              />
              {fieldErrors.confirmPassword && (
                <span className="field-error">❌ {fieldErrors.confirmPassword}</span>
              )}
            </div>

            <div className="form-checkbox">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">
                I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
              </label>
            </div>

            <button 
              type="submit" 
              className="signup-button" 
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="signup-footer">
            <p>Already have an account? <span 
              onClick={() => onNavigate && onNavigate('login')}
              style={{ color: '#667eea', cursor: 'pointer', fontWeight: 'bold' }}
            >Login</span></p>
          </div>
        </div>
      </div>
    </>
  );
}