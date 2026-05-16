# CARTEX — Hyperlocal Hostel Commerce Platform

> **Enterprise-grade, startup-ready** hyperlocal delivery platform built for hostellers.
> Inspired by Zepto, Blinkit, Swiggy Instamart, and Amazon combined.

---

## ✅ Latest Fix - "Not Found" Error Resolved

**Issue**: Platform showed "Not Found" when reloading on any route after login.

**Root Causes Fixed**:
1. ✅ Frontend API URL was pointing to wrong backend
2. ✅ Backend SPA serving logic improved for better fallback handling
3. ✅ Frontend build regenerated with latest optimizations

**What Changed**:
- Updated `frontend/.env` to use `http://localhost:5000` for local dev
- Enhanced `backend/src/app.js` with debug logging and better error handling
- Rebuilt frontend dist with Vite (all bundles optimized)

**See**: [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) for detailed testing steps.

**Quick Test**: After login, reload the page (Ctrl+F5) - it should work perfectly now!

---

## 🚀 What is CARTEX?

CARTEX solves a real problem: **hostellers cannot easily access snacks, groceries, and personal items** without leaving campus. Day scholars and distributors act as intermediaries to:

- Procure products at discounted rates (below MRP)
- Deliver to hostel students at platform prices
- Earn profit through margins + credit card cashback rewards

**Business Model Example:**
```
MRP = ₹30 | Purchase cost = ₹25 | Platform price = ₹28 | Profit = ₹3 + card rewards
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CARTEX PLATFORM                       │
├────────────────┬───────────────────────────────────────────────┤
│   FRONTEND     │               BACKEND (Node.js)               │
│   React + Vite │                                               │
│   Tailwind CSS │  ┌─────────────────────────────────────────┐  │
│   Framer Motion│  │  Express.js REST API + Socket.io        │  │
│   Zustand      │  ├─────────────────────────────────────────┤  │
│   React Query  │  │  Auth (JWT + Refresh Tokens + bcrypt)   │  │
│   Recharts     │  │  RBAC Middleware (5 roles)               │  │
│   Socket.io    │  │  Rate Limiting + Helmet + XSS Clean      │  │
│   Razorpay SDK │  │  Razorpay Integration                   │  │
└────────┬───────┘  │  Cloudinary (image uploads)             │  │
         │          │  Socket.io (real-time events)           │  │
         │          │  Redis (caching, OTP TTL)               │  │
         │          │  Nodemailer + Twilio (OTP delivery)     │  │
         ▼          └─────────────────────────────────────────┘  │
  ┌──────────┐              │                                     │
  │  Vercel  │         ┌────▼─────────────────┐                  │
  └──────────┘         │  MongoDB Atlas       │                  │
                       │  15+ Collections     │                  │
                       │  Indexed + Optimized │                  │
                       └──────────────────────┘                  │
```

---

## 🎭 5 Portals

| Portal | Route | Role |
|--------|-------|------|
| **Customer** | `/` | Browse, cart, checkout, track orders |
| **Admin** | `/admin/dashboard` | Full platform control, analytics |
| **Distributor** | `/distributor/dashboard` | Order management, team oversight |
| **Delivery Dude** | `/delivery/dashboard` | Active deliveries, GPS, OTP |
| **Support** | `/support/dashboard` | Complaint resolution, refunds |

---

## 📁 Project Structure

```
CARTEX/
├── backend/
│   ├── src/
│   │   ├── config/           # DB, Redis, Cloudinary
│   │   ├── controllers/      # Business logic (auth, orders, admin, analytics...)
│   │   ├── middleware/        # Auth, RBAC, error handler, validate
│   │   ├── models/           # Mongoose schemas (User, Order, Product, ...)
│   │   ├── routes/           # Express routers (15+ route files)
│   │   ├── services/         # Payment, Email, SMS, Notifications, Assignment
│   │   ├── socket/           # Socket.io real-time engine
│   │   └── utils/            # Logger, AppError, helpers, slugify
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/common/ # Shared UI: Button, Input, Modal, Cards, ...
    │   ├── hooks/             # useAuth, useCart, useSocket, useCountUp, ...
    │   ├── pages/
    │   │   ├── auth/          # Login, Register, VerifyEmail, ForgotPassword
    │   │   ├── customer/      # Home, Products, Detail, Cart, Checkout, Orders, Profile
    │   │   ├── admin/         # Dashboard, Products, Users, Analytics, Coupons, ...
    │   │   ├── distributor/   # Dashboard, Orders, Team, Inventory
    │   │   ├── delivery/      # Dashboard, Active, History, Earnings
    │   │   └── support/       # Dashboard, Complaints, ComplaintDetail
    │   ├── services/          # api.js (Axios + interceptors), socket.js
    │   ├── store/             # Zustand stores (auth, cart, ui, notifications)
    │   └── styles/            # globals.css (design tokens, component classes)
    ├── .env.example
    └── package.json
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Razorpay test account
- Cloudinary free account

### 1. Clone & Install

```bash
# Backend
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env
# Fill in VITE_API_URL etc
npm install
npm run dev
```

### 2. Seed Initial Admin

```js
// Run this once in MongoDB compass or mongosh:
db.users.insertOne({
  name: "Admin User",
  email: "admin@Cartex.com",
  phone: "9999999999",
  password: "$2b$12$...", // bcrypt hash of your password
  role: "admin",
  isActive: true,
  isEmailVerified: true,
  isPhoneVerified: true
})
```

Or create a seed script:
```bash
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('Admin@1234', 12).then(h => console.log(h));
"
```

### 3. Create First Zone

In the Admin portal → Zones → Add Zone, create your first delivery zone and assign hostels to it.

---

## 🔐 Security Architecture

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt (12 rounds) |
| Session tokens | JWT access (15min) + Refresh (7d, rotated) |
| Refresh storage | SHA-256 hash in DB, sent as httpOnly cookie |
| OTP security | bcrypt hashed, 10-min TTL, 5 attempt limit |
| SQL/NoSQL injection | express-mongo-sanitize |
| XSS prevention | xss-clean, helmet CSP headers |
| Rate limiting | 100 req/15min global, 20/15min auth |
| HTTP security | helmet.js (15 headers) |
| CSRF | SameSite cookies, CORS whitelist |
| HTTP pollution | hpp (whitelist) |
| Account lockout | 5 failed logins → 2h lockout |
| Audit trail | Every admin action logged with IP |
| Payment | Razorpay HMAC-SHA256 signature verification |

---

## 🗄️ Database Schema Summary

| Collection | Purpose | Key Indexes |
|-----------|---------|-------------|
| `users` | All user accounts (5 roles) | email, phone, role+isActive |
| `customers` | Customer profiles, cart, wallet | user (unique), hostelName |
| `products` | Product catalog | text search, category+isActive+stock |
| `orders` | Order lifecycle | customer+status, distributor, deliveryDude |
| `categories` | Product categories | isActive, sortOrder |
| `zones` | Delivery zones | GeoJSON 2dsphere |
| `coupons` | Discount codes | code+isActive, validUntil |
| `complaints` | Support tickets | customer+status, priority+createdAt |
| `notifications` | In-app notifications | recipient+isRead+createdAt |
| `chats` | Temporary order chats | roomId, expiresAt (TTL index) |
| `messages` | Chat messages | chatRoom+createdAt |
| `reviews` | Product reviews | product+isApproved |
| `auditlogs` | Action history | performedBy, resource+resourceId |

---

## 💳 Razorpay Integration Flow

```
1. Customer clicks "Pay Now"
2. Frontend calls POST /payments/create-order
3. Backend creates Razorpay order (server-side)
4. Frontend opens Razorpay checkout modal
5. Customer completes payment
6. Frontend calls POST /orders/confirm-payment with signatures
7. Backend verifies HMAC-SHA256 signature (CRITICAL security step)
8. On success: order confirmed, stock deducted, notifications sent
9. Webhook handler catches payment.failed for server-side safety
```

---

## 🔄 Order Workflow

```
Customer places order
        ↓
Payment confirmed (Razorpay / COD)
        ↓
Auto-assigned to zone distributor + delivery dude
        ↓
Distributor reviews → marks "Procured"
        ↓
Delivery dude picks up → marks "Picked Up"
        ↓
Out for delivery → GPS tracking starts
        ↓
Customer shares 6-digit OTP to delivery dude
        ↓
Delivery dude verifies OTP → marks "Delivered"
        ↓
Chat expires 2h after delivery (privacy)
        ↓
Customer rates the experience
```

---

## 🚀 Deployment Guide

### Frontend → Vercel

```bash
cd frontend
npm run build

# Or connect GitHub repo to Vercel
# Set environment variables in Vercel dashboard:
# VITE_API_URL=https://your-backend.onrender.com/api/v1
# VITE_SOCKET_URL=https://your-backend.onrender.com
```

### Backend → Render (Free Tier)

1. Push to GitHub
2. Create new Web Service on Render
3. Set environment variables from `.env.example`
4. Build command: `npm install`
5. Start command: `npm start`

### Backend → Railway

```bash
railway login
railway init
railway add
railway up
# Set env vars in Railway dashboard
```

### Backend → AWS EC2 with PM2

```bash
# On EC2 (Ubuntu 22.04)
sudo apt update && sudo apt install -y nodejs npm
npm install -g pm2

git clone your-repo
cd CARTEX/backend
npm install
cp .env.example .env && nano .env

pm2 start src/server.js --name CARTEX
pm2 startup
pm2 save

# Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/Cartex
# Add: proxy_pass import.meta.env.VITE_API_URL
sudo nginx -t && sudo systemctl reload nginx
```

### MongoDB Atlas Setup

1. Create free cluster at cloud.mongodb.com
2. Add IP whitelist: 0.0.0.0/0 (or specific IPs)
3. Create database user
4. Get connection string → paste in `MONGODB_URI`
5. Database: `Cartex`

### Redis Setup (optional but recommended)

- **Upstash** (free): `REDIS_URL=rediss://...` from Upstash dashboard
- **Railway Redis**: Add Redis service, copy URL

---

## 📊 Performance Optimizations

| Area | Optimization |
|------|-------------|
| DB queries | Compound indexes on hot paths |
| API responses | Redis caching (5-30 min TTL) |
| Images | Cloudinary CDN + auto WebP + resize |
| Frontend | Code splitting by portal (lazy loading) |
| Assets | Vite build optimization (manual chunks) |
| Real-time | Socket.io room namespacing |
| API | Response compression (gzip) |
| N+1 queries | `.populate()` with field selection |

---

## 🧪 Testing Strategy

```bash
# Backend unit tests
cd backend
npm test

# API testing with curl
curl -X POST import.meta.env.VITE_API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@Cartex.com","password":"Admin@1234"}'

# Load testing (install artillery)
npm install -g artillery
artillery quick --count 50 -n 10 import.meta.env.VITE_API_URL/api/v1/health
```

---

## 🔮 Future Scaling Plan

| Phase | Enhancement |
|-------|------------|
| Scale-out | PM2 cluster mode / horizontal scaling |
| Cache layer | Redis for sessions + product cache |
| CDN | CloudFront for static assets |
| Search | Elasticsearch for full-text product search |
| Analytics | Separate analytics service / ClickHouse |
| ML | Python service for demand prediction |
| Payments | Multiple gateways (PhonePe, Paytm) |
| Mobile | React Native app using same backend |
| Multi-tenant | Multiple colleges/universities |

---

## 📝 API Endpoints Summary

### Auth
- `POST /api/v1/auth/register` — Register customer
- `POST /api/v1/auth/verify-email` — Verify OTP
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/refresh-token` — Refresh JWT
- `POST /api/v1/auth/logout` — Logout
- `POST /api/v1/auth/forgot-password` — Send reset OTP
- `POST /api/v1/auth/reset-password` — Reset password
- `GET /api/v1/auth/me` — Get current user

### Products
- `GET /api/v1/products` — List (search, filter, paginate)
- `GET /api/v1/products/:slug` — Product detail
- `GET /api/v1/products/trending` — Trending products
- `POST /api/v1/products` — Create (admin)
- `PUT /api/v1/products/:id` — Update (admin)
- `DELETE /api/v1/products/:id` — Soft delete (admin)
- `PATCH /api/v1/products/:id/flash-sale` — Toggle flash sale (admin)
- `POST /api/v1/products/bulk-upload` — Bulk create (admin)

### Orders
- `POST /api/v1/orders` — Place order
- `POST /api/v1/orders/confirm-payment` — Verify Razorpay payment
- `GET /api/v1/orders/my-orders` — Customer's orders
- `GET /api/v1/orders/:id` — Order detail
- `PATCH /api/v1/orders/:id/status` — Update status
- `POST /api/v1/orders/:id/verify-otp` — Verify delivery OTP
- `POST /api/v1/orders/:id/cancel` — Cancel order

### Analytics (Admin)
- `GET /api/v1/analytics/dashboard` — Overview stats
- `GET /api/v1/analytics/revenue` — Revenue charts
- `GET /api/v1/analytics/orders` — Order analytics
- `GET /api/v1/analytics/products` — Product performance
- `GET /api/v1/analytics/customers` — Customer growth
- `GET /api/v1/analytics/fraud` — Fraud detection

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Brand | `#f97316` (orange) |
| Background | `#0a0a0a` (near black) |
| Surface-1 | `#111111` |
| Surface-2 | `#1a1a1a` |
| Success | `#22c55e` |
| Error | `#ef4444` |
| Warning | `#eab308` |
| Font | Sora (Google Fonts) |
| Border-radius | 12px (cards), 20px (large) |

---

## 👥 Team Roles & Permissions

| Action | Customer | Distributor | Delivery | Support | Admin |
|--------|----------|-------------|---------|---------|-------|
| Browse/buy | ✅ | — | — | — | ✅ |
| Place order | ✅ | — | — | — | — |
| Update order status | — | ✅ | ✅ | — | ✅ |
| Verify OTP | — | — | ✅ | — | — |
| Manage products | — | — | — | — | ✅ |
| View analytics | — | Zone only | — | Support only | ✅ |
| Manage users | — | — | — | — | ✅ |
| Resolve complaints | — | — | — | ✅ | ✅ |
| Process refunds | — | — | — | — | ✅ |

---

## 📞 Support & Contact

Built with ❤️ for hostellers everywhere.

- Issues: Create a GitHub issue
- Documentation: `/docs` (coming soon)
- Health check: `GET /api/health`

---

*CARTEX — Built like a real startup preparing for millions of users.*


