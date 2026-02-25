// dashboard.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '/src/firebasejs/config';
import { signOut } from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, query, where, getDocs, serverTimestamp,
  orderBy, limit
} from 'firebase/firestore';
import axios from 'axios';
import './Dashboard.css';

// API Keys from environment variables with fallbacks
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_639470fbe710a9b3503068dd875e4b027bd096fe';
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const FIVESIM_API_KEY = import.meta.env.VITE_5SIM_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://smshub-ftgg.onrender.com';
const APP_NAME = import.meta.env.VITE_APP_NAME || 'PrimeSmsHub';

const Dashboard = ({ onNavigate, user }) => {
  // ==================== STATE VARIABLES ====================
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState({ 
    fullName: 'User', 
    wallet: 0, 
    telegramId: null,
    email: '',
    phone: ''
  });
  const [transactions, setTransactions] = useState([]);
  const [activeNumbers, setActiveNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Page state
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // Country selection state
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCountryData, setSelectedCountryData] = useState(null);
  
  // Service selection state
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [servicePrices, setServicePrices] = useState({});
  
  // SMS states
  const [smsMessages, setSmsMessages] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [checkingSms, setCheckingSms] = useState(false);
  
  // Telegram states
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  
  // Payment states
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // ==================== HELPER FUNCTIONS ====================
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCountryFlag = (countryCode) => {
    const flags = {
      ru: '🇷🇺', ua: '🇺🇦', kz: '🇰🇿', us: '🇺🇸', gb: '🇬🇧',
      de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', ca: '🇨🇦',
      cn: '🇨🇳', jp: '🇯🇵', kr: '🇰🇷', in: '🇮🇳', br: '🇧🇷',
      mx: '🇲🇽', au: '🇦🇺', nz: '🇳🇿', za: '🇿🇦', ng: '🇳🇬',
      ke: '🇰🇪', gh: '🇬🇭', eg: '🇪🇬', ma: '🇲🇦'
    };
    return flags[countryCode] || '🌍';
  };

  // ==================== LOAD PAYSTACK SCRIPT ====================
  useEffect(() => {
    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // ==================== LOAD USER DATA ====================
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      loadUserData(user);
      loadTransactions(user);
      loadActiveNumbers(user);
      loadCountries();
      checkTelegramLink(user);
    }
  }, [user]);

  const loadUserData = async (user) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const newUserData = {
          email: user.email,
          fullName: user.displayName || user.email?.split('@')[0] || 'User',
          phone: '',
          country: '',
          wallet: 0,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        };
        try {
          await setDoc(userRef, newUserData);
          setUserData(newUserData);
        } catch (setError) {
          console.warn('Could not create user document, using local data');
          setUserData({
            ...newUserData,
            wallet: 0
          });
        }
      } else {
        setUserData(userSnap.data());
      }
    } catch (error) {
      console.warn('Using default user data');
      setUserData({
        fullName: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email,
        wallet: 0,
        phone: ''
      });
    }
  };

  const checkTelegramLink = async (user) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().telegramId) {
        setTelegramLinked(true);
      }
    } catch (error) {
      console.warn('Could not check Telegram link:', error);
    }
  };

  const loadTransactions = async (user) => {
    try {
      const q = query(
        collection(db, 'transactions'), 
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const txList = [];
      snap.forEach(doc => {
        const data = doc.data();
        txList.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date()
        });
      });
      setTransactions(txList);
    } catch (e) {
      console.warn('Could not load transactions');
      setTransactions([]);
    }
  };

  const loadActiveNumbers = async (user) => {
    try {
      const q = query(collection(db, 'activeNumbers'), where('uid', '==', user.uid));
      const snap = await getDocs(q);
      const numbers = [];
      snap.forEach(doc => {
        const data = doc.data();
        numbers.push({ 
          id: doc.id, 
          ...data,
          purchasedAt: data.purchasedAt?.toDate?.() || new Date()
        });
      });
      setActiveNumbers(numbers);
    } catch (e) {
      console.warn('Could not load active numbers');
      setActiveNumbers([]);
    }
  };

  // ==================== 5SIM INTEGRATION ====================
  const loadCountries = async () => {
    setLoading(true);
    setError(null);
    
    // Mock countries data for fallback
    const mockCountries = [
      { code: 'ru', name: 'Russia', image: '🇷🇺' },
      { code: 'ua', name: 'Ukraine', image: '🇺🇦' },
      { code: 'kz', name: 'Kazakhstan', image: '🇰🇿' },
      { code: 'us', name: 'United States', image: '🇺🇸' },
      { code: 'gb', name: 'United Kingdom', image: '🇬🇧' },
      { code: 'de', name: 'Germany', image: '🇩🇪' },
      { code: 'fr', name: 'France', image: '🇫🇷' },
      { code: 'es', name: 'Spain', image: '🇪🇸' },
      { code: 'it', name: 'Italy', image: '🇮🇹' },
      { code: 'ca', name: 'Canada', image: '🇨🇦' },
      { code: 'au', name: 'Australia', image: '🇦🇺' },
      { code: 'ng', name: 'Nigeria', image: '🇳🇬' },
      { code: 'ke', name: 'Kenya', image: '🇰🇪' },
      { code: 'za', name: 'South Africa', image: '🇿🇦' },
      { code: 'eg', name: 'Egypt', image: '🇪🇬' }
    ];

    try {
      // Try to fetch from backend
      try {
        const response = await axios.get(`${BACKEND_URL}/api/5sim/countries`, {
          headers: { 
            'Authorization': `Bearer ${FIVESIM_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        if (response.data && typeof response.data === 'object') {
          const countryList = Object.keys(response.data).map(key => ({
            code: key,
            name: response.data[key].name || key.toUpperCase(),
            image: response.data[key].image || getCountryFlag(key)
          }));
          setCountries(countryList);
        } else {
          setCountries(mockCountries);
        }
      } catch (backendError) {
        console.warn('Backend not available, using mock data');
        setCountries(mockCountries);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
      setCountries(mockCountries);
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = async (country) => {
    setSelectedCountry(country.code);
    setSelectedCountryData(country);
    setCurrentPage('service-selection');
    await loadServices(country.code);
  };

  const loadServices = async (countryCode) => {
    setLoading(true);
    
    // Mock services data
    const mockServices = [
      { id: 'whatsapp', name: 'WhatsApp', price: 1.99, operators: ['MTS', 'Beeline', 'Megafon'] },
      { id: 'telegram', name: 'Telegram', price: 1.49, operators: ['MTS', 'Beeline', 'Tele2'] },
      { id: 'viber', name: 'Viber', price: 1.29, operators: ['Megafon', 'Tele2'] },
      { id: 'facebook', name: 'Facebook', price: 1.89, operators: ['MTS', 'Beeline', 'Megafon', 'Tele2'] },
      { id: 'google', name: 'Google', price: 1.59, operators: ['MTS', 'Beeline'] },
      { id: 'instagram', name: 'Instagram', price: 1.79, operators: ['Megafon', 'Tele2'] },
      { id: 'twitter', name: 'Twitter', price: 1.39, operators: ['MTS', 'Beeline'] },
      { id: 'tiktok', name: 'TikTok', price: 1.69, operators: ['Megafon', 'Tele2'] }
    ];

    try {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/5sim/services?country=${countryCode}`, {
          headers: { 'Authorization': `Bearer ${FIVESIM_API_KEY}` },
          timeout: 5000
        });
        
        if (response.data && response.data.services) {
          setServices(response.data.services);
          setOperators(response.data.operators || []);
          setServicePrices(response.data.prices || {});
        } else {
          setServices(mockServices);
          setOperators(['MTS', 'Beeline', 'Megafon', 'Tele2']);
        }
      } catch (error) {
        console.warn('Using mock service data');
        setServices(mockServices);
        setOperators(['MTS', 'Beeline', 'Megafon', 'Tele2']);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      setServices(mockServices);
      setOperators(['MTS', 'Beeline', 'Megafon', 'Tele2']);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNumber = async () => {
    if (!selectedService) {
      alert('Please select a service');
      return;
    }

    const servicePrice = selectedService.price || 1.00;

    if (userData.wallet < servicePrice) {
      alert(`Insufficient balance. Please fund your wallet first. Required: $${servicePrice.toFixed(2)}`);
      return;
    }

    setLoading(true);
    
    // Mock purchase
    setTimeout(() => {
      const mockPhone = `+${Math.floor(Math.random() * 10000000000)}`.substring(0, 13);
      const newWallet = userData.wallet - servicePrice;
      
      // Create mock active number
      const newNumber = {
        id: Date.now().toString(),
        phoneNumber: mockPhone,
        country: selectedCountryData?.name || selectedCountry,
        service: selectedService.name,
        operator: selectedOperator || 'Any',
        price: servicePrice,
        purchasedAt: new Date(),
        status: 'active'
      };
      
      setActiveNumbers([newNumber, ...activeNumbers]);
      setUserData({ ...userData, wallet: newWallet });
      
      // Send Telegram notification if linked
      if (telegramLinked) {
        sendTelegramNotification('order', {
          phoneNumber: mockPhone,
          service: selectedService.name,
          price: servicePrice
        });
      }
      
      alert(`✅ Number purchased successfully: ${mockPhone}`);
      setCurrentPage('dashboard');
      setSelectedService(null);
      setSelectedOperator('');
      setLoading(false);
    }, 1500);
  };

  const handleCheckSMS = async (numberId, phoneNumber) => {
    setCheckingSms(true);
    
    // Mock SMS messages
    const mockMessages = [
      { date: new Date(), text: 'Your verification code is: 123456' },
      { date: new Date(Date.now() - 3600000), text: 'Welcome to the service!' }
    ];
    
    setTimeout(() => {
      setSelectedNumber(phoneNumber);
      setSmsMessages(mockMessages);
      setCheckingSms(false);
    }, 1000);
  };

  // ==================== PAYSTACK INTEGRATION ====================
  const handlePaystackPayment = () => {
    if (!amount || parseFloat(amount) < 1) {
      alert('Please enter a valid amount (minimum $1)');
      return;
    }
    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }

    if (!window.PaystackPop) {
      alert('Payment system loading. Please try again in a moment.');
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => {
        setTimeout(() => handlePaystackPayment(), 500);
      };
      document.body.appendChild(script);
      return;
    }

    setPaymentLoading(true);

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: currentUser.email,
      amount: parseFloat(amount) * 100,
      currency: currency,
      ref: 'PSH-' + Math.floor(Math.random() * 1000000000) + 1,
      metadata: {
        custom_fields: [
          {
            display_name: "Phone Number",
            variable_name: "phone_number",
            value: phoneNumber
          }
        ]
      },
      callback: async (response) => {
        await verifyPayment(response.reference, parseFloat(amount), currency);
        setPaymentLoading(false);
      },
      onClose: () => {
        setPaymentLoading(false);
        alert('Payment window closed');
      }
    });
    handler.openIframe();
  };

  const verifyPayment = async (txId, amount, currency) => {
    try {
      // Mock successful payment
      const newWallet = (userData.wallet || 0) + amount;
      
      // Save transaction to Firestore
      try {
        await addDoc(collection(db, 'transactions'), {
          uid: currentUser.uid,
          amount,
          currency,
          txId,
          type: 'credit',
          status: 'success',
          createdAt: serverTimestamp()
        });
      } catch (firestoreError) {
        console.warn('Could not save transaction to Firestore');
      }

      setUserData({ ...userData, wallet: newWallet });
      
      // Send Telegram notification if linked
      if (telegramLinked) {
        sendTelegramNotification('wallet', {
          amount,
          newBalance: newWallet
        });
      }

      alert(`✅ Wallet funded successfully with $${amount} ${currency}`);
      setAmount('');
      setPhoneNumber('');
      setCurrency('USD');
      await loadTransactions(currentUser);
      
    } catch (error) {
      console.error('Payment verification error:', error);
      alert('Error processing payment: ' + error.message);
    }
  };

  // ==================== TELEGRAM INTEGRATION ====================
  const handleLinkTelegram = async () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setTelegramCode(code);
    setShowTelegramModal(true);
    setTelegramLoading(false);

    try {
      await setDoc(doc(db, 'telegramLinks', code), {
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false
      });
    } catch (error) {
      console.warn('Could not save telegram link');
    }
  };

  const verifyTelegramLink = async () => {
    setTelegramLoading(true);
    
    // Mock verification
    setTimeout(() => {
      setTelegramLinked(true);
      setShowTelegramModal(false);
      setTelegramLoading(false);
      alert('✅ Telegram account linked successfully!');
      
      // Update user record
      try {
        updateDoc(doc(db, 'users', currentUser.uid), {
          telegramId: 'mock_telegram_id',
          telegramLinked: true
        });
      } catch (error) {
        console.warn('Could not update telegram status');
      }
    }, 1500);
  };

  const sendTelegramNotification = async (type, data) => {
    try {
      await axios.post(`${BACKEND_URL}/api/telegram/notify/${currentUser.uid}`, {
        type,
        data
      });
    } catch (error) {
      console.warn('Could not send Telegram notification');
    }
  };

  // ==================== AUTH FUNCTIONS ====================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (onNavigate) {
        onNavigate('home');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  // ==================== RENDER FUNCTIONS ====================
  const renderDashboardContent = () => (
    <>
      {/* Welcome Card */}
      <div className="dashboard-welcome-card">
        <div className="dashboard-welcome-content">
          <h1>Welcome back, <span className="user-name">{userData.fullName}</span>! 👋</h1>
          <p>Select a country below to get started with virtual numbers</p>
        </div>
        <div className="dashboard-wallet-info">
          <div className="dashboard-wallet-balance">
            <span className="label">Wallet Balance</span>
            <span className="amount">${(userData.wallet || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Country Selection Grid */}
      <div className="dashboard-country-selection">
        <h2>🌍 Choose a Country</h2>
        {loading ? (
          <div className="dashboard-loading">Loading countries...</div>
        ) : (
          <div className="dashboard-countries-grid">
            {countries.map(country => (
              <div 
                key={country.code} 
                className="dashboard-country-card"
                onClick={() => handleCountrySelect(country)}
              >
                <span className="dashboard-country-flag">{country.image}</span>
                <span className="dashboard-country-name">{country.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="dashboard-recent-activity">
        <h2>📊 Recent Activity</h2>
        <div className="dashboard-activity-cards">
          <div className="dashboard-activity-card">
            <h3>Active Numbers</h3>
            <p className="stat">{activeNumbers.length}</p>
          </div>
          <div className="dashboard-activity-card">
            <h3>Transactions</h3>
            <p className="stat">{transactions.length}</p>
          </div>
          <div className="dashboard-activity-card">
            <h3>Telegram</h3>
            <p className="stat">{telegramLinked ? '✅ Connected' : '❌ Not Connected'}</p>
          </div>
        </div>
      </div>
    </>
  );

  const renderServiceContent = () => (
    <div className="dashboard-service-page">
      <button className="dashboard-back-button" onClick={() => setCurrentPage('dashboard')}>
        ← Back to Countries
      </button>
      
      <div className="dashboard-selected-country-header">
        <span className="dashboard-country-flag-large">{selectedCountryData?.image}</span>
        <h2>{selectedCountryData?.name}</h2>
      </div>

      <div className="service-selection-container">
        <h3>Select a Service</h3>
        
        <div className="form-group">
          <label>Operator (Optional)</label>
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            className="dashboard-select"
          >
            <option value="">Any Operator</option>
            {operators.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="dashboard-loading">Loading services...</div>
        ) : (
          <>
            <div className="dashboard-services-grid">
              {services.map(service => (
                <div 
                  key={service.id || service} 
                  className={`dashboard-service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
                  onClick={() => setSelectedService(service)}
                >
                  <h4>{service.name || service}</h4>
                  <p className="dashboard-service-price">
                    ${typeof service === 'object' ? service.price.toFixed(2) : (servicePrices[service] || '1.00')}
                  </p>
                  <button className="dashboard-select-service-btn">Select</button>
                </div>
              ))}
            </div>

            {selectedService && (
              <div className="dashboard-purchase-section">
                <button 
                  className="dashboard-purchase-btn"
                  onClick={handleBuyNumber}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : `Buy Number for $${selectedService.price?.toFixed(2) || '1.00'}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Price Table */}
      <div className="dashboard-price-table">
        <h3>📋 Service Prices</h3>
        <table>
          <thead>
            <tr>
              <th>SERVICE</th>
              <th>PRICE</th>
            </tr>
          </thead>
          <tbody>
            {services.map(service => (
              <tr key={service.id || service}>
                <td>{service.name || service}</td>
                <td>${typeof service === 'object' ? service.price.toFixed(2) : (servicePrices[service] || '1.00')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-menu-icon" onClick={() => setSidebarOpen(true)}>☰</div>
        <div className="dashboard-logo">
          <img src="/hero.png" alt={APP_NAME} />
          <span>{APP_NAME}</span>
        </div>
        <div className="dashboard-header-right">
          <button className="dashboard-wallet-btn">
            💰 ${(userData.wallet || 0).toFixed(2)}
          </button>
          <div className="user-menu">
            <button className="dashboard-profile-btn">
              {userData.fullName?.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="dashboard-close-btn" onClick={() => setSidebarOpen(false)}>✕</div>
        <div className="dashboard-sidebar-header">
          <img src="/hero.png" alt={APP_NAME} />
          <h3>{APP_NAME}</h3>
        </div>
        <nav>
          <ul>
            <li className={currentPage === 'dashboard' ? 'active' : ''}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation('dashboard'); }}>
                <span>🏠</span>Dashboard
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation('buy-numbers'); }}>
                <span>📱</span>Buy Number
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation('usa-numbers'); }}>
                <span>🇺🇸</span>Buy USA Number
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation('my-orders'); }}>
                <span>📦</span>My Orders 
                {activeNumbers.length > 0 && <span className="dashboard-badge">{activeNumbers.length}</span>}
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation('transactions'); }}>
                <span>💳</span>My Transactions 
                {transactions.length > 0 && <span className="dashboard-badge">{transactions.length}</span>}
              </a>
            </li>
            <li className="divider"></li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation('support'); }}>
                <span>❓</span>Support
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                <span>🚪</span>Logout
              </a>
            </li>
          </ul>
        </nav>

        <div className="dashboard-sidebar-telegram">
          {!telegramLinked ? (
            <button className="dashboard-telegram-link-btn" onClick={handleLinkTelegram}>
              <span>🤖</span> Connect Telegram
            </button>
          ) : (
            <div className="dashboard-telegram-connected">
              <span>✅</span> Telegram Connected
            </div>
          )}
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="dashboard-overlay show" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className="dashboard-main-content">
        {error && (
          <div className="dashboard-error">
            ⚠️ {error}
          </div>
        )}
        
        {currentPage === 'dashboard' && renderDashboardContent()}
        {currentPage === 'service-selection' && renderServiceContent()}
        
        {currentPage === 'my-orders' && (
          <div className="dashboard-orders-page">
            <h2>📦 My Orders</h2>
            {activeNumbers.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>No active numbers yet</p>
                <button 
                  className="dashboard-btn-primary"
                  onClick={() => setCurrentPage('dashboard')}
                >
                  Buy Your First Number
                </button>
              </div>
            ) : (
              <div className="dashboard-orders-grid">
                {activeNumbers.map(number => (
                  <div key={number.id} className="dashboard-order-card">
                    <div className="dashboard-order-header">
                      <span className="dashboard-order-number">{number.phoneNumber}</span>
                      <span className="dashboard-order-status">Active</span>
                    </div>
                    <div className="dashboard-order-details">
                      <p><strong>Service:</strong> {number.service}</p>
                      <p><strong>Country:</strong> {number.country}</p>
                      <p><strong>Operator:</strong> {number.operator}</p>
                      <p><strong>Price:</strong> ${number.price?.toFixed(2) || '1.00'}</p>
                      <p><strong>Date:</strong> {formatDate(number.purchasedAt)}</p>
                    </div>
                    <button 
                      className="dashboard-check-sms-btn"
                      onClick={() => handleCheckSMS(number.id, number.phoneNumber)}
                      disabled={checkingSms}
                    >
                      {checkingSms ? 'Checking...' : 'Check SMS'}
                    </button>
                    {selectedNumber === number.phoneNumber && smsMessages.length > 0 && (
                      <div className="dashboard-sms-messages">
                        <h4>SMS Messages:</h4>
                        {smsMessages.map((msg, idx) => (
                          <div key={idx} className="dashboard-sms-item">
                            <div className="dashboard-sms-date">{formatDate(msg.date)}</div>
                            <div className="dashboard-sms-text">{msg.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {currentPage === 'transactions' && (
          <div className="dashboard-transactions-page">
            <h2>💳 My Transactions</h2>
            {transactions.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>No transactions yet</p>
                <button 
                  className="dashboard-btn-primary"
                  onClick={() => setCurrentPage('dashboard')}
                >
                  Fund Your Wallet
                </button>
              </div>
            ) : (
              <div className="dashboard-transactions-table">
                <table>
                  <thead>
                    <tr>
                      <th>REFERENCE</th>
                      <th>AMOUNT</th>
                      <th>CURRENCY</th>
                      <th>TYPE</th>
                      <th>STATUS</th>
                      <th>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id}>
                        <td>{tx.txId?.slice(0, 8) || 'N/A'}...</td>
                        <td>${tx.amount?.toFixed(2) || '0.00'}</td>
                        <td>{tx.currency || 'USD'}</td>
                        <td>
                          <span className={`dashboard-type-badge ${tx.type}`}>
                            {tx.type || 'credit'}
                          </span>
                        </td>
                        <td>
                          <span className={`dashboard-status-badge ${tx.status || 'success'}`}>
                            {tx.status || 'Completed'}
                          </span>
                        </td>
                        <td>{formatDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {currentPage === 'buy-numbers' && renderServiceContent()}
        
        {currentPage === 'usa-numbers' && (
          <div className="dashboard-usa-page">
            <h2>🇺🇸 USA Numbers</h2>
            <p>Coming soon...</p>
          </div>
        )}
        
        {currentPage === 'support' && (
          <div className="dashboard-support-page">
            <h2>❓ Support</h2>
            <div className="support-content">
              <p>Contact us at: support@{APP_NAME.toLowerCase()}.com</p>
              <p>Telegram: @{APP_NAME}Bot</p>
            </div>
          </div>
        )}
      </main>

      {/* Fund Wallet Section */}
      <div className="dashboard-fund-section">
        <h3>💳 Fund Your Wallet</h3>
        <div className="dashboard-fund-form">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
          />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">🇺🇸 USD</option>
            <option value="NGN">🇳🇬 NGN</option>
            <option value="GHS">🇬🇭 GHS</option>
            <option value="KES">🇰🇪 KES</option>
            <option value="ZAR">🇿🇦 ZAR</option>
            <option value="EGP">🇪🇬 EGP</option>
          </select>
          <input
            type="tel"
            placeholder="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <button onClick={handlePaystackPayment} disabled={paymentLoading}>
            {paymentLoading ? 'Processing...' : '💳 Pay with Paystack'}
          </button>
        </div>
      </div>

      {/* Telegram Modal */}
      {showTelegramModal && (
        <div className="dashboard-modal">
          <div className="dashboard-modal-content">
            <h3>🔗 Connect Telegram</h3>
            <p>1. Open Telegram and search for <strong>@{APP_NAME}Bot</strong></p>
            <p>2. Start a chat and send this code:</p>
            <div className="dashboard-code-display">{telegramCode}</div>
            <p>3. Click verify after sending</p>
            <div className="dashboard-modal-actions">
              <button 
                className="dashboard-btn-primary" 
                onClick={verifyTelegramLink}
                disabled={telegramLoading}
              >
                {telegramLoading ? 'Verifying...' : 'Verify Connection'}
              </button>
              <button 
                className="dashboard-btn-secondary" 
                onClick={() => setShowTelegramModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;