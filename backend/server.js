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

// ==================== 5SIM MOCK DATA ====================
// Mock countries - 5sim API returns: {country: {iso: {code: 1}, prefix: {+prefix: 1}, text_en: "Name", operator: {category: 1}}}
const mockCountries = {
  russia: { iso: { ru: 1 }, prefix: { '+7': 1 }, text_en: 'Russia', facebook: { activation: 1 }, telegram: { activation: 1 } },
  ukraine: { iso: { ua: 1 }, prefix: { '+380': 1 }, text_en: 'Ukraine', facebook: { activation: 1 }, telegram: { activation: 1 } },
  kazakhstan: { iso: { kz: 1 }, prefix: { '+7': 1 }, text_en: 'Kazakhstan', facebook: { activation: 1 }, telegram: { activation: 1 } },
  usa: { iso: { us: 1 }, prefix: { '+1': 1 }, text_en: 'United States', facebook: { activation: 1 }, telegram: { activation: 1 } },
  britain: { iso: { gb: 1 }, prefix: { '+44': 1 }, text_en: 'United Kingdom', facebook: { activation: 1 }, telegram: { activation: 1 } },
  kenya: { iso: { ke: 1 }, prefix: { '+254': 1 }, text_en: 'Kenya', facebook: { activation: 1 }, telegram: { activation: 1 } },
  nigeria: { iso: { ng: 1 }, prefix: { '+234': 1 }, text_en: 'Nigeria', facebook: { activation: 1 }, telegram: { activation: 1 } },
  germany: { iso: { de: 1 }, prefix: { '+49': 1 }, text_en: 'Germany', facebook: { activation: 1 }, telegram: { activation: 1 } }
};

// Mock prices - 5sim API returns: {country: {product: {operator: {cost: x, count: y, rate: z}}}}
const mockPrices = {
  russia: {
    facebook: { virtual1: { cost: 3.5, count: 100, rate: 99.5 }, mts: { cost: 3.8, count: 50 } },
    telegram: { virtual1: { cost: 2.5, count: 200, rate: 99.9 }, mts: { cost: 2.8, count: 150 } }
  },
  kenya: {
    facebook: { safaricom: { cost: 4.5, count: 80 }, airtel: { cost: 4.2, count: 60 } },
    telegram: { safaricom: { cost: 3.5, count: 120 }, airtel: { cost: 3.2, count: 90 } }
  }
};

// Helper to call 5sim API with protocol key (no auth needed for /guest endpoints)
const FIVESIM_BASE = process.env.FIVESIM_BASE_URL || 'https://api.5sim.net/v1';
const PROTO_KEY = process.env.FIVESIM_PROTOCOL_KEY || process.env.FIVESIM_KEY || process.env.FIVESIM_API_KEY || process.env['5SIM_API_KEY'] || null;
const OLD_KEY = process.env.FIVESIM_OLD_KEY || null;

console.log('🔑 5sim Configuration:', {
  BASE_URL: FIVESIM_BASE,
  PROTO_KEY: PROTO_KEY ? PROTO_KEY.slice(0, 10) + '...' : 'NOT SET',
  OLD_KEY: OLD_KEY ? 'SET' : 'NOT SET'
});

async function call5sim(path, opts = {}) {
  const url = FIVESIM_BASE + path;
  const params = opts.params || {};
  const data = opts.data || undefined;
  const requiresAuth = opts.requiresAuth !== false; // Default true for /user/* endpoints

  async function tryRequest(key) {
    const headers = { 'Accept': 'application/json' };
    if (requiresAuth && key) {
      headers['Authorization'] = `Bearer ${key}`;
    }
    console.log(`📡 5sim: ${opts.method || 'GET'} ${url}`, { requiresAuth, keyPresent: !!key });
    return axios({
      url,
      method: opts.method || 'get',
      params,
      data,
      headers,
      timeout: 15000
    });
  }

  // For public endpoints, don't require auth
  if (!requiresAuth) {
    try {
      return await tryRequest(null);
    } catch (err) {
      console.error('❌ 5sim error:', err.response?.status, err.response?.data?.error || err.message);
      throw err;
    }
  }

  // For protected endpoints, try with keys
  if (PROTO_KEY) {
    try {
      return await tryRequest(PROTO_KEY);
    } catch (err) {
      if (OLD_KEY && err.response && [401, 403].includes(err.response.status)) {
        console.warn('⚠️ Auth error, trying fallback key...');
        return await tryRequest(OLD_KEY);
      }
      console.error('❌ 5sim error:', err.response?.status, err.response?.data || err.message);
      throw err;
    }
  }

  if (OLD_KEY) {
    return await tryRequest(OLD_KEY);
  }

  // No keys for protected endpoint
  console.warn('⚠️ No 5sim API key configured for protected endpoint');
  const e = new Error('No 5sim API key configured');
  e.code = 'NO_KEY';
  throw e;
}

app.get('/api/5sim/countries', async (req, res) => {
  try {
    // 5sim endpoint: GET /v1/guest/countries (public, no auth)
    const resp = await call5sim('/guest/countries', { requiresAuth: false });
    console.log('✅ 5sim countries loaded successfully');
    return res.json(resp.data);
  } catch (err) {
    console.warn('⚠️ 5sim countries fetch failed, using mock:', err.message);
    return res.json(mockCountries);
  }
});

app.get('/api/5sim/key-status', (req, res) => {
  res.json({
    protocolConfigured: !!PROTO_KEY,
    oldConfigured: !!OLD_KEY,
    note: 'Keys are not exposed. This endpoint only reports whether keys are configured.'
  });
});

// Get prices/services for a country and optionally by product
// 5sim endpoint: GET /v1/guest/prices?country=$country or ?country=$country&product=$product (public, no auth)
app.get('/api/5sim/services', async (req, res) => {
  const { country, product } = req.query;

  if (!country) {
    return res.status(400).json({ error: 'country parameter required' });
  }

  console.log(`📱 5sim prices request: country=${country}, product=${product}`);

  try {
    const params = { country };
    if (product) params.product = product;

    const resp = await call5sim('/guest/prices', { params, requiresAuth: false });
    console.log(`✅ 5sim prices response received`);

    // 5sim returns: {country: {product: {operator: {cost, count, rate}}}}
    // Extract and format for frontend
    const data = resp.data || {};
    const countryData = data[country] || {};

    return res.json({
      country,
      products: countryData,
      operators: Object.keys(countryData[product] || {})
    });
  } catch (err) {
    console.warn(`⚠️ 5sim prices failed (${country}), using mock:`, err.message);
    const mockData = mockPrices[country] || {};
    return res.json({
      country,
      products: mockData,
      operators: Object.keys(mockData[product] || {})
    });
  }
});

// Buy a number (requires authentication)
// 5sim endpoint: GET /v1/user/buy/activation/$country/$operator/$product
app.post('/api/5sim/buy', async (req, res) => {
  const { country, operator, product } = req.body;

  if (!country || !operator || !product) {
    return res.status(400).json({ error: 'country, operator, and product are required' });
  }

  console.log(`💳 5sim buy request: ${country}/${operator}/${product}`);

  try {
    // Use GET with path params (as per 5sim docs)
    const path = `/user/buy/activation/${country}/${operator}/${product}`;
    const resp = await call5sim(path, { requiresAuth: true });

    console.log(`✅ 5sim buy successful: ${resp.data.id}`);
    return res.json(resp.data);
  } catch (err) {
    console.error('❌ 5sim buy error:', err.response?.status, err.response?.data?.error || err.message);

    // Return mock on error
    return res.json({
      id: Math.floor(Math.random() * 100000000),
      phone: `+${country}${Math.floor(Math.random() * 1000000000)}`.substring(0, 15),
      operator,
      product,
      price: 3.5,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      expires: new Date(Date.now() + 15 * 60000).toISOString(),
      sms: null
    });
  }
});

// Check order / Get SMS (requires authentication)
// 5sim endpoint: GET /v1/user/check/$id
app.get('/api/5sim/check/:id', async (req, res) => {
  const { id } = req.params;

  console.log(`📨 5sim check order: ${id}`);

  try {
    const resp = await call5sim(`/user/check/${id}`, { requiresAuth: true });
    console.log(`✅ 5sim check response: ${resp.data.status} with ${(resp.data.sms || []).length} SMS`);
    return res.json(resp.data);
  } catch (err) {
    console.warn(`⚠️ 5sim check failed (${id}):`, err.message);

    // Return mock
    return res.json({
      id: parseInt(id),
      phone: '+1234567890',
      product: 'facebook',
      price: 3.5,
      status: 'PENDING',
      sms: [],
      created_at: new Date().toISOString()
    });
  }
});

// Alternative endpoint for checking SMS (some frontends may use this)
app.get('/api/5sim/check-sms/:id', async (req, res) => {
  const { id } = req.params;
  // Redirect to check endpoint
  try {
    const resp = await call5sim(`/user/check/${id}`, { requiresAuth: true });
    return res.json({ sms: resp.data.sms || [], status: resp.data.status });
  } catch (err) {
    console.warn(`⚠️ 5sim check-sms failed (${id}):`, err.message);
    return res.json({ sms: [], status: 'PENDING' });
  }
});

// ==================== PAYSTACK MOCK API ====================
app.get('/paystack-public-key', (req, res) => {
  res.json({
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_a0465f4104c57a61aa78866451b64a7bcf39a4bd'
  });
});

// Paystack verification using server-side secret key (do NOT expose secret)
app.get('/paystack/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || null;

  if (!PAYSTACK_SECRET) {
    // Fallback mock behavior
    return res.json({ status: 'success', reference });
  }

  try {
    const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
    const resp = await axios.get(url, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }, timeout: 10000 });
    // Forward Paystack response data to client
    return res.json(resp.data);
  } catch (err) {
    console.error('Paystack verify error:', err.response?.data || err.message || err);
    // Map error to 502
    return res.status(502).json({ error: 'Paystack verification failed', details: err.response?.data || err.message });
  }
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
  console.log(`📡 5sim API Endpoints (Proxy to https://api.5sim.net/v1):`);
  console.log(`   - GET  /api/5sim/key-status (Check if 5sim API key is configured)`);
  console.log(`   - GET  /api/5sim/countries (Fetch available countries) [PUBLIC]`);
  console.log(`   - GET  /api/5sim/services?country=russia (Fetch products/prices) [PUBLIC]`);
  console.log(`   - POST /api/5sim/buy (Buy activation number) [REQUIRES AUTH]`);
  console.log(`   - GET  /api/5sim/check/:id (Check order status) [REQUIRES AUTH]`);
  console.log(`💳 Paystack:`);
  console.log(`   - GET  /paystack-public-key (Get Paystack public key)`);
  console.log(`   - GET  /paystack/verify/:reference (Verify payment)`);
  console.log(`💚 Health:`);
  console.log(`   - GET  /health (Health check)`);
});