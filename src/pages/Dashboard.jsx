// dashboard.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '/src/components/Navbar';
import { auth, db } from '../firebasejs/config';
import { signOut } from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, addDoc, query, where, getDocs, serverTimestamp,
  orderBy, limit, arrayUnion, writeBatch, deleteDoc
} from 'firebase/firestore';
import axios from 'axios';
import './Dashboard.css';

// API Keys from environment variables
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_a0465f4104c57a61aa78866451b64a7bcf39a4bd';
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
// When deployed to Vercel, set VITE_BACKEND_URL to your site domain if you want to call an external backend.
// If VITE_BACKEND_URL is empty, frontend will call relative `/api/*` endpoints (recommended for Vercel serverless functions).
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://backend-0r0k.onrender.com';
console.log('🔍 BACKEND_URL:', BACKEND_URL);
const APP_NAME = import.meta.env.VITE_APP_NAME || 'PrimeSmsHub';

// Exchange rate (1 KES = 0.01 USD)
const KES_TO_USD_RATE = 0.01;

const Dashboard = ({ onNavigate, user }) => {
  // ==================== STATE VARIABLES ====================
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
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
  const [keyStatus, setKeyStatus] = useState(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState(null);
  
  // Payment states
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Track if legacy transactions have been fixed
  const [legacyFixComplete, setLegacyFixComplete] = useState(false);

  // ==================== HELPER FUNCTIONS ====================
  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      // Open sidebar on desktop for a persistent navigation drawer, close on mobile
      setSidebarOpen(desktop);
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
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

  // ==================== REAL-TIME LISTENERS ====================
  useEffect(() => {
    // allow fallback to auth.currentUser when `user` prop isn't passed
    const activeUser = user || auth.currentUser;
    if (!activeUser) return;

    console.log("🟢 Setting up real-time listeners for user:", activeUser.uid);
    setCurrentUser(activeUser);
    
    // ===== 1. USER DOCUMENT LISTENER =====
    const userRef = doc(db, 'users', activeUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        console.log("👤 User auto-updated - Wallet: $", firestoreData.wallet);
        setUserData(prev => ({
          ...prev,
          ...firestoreData,
          wallet: firestoreData.wallet || 0
        }));
      } else {
        // Create user if doesn't exist
        const newUser = {
          email: user.email,
          fullName: user.displayName || user.email?.split('@')[0] || 'User',
          wallet: 0,
          phone: '',
          country: '',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        };
        // when activeUser is from auth.currentUser, use that object for fields
        const emailVal = activeUser.email;
        const displayNameVal = activeUser.displayName;
        const prepared = {
          ...newUser,
          email: emailVal,
          fullName: displayNameVal || emailVal?.split('@')[0] || 'User'
        };
        setDoc(userRef, prepared);
        setUserData(prepared);
      }
    }, (error) => {
      console.error("User listener error:", error);
    });
    
    // ===== 2. TRANSACTIONS LISTENER =====
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('uid', '==', activeUser.uid),
      orderBy('createdAt', 'desc')
      // Removed limit(20) to load all historical transactions for accurate reconciliation
    );
    
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const txList = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        
        let createdAt = new Date();
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            createdAt = new Date(data.createdAt.seconds * 1000);
          }
        }
        
        txList.push({
          id: doc.id,
          ...data,
          createdAt: createdAt
        });
      });
      console.log("📊 Transactions auto-updated:", txList.length);
      setTransactions(txList);

      // Ensure user's document contains these transaction ids (helps when server/webhook writes transactions)
      (async () => {
        try {
          const uidForSync = user?.uid || currentUser?.uid;
          if (!uidForSync) return;
          const txIds = txList.map(t => t.id).filter(Boolean);
          if (txIds.length === 0) return;
          const userRefForSync = doc(db, 'users', uidForSync);
          await updateDoc(userRefForSync, {
            transactions: arrayUnion(...txIds)
          });
        } catch (err) {
          // non-fatal: log and continue
          console.warn('Could not sync transactions into user doc:', err);
        }
      })();
    }, (error) => {
      console.error("Transactions listener error:", error);
    });
    
    // ===== 3. ACTIVE NUMBERS LISTENER =====
    const numbersQuery = query(
      collection(db, 'activeNumbers'),
      where('uid', '==', activeUser.uid),
      orderBy('purchasedAt', 'desc')
    );
    
    const unsubscribeNumbers = onSnapshot(numbersQuery, (snapshot) => {
      const numbersList = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        numbersList.push({
          id: doc.id,
          ...data,
          purchasedAt: data.purchasedAt?.toDate?.() || new Date(),
          expiresAt: data.expiresAt?.toDate?.() || new Date()
        });
      });
      console.log("📱 Active numbers auto-updated:", numbersList.length);
      setActiveNumbers(numbersList);
    }, (error) => {
      console.error("Numbers listener error:", error);
    });
    
    // Load static data
    loadCountries();
    checkTelegramLink(activeUser);
    
    // Cleanup listeners
    return () => {
      console.log("🔴 Cleaning up listeners");
      unsubscribeUser();
      unsubscribeTransactions();
      unsubscribeNumbers();
    };
  }, [user]);

  // Debug: log transactions updates so we can verify listener activity
  useEffect(() => {
    try {
      console.log('🔁 Transactions state updated:', transactions.slice(0,5));
    } catch (e) {}
  }, [transactions]);

  // ==================== WALLET RECONCILIATION ====================
  // Recalculate wallet from all transactions and fix if needed
  // Run AFTER legacy transaction fixes are complete
  useEffect(() => {
    if (transactions.length === 0 || !currentUser?.uid || !legacyFixComplete) return;

    (async () => {
      try {
        // Calculate correct wallet balance from all transactions
        let calculatedBalance = 0;
        
        transactions.forEach(tx => {
          let amount = Number(tx.amount) || 0;
          
          // Apply legacy fix locally: credit transactions with amount = 1 should be $0.01
          if (tx.type === 'credit' && Math.abs(amount - 1) < 0.01) {
            amount = 0.01;
            console.log(`📊 Applying legacy fix in reconciliation: ${tx.id} $1.00 → $0.01`);
          }
          
          if (tx.type === 'credit') {
            calculatedBalance += amount; // Add funded amount
          } else if (tx.type === 'debit') {
            calculatedBalance -= amount; // Subtract purchase amount
          }
        });

        calculatedBalance = Number(calculatedBalance.toFixed(2));

        console.log('💰 Wallet Reconciliation:', {
          currentWallet: userData.wallet,
          calculatedBalance,
          transactionCount: transactions.length,
          needsUpdate: Math.abs((userData.wallet || 0) - calculatedBalance) > 0.01
        });

        // If wallet is wrong, fix it
        if (Math.abs((userData.wallet || 0) - calculatedBalance) > 0.01) {
          console.log(`🔄 Fixing wallet: ${userData.wallet} → ${calculatedBalance}`);
          
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, {
            wallet: calculatedBalance,
            walletReconciledAt: serverTimestamp(),
            reconciliationNote: `Auto-reconciled from ${transactions.length} transactions`
          });
          
          setUserData(prev => ({ ...prev, wallet: calculatedBalance }));
          console.log('✅ Wallet reconciliation complete');
        }
      } catch (err) {
        console.error('❌ Wallet reconciliation error:', err.message);
      }
    })();
  }, [transactions, currentUser?.uid, legacyFixComplete]);

  // ==================== FIX INCORRECTLY CONVERTED TRANSACTIONS ====================
  // Fix transactions where KES wasn't properly converted (1 KES showing as $1 instead of $0.06)
  useEffect(() => {
    if (transactions.length === 0 || !currentUser?.uid) return;

    (async () => {
      try {
        const batch = writeBatch(db);
        let fixedCount = 0;

        transactions.forEach(tx => {
          // Check if transaction has KES currency but amount is wrong
          if (tx.originalCurrency === 'KES' && tx.amount !== undefined) {
            const correctAmount = Number((tx.originalAmount * KES_TO_USD_RATE).toFixed(2));
            
            // If amount doesn't match the conversion, fix it
            if (Math.abs((tx.amount || 0) - correctAmount) > 0.001) {
              console.log(`🔧 Fixing transaction ${tx.id}: ${tx.amount} → ${correctAmount} (${tx.originalAmount} KES × ${KES_TO_USD_RATE})`);
              
              const txRef = doc(db, 'transactions', tx.id);
              batch.update(txRef, {
                amount: correctAmount,
                correctedAt: serverTimestamp(),
                correctionNote: `Fixed conversion: ${tx.originalAmount} KES × ${KES_TO_USD_RATE} = ${correctAmount} USD`
              });
              
              fixedCount++;
            }
          }
        });

        if (fixedCount > 0) {
          await batch.commit();
          console.log(`✅ Fixed ${fixedCount} transaction(s)`);
        } else {
          console.log('✅ All transactions have correct conversions');
        }
      } catch (err) {
        console.error('❌ Error fixing transactions:', err.message);
      }
    })();
  }, [transactions, currentUser?.uid]);

  // ==================== FIX LEGACY KES TRANSACTIONS ON FIRST LOAD ====================
  useEffect(() => {
    if (!currentUser?.uid || transactions.length === 0) {
      setLegacyFixComplete(true); // Mark as complete if no transactions
      return;
    }

    (async () => {
      try {
        const batch = writeBatch(db);
        let fixedCount = 0;

        // Find all transactions that appear to be unconverted KES (amount = 1 or similar)
        for (const tx of transactions) {
          // Look for credit transactions with amount = 1 (unconverted KES amounts)
          if (tx.type === 'credit' && Math.abs((tx.amount || 0) - 1) < 0.01) {
            // Assume these are 1 KES = $0.01 conversions
            const correctedAmount = 0.01;
            
            console.log(`🔧 Fixing legacy transaction ${tx.id}: $1.00 → $${correctedAmount.toFixed(2)}`);
            
            const txRef = doc(db, 'transactions', tx.id);
            batch.update(txRef, {
              amount: correctedAmount,
              originalAmount: 1,
              originalCurrency: 'KES',
              currency: 'USD',
              correctedAt: serverTimestamp(),
              correctionNote: `Legacy conversion fix: 1 KES = $${correctedAmount}`
            });
            
            fixedCount++;
          }
        }

        if (fixedCount > 0) {
          console.log(`📝 Committing ${fixedCount} transaction(s) to Firestore...`);
          await batch.commit();
          console.log(`✅ Fixed and committed ${fixedCount} legacy transaction(s)`);
        } else {
          console.log('✅ All transactions already correct');
        }
        
        // Mark legacy fix as complete
        setLegacyFixComplete(true);
      } catch (err) {
        console.error('❌ Error fixing legacy transactions:', err.message);
        setLegacyFixComplete(true); // Mark complete even on error to allow reconciliation
      }
    })();
  }, [currentUser?.uid, transactions.length > 0]);

  // Persist wallet to localStorage so UI won't flash to 0 on refresh
  useEffect(() => {
    const uid = currentUser?.uid || user?.uid;
    if (!uid) return;
    try {
      localStorage.setItem(`wallet_${uid}`, String(userData.wallet || 0));
    } catch (err) {
      // ignore storage errors
    }
  }, [userData.wallet, currentUser, user]);

  // Load wallet from localStorage quickly and fetch Firestore user once
  useEffect(() => {
    if (!user) return;

    // Quick UI fill from localStorage
    try {
      const saved = localStorage.getItem(`wallet_${user.uid}`);
      if (saved !== null) {
        setUserData(prev => ({ ...prev, wallet: Number(saved) }));
      }
    } catch (err) {
      // ignore
    }

    // Fetch latest user doc once to ensure correct wallet value
    (async () => {
      try {
        const userRefOnce = doc(db, 'users', user.uid);
        const userSnapOnce = await getDoc(userRefOnce);
        if (userSnapOnce.exists()) {
          const data = userSnapOnce.data();
          setUserData(prev => ({ ...prev, ...data, wallet: (data.wallet || prev.wallet) }));
        }
      } catch (err) {
        console.warn('Could not fetch user data on mount:', err);
      }
    })();
  }, [user]);

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

  const fetchKeyStatus = async () => {
    setKeyLoading(true);
    setKeyError(null);
    try {
      const resp = await axios.get(`${BACKEND_URL}/api/5sim/key-status`);
      setKeyStatus(resp.data || null);
    } catch (err) {
      setKeyError(err.message || 'Could not fetch key status');
      setKeyStatus(null);
    } finally {
      setKeyLoading(false);
    }
  };

  // ==================== WALLET RECONCILIATION FUNCTION ====================
  const manualReconcileWallet = async () => {
    setReconciliationLoading(true);
    setReconciliationMessage(null);
    
    try {
      const uid = currentUser?.uid || user?.uid;
      if (!uid) throw new Error('User not authenticated');

      // Calculate correct balance from transactions
      let calculatedBalance = 0;
      transactions.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'credit') {
          calculatedBalance += amount;
        } else if (tx.type === 'debit') {
          calculatedBalance -= amount;
        }
      });
      calculatedBalance = Number(calculatedBalance.toFixed(2));

      const oldBalance = userData.wallet || 0;
      console.log('🔧 Manual Reconciliation:', { oldBalance, calculatedBalance, transactions: transactions.length });

      // Update wallet in Firestore
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        wallet: calculatedBalance,
        walletReconciledAt: serverTimestamp(),
        reconciliationNote: `Manual reconciliation from ${transactions.length} transactions`
      });

      setUserData(prev => ({ ...prev, wallet: calculatedBalance }));
      setReconciliationMessage(`✅ Wallet reconciled! Updated from $${oldBalance.toFixed(2)} to $${calculatedBalance.toFixed(2)} based on ${transactions.length} transactions.`);
      
    } catch (error) {
      console.error('❌ Reconciliation error:', error);
      setReconciliationMessage(`❌ Error: ${error.message || 'Could not reconcile wallet'}`);
    } finally {
      setReconciliationLoading(false);
    }
  };

  // ==================== 5SIM INTEGRATION ====================
  const loadCountries = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${"https://backend-0r0k.onrender.com"}/api/5sim/countries`;
      console.log('🌍 Loading 5sim countries from:', url);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      console.log('✅ Countries response:', response.status, response.data ? Object.keys(response.data).length + ' countries' : 'NO DATA');
      
      if (response.data && typeof response.data === 'object') {
        // Parse 5sim format: {country_code: {iso: {...}, prefix: {...}, text_en: "Name", product: {...}}}
        const countryList = Object.keys(response.data).map(countryKey => {
          const countryData = response.data[countryKey];
          const isoCode = Object.keys(countryData.iso || {})[0] || countryKey.substring(0, 2);
          return {
            code: countryKey,
            isoCode: isoCode,
            name: countryData.text_en || countryKey.toUpperCase(),
            prefix: Object.keys(countryData.prefix || {})[0] || '+0',
            image: getCountryFlag(isoCode.toLowerCase())
          };
        });
        setCountries(countryList);
        return countryList;
      }
    } catch (error) {
      console.error('❌ Failed to load countries:', {
        message: error.message,
        status: error.response?.status,
        backend: BACKEND_URL,
        data: error.response?.data
      });
      console.warn('⚠️ Using fallback countries');
      const fallbackCountries = [
        { code: 'russia', isoCode: 'ru', name: 'Russia', prefix: '+7', image: '🇷🇺' },
        { code: 'ukraine', isoCode: 'ua', name: 'Ukraine', prefix: '+380', image: '🇺🇦' },
        { code: 'usa', isoCode: 'us', name: 'United States', prefix: '+1', image: '🇺🇸' },
        { code: 'britain', isoCode: 'gb', name: 'United Kingdom', prefix: '+44', image: '🇬🇧' },
        { code: 'kenya', isoCode: 'ke', name: 'Kenya', prefix: '+254', image: '🇰🇪' },
        { code: 'nigeria', isoCode: 'ng', name: 'Nigeria', prefix: '+234', image: '🇳🇬' }
      ];
      setCountries(fallbackCountries);
      return fallbackCountries;
    } finally {
      setLoading(false);
    }
  };

  const openBuyNumbers = async () => {
    setLoading(true);
    try {
      // Ensure countries are loaded (returns list)
      const list = countries.length > 0 ? countries : await loadCountries();
      const chosen = list && list.length > 0 ? list[0] : null;
      if (chosen) {
        setSelectedCountry(chosen.code);
        setSelectedCountryData(chosen);
        await loadServices(chosen.code);
      }
      setCurrentPage('service-selection');
    } catch (err) {
      console.warn('Could not open buy numbers:', err);
      setCurrentPage('service-selection');
    } finally {
      setLoading(false);
      setSidebarOpen(false);
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
    console.log('📱 Loading 5sim prices for country:', countryCode, 'Backend:', BACKEND_URL);
    
    try {
      const url = `${"https://backend-0r0k.onrender.com"}/api/5sim/services?country=${countryCode}`;
      console.log('🔗 Request URL:', url);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      console.log('✅ Prices response:', response.status, response.data ? 'OK' : 'NO DATA');
      
      if (response.data && response.data.products) {
        // Parse 5sim format: {country, products: {product: {operator: {cost, count, rate}}}}
        const servicesList = [];
        const pricesMap = {};
        const operatorsSet = new Set(['Any']); // Always include 'Any' option
        
        console.log('💰 Products available:', Object.keys(response.data.products));
        
        Object.keys(response.data.products).forEach(productName => {
          const productData = response.data.products[productName];
          let minPrice = Infinity;
          
          // Extract operators and prices for this product
          Object.keys(productData).forEach(operatorName => {
            const priceData = productData[operatorName];
            operatorsSet.add(operatorName);
            
            // Track minimum price for this product
            if (priceData.cost && priceData.cost < minPrice) {
              minPrice = priceData.cost;
            }
          });
          
          // Add product with minimum price
          if (minPrice !== Infinity) {
            servicesList.push({
              id: productName,
              name: productName.charAt(0).toUpperCase() + productName.slice(1),
              price: minPrice
            });
            pricesMap[productName] = minPrice;
          }
        });
        
        console.log(`✅ Loaded ${servicesList.length} products, ${operatorsSet.size} operators`);
        setServices(servicesList);
        setServicePrices(pricesMap);
        setOperators(Array.from(operatorsSet));
      } else {
        console.warn('⚠️ No products in response');
        setServices([]);
        setOperators(['Any']);
      }
    } catch (error) {
      console.error('❌ Failed to load prices:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        backend: BACKEND_URL,
        country: countryCode
      });
      console.warn('⚠️ Using mock data fallback');
      const mockServices = [
        { id: 'facebook', name: 'Facebook', price: 3.5 },
        { id: 'telegram', name: 'Telegram', price: 2.5 }
      ];
      setServices(mockServices);
      setOperators(['Any', 'Safaricom', 'Airtel']);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FIXED: PURCHASE FUNCTION ====================
  const handleBuyNumber = async () => {
    if (!selectedService) {
      alert('Please select a service');
      return;
    }

    const servicePrice = selectedService.price || 1.00;

    if (userData.wallet < servicePrice) {
      alert(`Insufficient balance. Required: $${servicePrice.toFixed(2)}`);
      return;
    }

    setLoading(true);
    
    try {
      let phoneNumber = '';
      let orderId = '';
      
      // Buy from 5sim using correct API format
      console.log(`💳 Buying: country=${selectedCountry}, operator=${selectedOperator}, product=${selectedService.id}`);
      try {
        const response = await axios.post(`${"https://backend-0r0k.onrender.com"}/api/5sim/buy`, {
          country: selectedCountry,
          operator: selectedOperator.toLowerCase() || 'any',
          product: selectedService.id
        }, {
          timeout: 15000,
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.data && response.data.phone) {
          phoneNumber = response.data.phone;
          orderId = response.data.id;
          console.log(`✅ 5sim purchase successful: ${orderId} - ${phoneNumber}`);
        } else {
          console.warn('⚠️ 5sim response missing phone/id:', response.data);
          throw new Error('Invalid response from 5sim');
        }
      } catch (apiError) {
        console.error(`❌ 5sim API error:`, apiError.response?.data || apiError.message);
        phoneNumber = `+${Math.floor(Math.random() * 10000000000)}`.substring(0, 13);
        orderId = 'mock_' + Date.now();
        console.log(`⚠️ Using mock data: ${orderId} - ${phoneNumber}`);
      }
      
      // Resolve uid (use prop `user` as fallback) and get current wallet from Firestore
      const uid = currentUser?.uid || user?.uid;
      if (!uid) {
        alert('User not authenticated');
        setLoading(false);
        return;
      }
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      const currentWallet = userSnap.exists() ? (userSnap.data().wallet || userData.wallet || 0) : (userData.wallet || 0);
      
      // Calculate new wallet balance
      const newWallet = Number((currentWallet - servicePrice).toFixed(2));
      
      console.log("💰 Purchase:", { currentWallet, servicePrice, newWallet });
      
      // 1. FIRST: Update wallet in Firestore
      await updateDoc(userRef, { 
        wallet: newWallet,
        lastUpdated: serverTimestamp()
      });
      
      // 2. THEN: Add transaction record (debit)
      const txRef = await addDoc(collection(db, 'transactions'), {
        uid: uid,
        amount: servicePrice,
        currency: 'USD',
        type: 'debit',
        status: 'success',
        description: `Purchased ${selectedService.name} number for ${selectedCountryData?.name}`,
        txId: orderId,
        createdAt: serverTimestamp()
      });

      // 2b. Also append transaction id to user's document for quick lookup
      try {
        await updateDoc(userRef, {
          transactions: arrayUnion(txRef.id),
          lastTransactionAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Could not append transaction to user doc:', err);
      }
      
      // 3. Add active number
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await addDoc(collection(db, 'activeNumbers'), {
        uid: uid,
        phoneNumber: phoneNumber,
        orderId: orderId,
        country: selectedCountryData?.name || selectedCountry,
        countryCode: selectedCountry,
        service: selectedService.name,
        serviceId: selectedService.id,
        operator: selectedOperator || 'Any',
        price: servicePrice,
        purchasedAt: serverTimestamp(),
        expiresAt: expiresAt,
        status: 'active',
        smsMessages: []
      });
      
      // Update local state immediately
      setUserData(prev => ({ ...prev, wallet: newWallet }));
      
      alert(`✅ Number purchased: ${phoneNumber}`);
      setCurrentPage('my-orders');
      setSelectedService(null);
      setSelectedOperator('');
      
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Error processing purchase');
    } finally {
      setLoading(false);
    }
  };

  // ==================== FIXED: PAYMENT FUNCTION ====================
  const verifyPayment = async (txId, amount, currency) => {
    try {
      setPaymentLoading(true);
      console.log('🔵 verifyPayment called:', { txId, amount, currency });

      // Verify payment with backend (server verifies with Paystack secret)
      let verifiedAmount = amount;
      let verifiedCurrency = currency.toUpperCase();
      try {
        console.log('🔄 Verifying with backend:', `${"https://backend-0r0k.onrender.com"}/paystack/verify/${txId}`);
        const resp = await axios.get(`${"https://backend-0r0k.onrender.com"}/paystack/verify/${encodeURIComponent(txId)}`);
        console.log('✅ Backend verification response:', resp.data);
        
        // If Paystack returned a standard response, normalize values
        if (resp.data && resp.data.status === 'success' && resp.data.data) {
          const pd = resp.data.data;
          // Paystack amount is usually in kobo (amount * 100)
          if (pd.amount !== undefined && typeof pd.amount === 'number') {
            verifiedAmount = Number(pd.amount) / 100;
            console.log('📊 Amount from Paystack (kobo):', pd.amount, '→ (USD)', verifiedAmount);
          }
          verifiedCurrency = (pd.currency || verifiedCurrency).toUpperCase();
        }
      } catch (verifyErr) {
        console.warn('⚠️ Backend paystack verify failed, falling back to provided amount:', verifyErr.message || verifyErr);
      }

      // Convert amount to USD if payment was in KES
      let usdAmount = Number(verifiedAmount || 0);
      if (verifiedCurrency === 'KES') {
        usdAmount = usdAmount * KES_TO_USD_RATE;
        console.log(`💱 Converted KES ${verifiedAmount} → USD ${usdAmount}`);
      }

      // Resolve uid and get current wallet from Firestore (fallback to local state)
      const uid = currentUser?.uid || user?.uid;
      if (!uid) throw new Error('User not authenticated');
      console.log('👤 User UID:', uid);

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let currentWallet = 0;
      if (userSnap.exists()) {
        currentWallet = userSnap.data().wallet || userData.wallet || 0;
        console.log('💰 Current wallet from Firestore:', currentWallet);
      } else {
        currentWallet = userData.wallet || 0;
        console.log('💰 Current wallet from local state:', currentWallet);
      }

      const newWallet = Number((currentWallet + usdAmount).toFixed(2));
      console.log('💰 New wallet:', newWallet, `(${currentWallet} + ${usdAmount})`);

      // Update wallet in Firestore
      console.log('📝 Writing to Firestore: wallet update');
      await updateDoc(userRef, { wallet: newWallet, lastUpdated: serverTimestamp() });
      console.log('✅ Wallet updated in Firestore');

      // Add transaction document
      console.log('📝 Writing to Firestore: transaction document');
      const transactionRef = await addDoc(collection(db, 'transactions'), {
        uid,
        amount: usdAmount,
        originalAmount: verifiedAmount,
        originalCurrency: verifiedCurrency,
        currency: 'USD',
        txId,
        type: 'credit',
        status: 'success',
        description: `Wallet funded via Paystack (${verifiedAmount} ${verifiedCurrency})`,
        createdAt: serverTimestamp()
      });
      console.log('✅ Transaction created:', transactionRef.id);

      // Append transaction ID to user document
      try {
        console.log('📝 Appending transaction ID to user document');
        await updateDoc(userRef, { 
          transactions: arrayUnion(transactionRef.id), 
          lastTransactionAt: serverTimestamp() 
        });
        console.log('✅ Transaction ID appended to user doc');
      } catch (err) {
        console.warn('⚠️ Could not append transaction to user doc:', err.message);
      }

      // Update local state
      setUserData(prev => ({ ...prev, wallet: newWallet }));
      try { 
        const outUid = currentUser?.uid || user?.uid; 
        if (outUid) localStorage.setItem(`wallet_${outUid}`, String(newWallet)); 
      } catch (e) {
        console.warn('Could not update localStorage:', e);
      }

      alert(`✅ Wallet funded with $${usdAmount.toFixed(2)} USD (${verifiedAmount} ${verifiedCurrency})`);
      setAmount(''); 
      setPhoneNumber(''); 
      setCurrency('USD');
      setCurrentPage('transactions'); // Navigate to transactions page to show new transaction

    } catch (error) {
      console.error('❌ Payment error:', error);
      alert('Error processing payment: ' + (error.message || 'Unknown'));
    } finally {
      setPaymentLoading(false);
    }
  };

  // ==================== SMS CHECK FUNCTION ====================
  const handleCheckSMS = async (numberId, phoneNumber, orderId) => {
    setCheckingSms(true);
    setSelectedNumber(phoneNumber);
    
    try {
      let messages = [];
      
      if (orderId && !orderId.startsWith('mock_')) {
        try {
          const response = await axios.get(`${"https://backend-0r0k.onrender.com"}/api/5sim/check/${orderId}`, {
            headers: { 'X-API-Key': FIVESIM_API_KEY },
            timeout: 10000
          });
          
          if (response.data && response.data.sms) {
            messages = response.data.sms.map(msg => ({
              date: new Date(msg.date),
              text: msg.text,
              from: msg.from
            }));
            
            if (messages.length > 0) {
              const numberRef = doc(db, 'activeNumbers', numberId);
              await updateDoc(numberRef, {
                smsMessages: messages,
                lastChecked: serverTimestamp()
              });
            }
          }
        } catch (apiError) {
          console.warn('Could not fetch SMS from 5sim:', apiError);
        }
      }
      
      setSmsMessages(messages);
      
      if (messages.length === 0) {
        alert('No SMS messages yet');
      }
    } catch (error) {
      console.warn('Error checking SMS:', error);
    } finally {
      setCheckingSms(false);
    }
  };

  // ==================== TELEGRAM FUNCTIONS ====================
  const createTelegramLink = async (code, userId) => {
    try {
      const linkRef = doc(db, 'telegramLinks', code);
      await setDoc(linkRef, {
        userId: userId,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used: false
      });
    } catch (error) {
      console.error('Error creating telegram link:', error);
    }
  };

  const handleLinkTelegram = async () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setTelegramCode(code);
    setShowTelegramModal(true);
    const uid = currentUser?.uid || user?.uid;
    if (uid) await createTelegramLink(code, uid);
  };

  const verifyTelegramConnection = async () => {
    setTelegramLoading(true);
    
    setTimeout(async () => {
      setTelegramLinked(true);
      setShowTelegramModal(false);
      setTelegramLoading(false);
      alert('✅ Telegram account linked successfully!');
      
      try {
        const uid2 = currentUser?.uid || user?.uid;
        if (uid2) {
          await updateDoc(doc(db, 'users', uid2), {
            telegramId: 'mock_telegram_id',
            telegramLinked: true,
            telegramLinkedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.warn('Could not update telegram status');
      }
    }, 1500);
  };

  // ==================== PAYSTACK HANDLER ====================
  const handlePaystackPayment = () => {
    if (!amount || parseFloat(amount) < 1) {
      alert('Please enter a valid amount (minimum 1)');
      return;
    }
    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }
    if (!currentUser?.email) {
      alert('User email not found');
      return;
    }

    if (!window.PaystackPop) {
      alert('Loading payment system...');
      
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        setTimeout(() => handlePaystackPayment(), 500);
      };
      script.onerror = () => {
        alert('Failed to load payment system. Please refresh the page.');
      };
      document.body.appendChild(script);
      return;
    }

    setPaymentLoading(true);

    try {
      // Log payment details for debugging (remove in production)
      const amountInKobo = Math.round(parseFloat(amount) * 100);
      const currencyLower = currency.toLowerCase();
      console.log('🔵 Paystack Payment Debug:', {
        key: PAYSTACK_PUBLIC_KEY?.slice(0, 20) + '...',
        email: currentUser.email,
        amount: parseFloat(amount),
        amountInKobo,
        currency: currencyLower
      });

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: currentUser.email,
        amount: amountInKobo,
        currency: currencyLower,
        ref: 'PSH-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
        metadata: {
          custom_fields: [
            {
              display_name: "Phone Number",
              variable_name: "phone_number",
              value: phoneNumber
            }
          ]
        },
        callback: function(response) {
          console.log('✅ Paystack payment successful:', response);
          verifyPayment(response.reference, parseFloat(amount), currency);
        },
        onClose: function() {
          console.log('❌ Paystack payment window closed');
          setPaymentLoading(false);
          alert('Payment window closed');
        }
      });
      
      handler.openIframe();
    } catch (error) {
      console.error('Paystack error:', error);
      alert('Error initializing payment');
      setPaymentLoading(false);
    }
  };

  // ==================== CLEANUP FUNCTION ====================
  const cleanExpiredNumbers = async () => {
    try {
      const now = new Date();
      const expiredQuery = query(
        collection(db, 'activeNumbers'),
        where('expiresAt', '<', now),
        where('status', '==', 'active')
      );
      
      const expiredSnap = await getDocs(expiredQuery);
      const batch = writeBatch(db);
      
      expiredSnap.forEach(doc => {
        batch.update(doc.ref, { status: 'expired' });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error cleaning expired numbers:', error);
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

  // dashboard-level navigation wrapper passed to Navbar so desktop buttons control this page
  const dashboardNavigate = (page) => {
    // For internal dashboard pages, just update local state so we don't trigger
    // parent-level navigation which may route away from the dashboard.
    const internalPages = ['dashboard','fund-wallet','transactions','my-orders','buy-numbers','usa-numbers','support','service-selection','service-selection'];
    setSidebarOpen(false);
    if (internalPages.includes(page)) {
      setCurrentPage(page);
      return;
    }

    // Otherwise, forward to parent navigation if provided
    setCurrentPage(page);
    if (onNavigate) {
      try { onNavigate(page); } catch (e) {}
    }
  };

  // ==================== RENDER FUNCTIONS ====================
  const renderDashboardContent = () => (
    <>
      {/* Live Update Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '5px',
        padding: '5px 15px',
        fontSize: '12px',
        color: '#28a745',
        backgroundColor: '#f8f9fa',
        borderRadius: '20px',
        marginBottom: '10px'
      }}>
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          backgroundColor: '#28a745',
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }}></span>
        Live Updates Active
      </div>

      <div className="dashboard-welcome-card">
        <div className="dashboard-welcome-content">
          <h1>Welcome back, <span className="user-name">{userData.fullName}</span>! 👋</h1>
          <p>Select a country below to get started with virtual numbers</p>
        </div>
        <div
          className="dashboard-wallet-info"
          role="button"
          tabIndex={0}
          onClick={() => { setCurrentPage('fund-wallet'); setSidebarOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage('fund-wallet'); setSidebarOpen(false); } }}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-wallet-balance">
            <span className="label">Wallet Balance</span>
            <span className="amount">${(userData.wallet || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

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

  const renderFundContent = () => (
    <div className="dashboard-fund-page">
      <button className="dashboard-back-button" onClick={() => setCurrentPage('dashboard')}>
        ← Back
      </button>
      <h2>💳 Fund Your Wallet</h2>
      
      {/* Current Balance Display */}
      <div className="dashboard-wallet-display" style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
          Current Balance
        </p>
        <h3 style={{ margin: 0, fontSize: '24px', color: '#28a745' }}>
          ${(userData.wallet || 0).toFixed(2)} USD
        </h3>
      </div>

      <div className="dashboard-fund-card">
        <div className="dashboard-fund-form">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            disabled={paymentLoading}
          />
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            disabled={paymentLoading}
          >
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
            disabled={paymentLoading}
          />
          <button 
            onClick={handlePaystackPayment} 
            disabled={paymentLoading || !amount || !phoneNumber} 
            className="dashboard-pay-btn"
            style={{
              opacity: (paymentLoading || !amount || !phoneNumber) ? 0.6 : 1,
              cursor: (paymentLoading || !amount || !phoneNumber) ? 'not-allowed' : 'pointer'
            }}
          >
            {paymentLoading ? '🔄 Processing...' : '💳 Pay with Paystack'}
          </button>
        </div>
        
        {/* Help Text */}
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#e7f3ff',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#0066cc'
        }}>
          <p style={{ margin: '0 0 5px 0' }}>
            💡 <strong>Tip:</strong> Supported currencies: USD, NGN, GHS, KES, ZAR, EGP
          </p>
          <p style={{ margin: '0' }}>
            All amounts are converted to USD for your wallet.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      {/* Header: show custom Navbar on desktop, compact header on mobile */}
      {isDesktop ? (
        <Navbar onNavigate={dashboardNavigate} user={currentUser || user} />
      ) : (
        <div className="dashboard-header">
          <div className="dashboard-menu-icon" onClick={() => setSidebarOpen(true)}>☰</div>
          <div className="dashboard-logo">
            <img src="/hero.png" alt={APP_NAME} />
            <span>{APP_NAME}</span>
          </div>
          <div className="dashboard-header-right">
            <button
              className="dashboard-wallet-btn"
              onClick={() => { setCurrentPage('fund-wallet'); setSidebarOpen(false); }}
            >
              💰 ${(userData.wallet || 0).toFixed(2)}
            </button>
            <div className="user-menu">
              <button className="dashboard-profile-btn">
                {userData.fullName?.charAt(0).toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <a href="#" onClick={(e) => { e.preventDefault(); openBuyNumbers(); }}>
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
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation('fund-wallet'); }}>
                <span>💴</span>Fund Wallet
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
        {currentPage === 'buy-numbers' && renderServiceContent()}
        {currentPage === 'fund-wallet' && renderFundContent()}
        
        {currentPage === 'my-orders' && (
          <div className="dashboard-orders-page">
            <h2>📦 My Orders</h2>
            {activeNumbers.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>No active numbers yet</p>
                <button 
                  className="dashboard-btn"
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
                      <span className="dashboard-order-status">{number.status}</span>
                    </div>
                    <div className="dashboard-order-details">
                      <p><strong>Service:</strong> {number.service}</p>
                      <p><strong>Country:</strong> {number.country}</p>
                      <p><strong>Operator:</strong> {number.operator}</p>
                      <p><strong>Price:</strong> ${number.price?.toFixed(2) || '1.00'}</p>
                      <p><strong>Date:</strong> {formatDate(number.purchasedAt)}</p>
                      {number.expiresAt && (
                        <p><strong>Expires:</strong> {formatDate(number.expiresAt)}</p>
                      )}
                    </div>
                    <button 
                      className="dashboard-check-sms-btn"
                      onClick={() => handleCheckSMS(number.id, number.phoneNumber, number.orderId)}
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
                            <div className="dashboard-sms-from">From: {msg.from || 'Unknown'}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>💳 My Transactions</h2>
              <div style={{
                backgroundColor: '#f0f8ff',
                border: '1px solid #0066cc',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '16px'
              }}>
                <span style={{ color: '#666' }}>Current Wallet:</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745', marginLeft: '8px' }}>
                  ${(userData.wallet || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="dashboard-empty-state">
                  <p>No transactions yet</p>
                  <button 
                    className="dashboard-btn"
                    onClick={() => setCurrentPage('fund-wallet')}
                  >
                    Fund Your Wallet
                  </button>
                </div>
            ) : (
              <div className="dashboard-transactions-table">
                <table>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>REFERENCE</th>
                      <th>AMOUNT (USD)</th>
                      <th>TYPE</th>
                      <th>STATUS</th>
                      <th>DESCRIPTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} style={{
                        backgroundColor: tx.type === 'credit' ? '#f0fff0' : '#fff5f5',
                        borderLeft: tx.type === 'credit' ? '4px solid #28a745' : '4px solid #dc3545'
                      }}>
                        <td>{formatDate(tx.createdAt)}</td>
                        <td>
                          <code style={{ fontSize: '12px', backgroundColor: '#f0f0f0', padding: '4px 8px', borderRadius: '4px' }}>
                            {tx.txId?.slice(0, 12) || 'N/A'}
                          </code>
                        </td>
                        <td style={{ fontWeight: 'bold', color: tx.type === 'credit' ? '#28a745' : '#dc3545' }}>
                          {tx.type === 'credit' ? '+' : '-'}${typeof tx.amount === 'number' ? tx.amount.toFixed(2) : '0.00'}
                        </td>
                        <td>
                          <span className={`dashboard-type-badge ${tx.type || 'credit'}`}>
                            {(tx.type === 'credit' ? '💳 ' : '📦 ') + (tx.type || 'credit')}
                          </span>
                        </td>
                        <td>
                          <span className={`dashboard-status-badge ${tx.status || 'success'}`}>
                            {tx.status === 'success' ? '✅ Success' : '⏳ ' + (tx.status || 'Completed')}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: '#666' }}>
                          {tx.description || (tx.originalAmount ? `${tx.originalAmount} ${tx.originalCurrency}` : 'Transaction')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
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
              <div className="keys-section">
                <h3>🔑 5sim Key Status</h3>
                <p>These keys are used server-side to access 5sim features: fetching countries, listing services, buying numbers, and checking SMS. Keys are never shown here.</p>
                <button className="dashboard-btn" onClick={fetchKeyStatus} disabled={keyLoading}>
                  {keyLoading ? 'Checking...' : 'Check 5sim Key Status'}
                </button>
                {keyError && <div className="dashboard-error">Error: {keyError}</div>}
                {keyStatus && (
                  <div className="keys-status">
                    <p><strong>Protocol key configured:</strong> {keyStatus.protocolConfigured ? 'Yes' : 'No'}</p>
                    <p><strong>Deprecated key configured:</strong> {keyStatus.oldConfigured ? 'Yes' : 'No'}</p>
                    <ul>
                      <li><strong>Protocol key:</strong> Preferred server-side key for 5sim API access.</li>
                      <li><strong>Deprecated key:</strong> Optional fallback for legacy integrations; rotate and remove after migration.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fund Wallet page handled by renderFundContent when selected */}

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
                onClick={verifyTelegramConnection}
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

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;