# 📦 TubeGrowth Project Structure

## 🏗️ Architecture Overview

```
TubeGrowth/
├── 📄 Frontend Files (Root Level)
│   ├── index.html           → Main homepage
│   ├── script.js            → Frontend logic
│   ├── style.css            → Main styling
│   ├── about.html
│   ├── contact.html
│   ├── privacy.html
│   ├── terms.html
│   └── refund.html
│
├── 🔧 Backend/
│   ├── src/                 → Application source code
│   │   ├── app.js           → Express app setup
│   │   ├── server.js        → Server entry point
│   │   │
│   │   ├── 🔌 config/
│   │   │   └── db.js        → Database configuration
│   │   │
│   │   ├── 🎮 controllers/  → Business logic
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── campaignController.js
│   │   │   ├── feedbackController.js
│   │   │   ├── taskController.js
│   │   │   ├── userController.js
│   │   │   └── youtubeController.js
│   │   │
│   │   ├── 🛡️ middleware/
│   │   │   └── auth.js      → Authentication middleware
│   │   │
│   │   ├── 📊 models/       → Database schemas
│   │   │   ├── User.js
│   │   │   ├── Campaign.js
│   │   │   ├── Task.js
│   │   │   ├── Feedback.js
│   │   │   ├── CreditTransaction.js
│   │   │   ├── PaymentTransaction.js
│   │   │   ├── EarnAction.js
│   │   │   └── Referral.js
│   │   │
│   │   ├── 🛣️ routes/       → API endpoints
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── adminRoutes.js
│   │   │   ├── campaignRoutes.js
│   │   │   ├── taskRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   └── feedbackRoutes.js
│   │   │
│   │   ├── 🛠️ services/     → External integrations
│   │   │   └── youtubeSync.js
│   │   │
│   │   └── 🔨 utils/        → Helper functions
│   │       ├── creditOps.js
│   │       ├── crypto.js
│   │       ├── email.js
│   │       ├── tokens.js
│   │       └── youtube.js
│   │
│   ├── public/              → Static files (mirrors frontend)
│   │   ├── index.html
│   │   ├── script.js
│   │   ├── style.css
│   │   └── ...other pages
│   │
│   ├── scripts/             → Admin utilities
│   │   ├── createAdmin.js
│   │   └── mergeDuplicateUsersByChannelId.js
│   │
│   ├── package.json
│   ├── nodemon.json
│   └── README.md
│
├── 🚀 Deploy/
│   └── deploy_and_cleanup.ps1  → PowerShell deployment script
│
├── 📋 Config Files (Root)
│   ├── package.json
│   ├── render.yaml          → Render deployment config
│   ├── CNAME               → DNS configuration
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── ads.txt
│   ├── 404.html
│   └── .gitignore
│
└── 📚 Documentation
    ├── README.md
    ├── PRODUCTION_SETUP.md
    ├── DNS_FIX_REQUIRED.md
    ├── CHANNEL_LOGIN_ERROR_FIX.md
    ├── CREDIT_SYSTEM_IMPROVEMENTS.md
    └── CREDIT_SYSTEM_BEFORE_AFTER.md
```

---

## 🔄 Data Flow

```
User Browser
    ↓
Frontend (index.html, script.js)
    ↓
API Routes (Express)
    ↓
Controllers (Business Logic)
    ↓
Models (MongoDB)
    ↓
External Services (YouTube API)
```

---

## 🔐 Core Modules

### Authentication
- **Route**: `authRoutes.js`
- **Controller**: `authController.js`
- **Model**: `User.js`
- **Middleware**: `auth.js`

### User Management
- **Route**: `userRoutes.js`
- **Controller**: `userController.js`
- **Model**: `User.js`

### Campaign System
- **Route**: `campaignRoutes.js`
- **Controller**: `campaignController.js`
- **Model**: `Campaign.js`

### Task System
- **Route**: `taskRoutes.js`
- **Controller**: `taskController.js`
- **Model**: `Task.js`

### Credit System
- **Utilities**: `creditOps.js`
- **Models**: 
  - `CreditTransaction.js`
  - `PaymentTransaction.js`
  - `EarnAction.js`

### YouTube Integration
- **Service**: `youtubeSync.js`
- **Utils**: `youtube.js`
- **Controller**: `youtubeController.js`

---

## 📄 Key Files

| File | Purpose |
|------|---------|
| `backend/src/app.js` | Express app configuration |
| `backend/src/server.js` | Server startup |
| `backend/public/index.html` | Main landing page |
| `backend/public/script.js` | Frontend JavaScript |
| `backend/public/style.css` | Main stylesheet |
| `deploy/deploy_and_cleanup.ps1` | Automated deployment |
| `backend/package.json` | Backend dependencies |

---

## 🌐 Frontend Pages

- **index.html** - Homepage with channel lookup form
- **about.html** - About TubeGrowth
- **contact.html** - Contact page
- **privacy.html** - Privacy policy
- **terms.html** - Terms of service
- **refund.html** - Refund policy
- **admin.html** - Admin dashboard
- **404.html** - Error page

---

## 🗄️ Database Models

All models are stored in `backend/src/models/`:

- **User** - Channel owners, credentials, statistics
- **Campaign** - Marketing campaigns
- **Task** - Earning tasks for users
- **Feedback** - User feedback
- **CreditTransaction** - Credit balance tracking
- **PaymentTransaction** - Payment records
- **EarnAction** - User action history
- **Referral** - Referral relationships

---

## 🚀 Deployment

**Method**: PowerShell script
**Script**: `deploy/deploy_and_cleanup.ps1`
**Environment Variables**:
- `$env:DEPLOY_USER` - Remote username
- `$env:DEPLOY_HOST` - Remote host
- `$env:DEPLOY_PATH` - Remote path
- `$env:DEPLOY_KEY` - (Optional) Private key

**Usage**:
```powershell
./deploy/deploy_and_cleanup.ps1 -CleanupAction DryRun
./deploy/deploy_and_cleanup.ps1 -CleanupAction Apply
```

---

## 📦 Recent Changes

**Latest commits** (modified):
- `index.html` - Homepage
- `script.js` - Frontend logic
- `style.css` - Styling
- Checkbox styling enhancements
- Footer reorganization

---

## ⚙️ Configuration Files

- `render.yaml` - Render.com deployment config
- `nodemon.json` - Development auto-reload
- `CNAME` - Custom domain DNS
- `robots.txt` - Search engine directives
- `sitemap.xml` - Site map for SEO

