# TubeGrowth - Complete Project

TubeGrowth is a YouTube growth platform with credit-based campaigns, task earning system, and referral rewards.

## Project Structure

```
TubeGrowth/
├── index.html              # Original landing page
├── style.css              # Landing page styles
├── script.js              # Landing page scripts
├── backend/               # Node.js/Express API
│   ├── src/
│   │   ├── config/        # Database config
│   │   ├── models/        # MongoDB schemas
│   │   ├── controllers/   # Business logic
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth middleware
│   │   ├── utils/         # Utilities (email, tokens, YouTube)
│   │   ├── app.js         # Express app
│   │   └── server.js      # Server entry point
│   ├── .env.example       # Environment template
│   ├── package.json       # Dependencies
│   └── README.md          # Backend docs
└── frontend/              # React app
    ├── src/
    │   ├── components/    # UI components
    │   ├── context/       # Auth & Toast context
    │   ├── utils/         # API & storage
    │   ├── App.js         # Main component
    │   └── index.js       # Entry point
    ├── public/
    │   └── index.html     # HTML template
    ├── tailwind.config.js # Tailwind config
    ├── .env.example       # Environment template
    ├── package.json       # Dependencies
    └── README.md          # Frontend docs
```

## Getting Started

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Server runs on http://localhost:5000

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

App runs on http://localhost:3000

## Features

### User System
- Email/Password registration
- Google OAuth login
- Profile management
- Referral codes

### Credit System
- Purchase credits with USD
- Earn credits through tasks
- Track credit balance
- Transaction history

### Campaign Management
- Create YouTube growth campaigns
- Set targets (subscribers, likes, views)
- Track progress
- Pause/Resume campaigns

### Task System
- Subscribe to channels (+2 credits)
- Like videos (+1 credit per day, max 5)
- Watch videos (+3 credits)
- Daily reset for tasks

### Admin Panel
- User management (ban/unban)
- Credit adjustments
- Campaign moderation
- Platform analytics

## API Endpoints

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/google-login` - Google OAuth
- `POST /api/auth/refresh` - Refresh token

### User
- `GET /api/user/profile` - Get profile
- `GET /api/user/dashboard` - Dashboard stats
- `GET /api/user/wallet` - Credit balance
- `PUT /api/user/profile` - Update profile

### Campaigns
- `POST /api/campaigns/create` - Create campaign
- `GET /api/campaigns/list` - List campaigns
- `GET /api/campaigns/:id` - Get details
- `PUT /api/campaigns/:id` - Update
- `POST /api/campaigns/:id/pause` - Pause
- `POST /api/campaigns/:id/resume` - Resume

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks/:id/complete` - Complete task
- `POST /api/tasks/:id/verify` - Verify & award

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users/:id/ban` - Ban user
- `GET /api/admin/campaigns` - List campaigns
- `GET /api/admin/analytics` - Get analytics

## Technologies

### Backend
- Node.js 18+
- Express.js 4.x
- MongoDB with Mongoose
- JWT authentication
- Socket.io for real-time

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Axios
- Socket.io client

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb://...
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
YOUTUBE_API_KEY=your_key
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_id
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Deployment

Pushes to `main` deploy automatically through `.github/workflows/deploy.yml` using the existing SSH helper in `deploy/deploy_and_cleanup.ps1`.
Set the repository secrets `DEPLOY_USER`, `DEPLOY_HOST`, `DEPLOY_PATH`, and optionally `DEPLOY_KEY`.

See `backend/README.md` and `frontend/README.md` for additional deployment instructions.

## License

Proprietary - TubeGrowth Inc.

## Support

support@tubegrowth.com
