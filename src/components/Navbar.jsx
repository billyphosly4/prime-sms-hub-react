// src/components/Navbar.jsx
import React from 'react';
import { auth } from '../firebasejs/config';
import { signOut } from 'firebase/auth';
import './Navbar.css';

export default function Navbar({ onNavigate, user = null }) {
  const handleLoginClick = () => {
    if (onNavigate) {
      onNavigate('login');
    }
  };

  const handleSignupClick = () => {
    if (onNavigate) {
      onNavigate('signup');
    }
  };

  const handleDashboardClick = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  const handleHomeClick = () => {
    if (onNavigate) {
      onNavigate('home');
    }
  };

  const handleLogoutClick = async () => {
    try {
      await signOut(auth);
      if (onNavigate) {
        onNavigate('home');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="site-header header">
      <div className="container-wide navbar">
        <div className="brand" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
          <img src="/hero.png" alt="PrimeSmsHub" />
          <div>
            <strong>PrimeSmsHub</strong>
            <div style={{ fontSize: '12px', color: '#e0e7ff' }}>
              Virtual numbers & SMS verification
            </div>
          </div>
        </div>
        
        <div className="nav-actions">
          {user ? (
            // User is logged in - show dashboard and logout
            <>
              <button
                className="btn fund"
                onClick={() => onNavigate && onNavigate('fund-wallet')}
              >
                Fund Wallet
              </button>
              <button
                className="btn secondary"
                onClick={handleDashboardClick}
              >
                Dashboard
              </button>
              <button
                className="btn outline"
                onClick={handleLogoutClick}
              >
                Logout
              </button>
            </>
          ) : (
            // User is not logged in - show signup and login
            <>
              <button
                className="btn secondary"
                id="openAuthSignup"
                onClick={handleSignupClick}
              >
                Sign up
              </button>
              <button
                className="btn primary"
                id="openAuthLogin"
                onClick={handleLoginClick}
              >
                Login / Buy
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}