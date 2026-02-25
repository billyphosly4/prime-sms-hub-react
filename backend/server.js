// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for your frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// ==================== 5SIM MOCK API ====================
const mockCountries = {
  ru: { name: 'Russia', image: '🇷🇺' },
  ua: { name: 'Ukraine', image: '🇺🇦' },
  kz: { name: 'Kazakhstan', image: '🇰🇿' },
  us: { name: 'United States', image: '🇺🇸' },
  gb: { name: 'United Kingdom', image: '🇬🇧' },
  ke: { name: 'Kenya', image: '🇰🇪' },
  ng: { name: 'Nigeria', image: '🇳🇬' },
  za: { name: 'South Africa', image: '🇿🇦' },
  eg: { name: 'Egypt', image: '🇪🇬' },
  gh: { name: 'Ghana', image: '🇬🇭' },
  de: { name: 'Germany', image: '🇩🇪' },
  fr: { name: 'France', image: '🇫🇷' },
  es: { name: 'Spain', image: '🇪🇸' },
  it: { name: 'Italy', image: '🇮🇹' },
  ca: { name: 'Canada', image: '🇨🇦' }
};

const mockServices = {
  whatsapp: { name: 'WhatsApp', price: 1.99 },
  telegram: { name: 'Telegram', price: 1.49 },
  viber: { name: 'Viber', price: 1.29 },
  facebook: { name: 'Facebook', price: 1.89 },
  google: { name: 'Google', price: 1.59 },
  instagram: { name: 'Instagram', price: 1.79 },
  twitter: { name: 'Twitter', price: 1.39 },
  tiktok: { name: 'TikTok', price: 1.69 }
};

const operators = ['MTS', 'Beeline', 'Megafon', 'Tele2', 'Safaricom', 'Airtel', 'MTN', 'Glo'];

// Get countries
app.get('/api/5sim/countries', (req, res) => {
  res.json(mockCountries);
});

// Get services for a country
app.get('/api/5sim/services', (req, res) => {
  const { country } = req.query;
  res.json({
    services: Object.values(mockServices),
    operators: operators,
    prices: mockServices
  });
});

// Buy a number
app.post('/api/5sim/buy', (req, res) => {
  const { country, service, operator } = req.body;
  
  // Generate a mock phone number
  const phoneNumber = `+${Math.floor(Math.random() * 10000000000)}`.substring(0, 13);
  
  res.json({
    success: true,
    phoneNumber: phoneNumber,
    id: Date.now().toString(),
    operator: operator || 'Any',
    price: mockServices[service]?.price || 1.99
  });
});

// Check SMS
app.get('/api/5sim/check-sms/:id', (req, res) => {
  res.json({
    success: true,
    messages: [
      {
        date: new Date(),
        text: 'Your verification code is: 123456'
      },
      {
        date: new Date(Date.now() - 3600000),
        text: 'Welcome to the service!'
      }
    ]
  });
});

// ==================== PAYSTACK MOCK API ====================
app.get('/paystack-public-key', (req, res) => {
  res.json({
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_639470fbe710a9b3503068dd875e4b027bd096fe'
  });
});

app.get('/paystack/verify/:reference', (req, res) => {
  res.json({
    status: 'success',
    reference: req.params.reference
  });
});

// ==================== TELEGRAM MOCK API ====================
app.post('/api/telegram/notify/:userId', (req, res) => {
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   - GET  http://localhost:${PORT}/api/5sim/countries`);
  console.log(`   - GET  http://localhost:${PORT}/api/5sim/services?country=ke`);
  console.log(`   - POST http://localhost:${PORT}/api/5sim/buy`);
  console.log(`   - GET  http://localhost:${PORT}/paystack-public-key`);
});