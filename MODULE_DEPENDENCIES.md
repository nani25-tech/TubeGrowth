# 🔗 Component Relationships & Dependencies

## API Routes Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    REST API Routes                           │
└────────┬──────────────────────────────────────────────────────┘
         │
    ┌────┴──────┬──────────┬─────────┬────────┬──────────┬──────────┐
    │            │          │         │        │          │          │
 AUTH        USER       CAMPAIGN   TASK   PAYMENT   ADMIN   FEEDBACK
 │            │          │         │        │        │          │
 └────────────┴──────────┴─────────┴────────┴────────┴──────────┘
      ↓            ↓          ↓         ↓        ↓       ↓          ↓
   authCtrl    userCtrl   campaignCtrl taskCtrl paymentCtrl adminCtrl feedbackCtrl
      ↓            ↓          ↓         ↓        ↓       ↓          ↓
   User        User     Campaign    Task   PaymentTx   User     Feedback
 CreditTx   Referral   EarnAction                   CreditTx
```

## Module Dependencies

```
┌─────────────────────────────────────────────┐
│          User Authentication                │
├─────────────────────────────────────────────┤
│ • authController.js                         │
│ • auth.js (middleware)                      │
│ • tokens.js (JWT utilities)                 │
│ • crypto.js (password hashing)              │
└───────────────┬─────────────────────────────┘
                │
    ┌───────────┴──────────────────────────┐
    │                                      │
    ↓                                      ↓
┌──────────────────────┐     ┌──────────────────────┐
│  User Management     │     │  Credit System       │
├──────────────────────┤     ├──────────────────────┤
│ • User model         │     │ • CreditTransaction  │
│ • Referral model     │     │ • creditOps.js       │
│ • userController.js  │     │ • PaymentTransaction │
│ • YouTube sync       │     │ • EarnAction model   │
└──────────────────────┘     └──────────────────────┘
    │                            │
    │                            │
    └────────────┬───────────────┘
                 │
                 ↓
    ┌────────────────────────┐
    │  Campaign & Tasks      │
    ├────────────────────────┤
    │ • Campaign model       │
    │ • Task model           │
    │ • campaignCtrl.js      │
    │ • taskCtrl.js          │
    └────────────────────────┘
```

## External Integrations

```
┌─────────────────────────────────────┐
│      YouTube API Integration        │
├─────────────────────────────────────┤
│ Services:                           │
│ • youtubeSync.js                    │
│ • youtube.js (utilities)            │
│                                     │
│ Controllers:                        │
│ • youtubeController.js              │
│                                     │
│ Used by:                            │
│ • User channel verification         │
│ • Subscriber/Like data sync         │
│ • Campaign tracking                 │
└─────────────────────────────────────┘
```

## Database Schema Relationships

```
User (Core)
├── Referral (1:Many)
├── CreditTransaction (1:Many)
├── PaymentTransaction (1:Many)
├── EarnAction (1:Many)
└── Campaign (1:Many)

Campaign
├── Task (1:Many)
├── EarnAction (1:Many)
└── Feedback (1:Many)

Task
├── EarnAction (1:Many)
└── Feedback (1:Many)
```

## Frontend-Backend Communication

```
Browser (index.html + script.js)
         │
         ├─→ /api/auth/* (Login, Register, Logout)
         │
         ├─→ /api/users/* (Profile, Stats, Settings)
         │
         ├─→ /api/campaigns/* (List, Create, Join)
         │
         ├─→ /api/tasks/* (Available tasks, Completion)
         │
         ├─→ /api/payments/* (Credit, Transactions)
         │
         └─→ /api/admin/* (Dashboard, User management)
```

## Middleware Pipeline

```
Request
  ↓
[Express Setup]
  ↓
[Parse JSON/Form Data]
  ↓
[CORS Handling]
  ↓
[Auth Middleware] ← Routes requiring authentication go through here
  ↓
[Route Handler]
  ↓
[Controller]
  ↓
[Database Operation]
  ↓
Response (JSON)
```

## Static Files Structure

```
backend/public/ (Mirrored from root)
├── index.html
├── script.js
├── style.css
├── admin.html
├── admin.js
├── admin.css
├── about.html
├── contact.html
├── privacy.html
├── terms.html
├── refund.html
├── 404.html
├── robots.txt
├── sitemap.xml
├── ads.txt
└── listUsers.js
```

