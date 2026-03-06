# 🚀 Prime SMS Hub - Production-Ready Setup

## ✅ What's Been Done

Your backend is now **production-ready** for Render deploy!

### 1. **API Reorganization** ✓
- ✅ Moved `api/` folder inside `backend/` folder for clean deployment
- ✅ Updated all API URLs from `api.5sim.net` → `5sim.net` (correct domain)
- ✅ Fixed DNS resolution issues

### 2. **CORS Configuration** ✓
- ✅ Dynamic CORS that works with both localhost AND Vercel frontend
- ✅ Automatically accepts requests from `FRONTEND_URL` environment variable
- ✅ Secure & production-ready

### 3. **Environment Configuration** ✓
- ✅ `.env` file with all your keys
- ✅ `.env.example` with helpful comments
- ✅ Ready for Render dashboard environment variables

### 4. **Deployment Files** ✓
- ✅ `Procfile` - Render startup configuration
- ✅ `render.yaml` - Advanced Render configuration
- ✅ `DEPLOYMENT.md` - Complete deployment guide

### 5. **Backend Dependencies** ✓
- ✅ Express, Axios, CORS, Dotenv installed
- ✅ All node_modules ready

---

## 📁 Project Structure (Ready to Deploy)

```
prime-sms-hub.sms/
├── backend/                    # ← ENTIRE backend in one folder
│   ├── api/                    # 5sim API integration
│   │   └── 5sim/
│   │       ├── buy.js
│   │       ├── countries.js
│   │       └── services.js
│   ├── server.js               # Main server (fixed for production)
│   ├── package.json
│   ├── .env                    # Your config keys
│   ├── .env.example            # Template
│   ├── Procfile                # Render deployment
│   ├── render.yaml             # Advanced config
│   ├── DEPLOYMENT.md           # Guide
│   ├── test-api.sh             # Testing script
│   └── .gitignore              # Don't commit secrets
├── src/                        # Frontend (React/Vite)
└── render.yaml                 # Root config file
```

---

## 🎯 Deployment Steps

### Step 1: Deploy Backend to Render
```bash
1. Go to render.com
2. Click "New Web Service"
3. Connect your GitHub repo
4. Build: cd backend && npm install
5. Start: node server.js
6. Set environment variables (see DEPLOYMENT.md)
```

### Step 2: Deploy Frontend to Vercel
```bash
1. Go to vercel.com
2. Import your GitHub repo
3. In dashboard, set environment variable:
   VITE_BACKEND_URL=https://your-render-backend-url.onrender.com
4. Deploy!
```

### Step 3: Update Frontend API Calls
Your frontend should use the environment variable:
```javascript
const API_URL = import.meta.env.VITE_BACKEND_URL;

// Usage
const response = await fetch(`${API_URL}/api/5sim/countries`);
```

---

## 🧪 Test Locally First

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Test API
bash backend/test-api.sh
```

Expected output:
```
✓ Health check
✓ Countries list
✓ Key status
✓ Services/prices
✓ Paystack key
```

---

## 📋 Environment Variables to Set

**In Render Dashboard:**
```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-vercel-app.vercel.app
FIVESIM_PROTOCOL_KEY=your_5sim_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_database_url (if using)
```

**In Vercel Dashboard:**
```
VITE_BACKEND_URL=https://your-render-backend.onrender.com
```

---

## 🔍 What's Working

✅ 5sim API integration (countries, prices, buy numbers)
✅ SMS checking
✅ Paystack payment verification
✅ Telegram notifications
✅ Health checks
✅ Proper error handling with mock fallbacks
✅ CORS for cross-domain requests
✅ Production logging

---

## 📚 Documentation

- **Backend Guide**: `backend/DEPLOYMENT.md`
- **API Docs**: See `backend/server.js` comments
- **Testing**: Run `bash backend/test-api.sh`

---

## ⚠️ Important Notes

1. **Never commit `.env` file** - Only `.env.example`
2. **Set `FRONTEND_URL` in Render** - For CORS to work with Vercel
3. **Render Free Tier**: May have 15-min spindown time
4. **5sim Key**: Get from https://5sim.net/account/security
5. **Check .gitignore**: Sensitive files won't be committed

---

## 🚀 Ready to Deploy!

Your backend is now production-ready. Follow the deployment steps above and you're done!

Questions? See `backend/DEPLOYMENT.md` for detailed guide.
