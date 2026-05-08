# TubeGrowth - Backend API

A comprehensive Node.js/Express backend for YouTube growth services with credit system, campaign management, and real-time notifications.

## Features

- **User Authentication**: Email/password signup, Google OAuth, JWT tokens
- **Credit System**: Purchase credits, earn through tasks, spend on campaigns
- **YouTube Campaigns**: Grow subscribers, likes, views, comments
- **Task System**: Earn credits by subscribing to channels, liking videos, watching content
- **Referral Program**: Share referral codes and earn rewards
- **Admin Panel**: User management, analytics, campaign moderation
- **Real-time Updates**: Socket.io notifications and live campaign status
- **Security**: Bcrypt hashing, JWT tokens, rate limiting, anti-cheat detection

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: MongoDB 5.0+ with Mongoose ODM
- **Authentication**: JWT, bcryptjs, Google OAuth
- **APIs**: YouTube Data API v3
- **Real-time**: Socket.io 4.x
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting

## Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB instance (local or MongoDB Atlas)
- YouTube Data API key
- Google OAuth credentials
- Gmail account (for email service)

### Setup Steps

1. **Clone and Install**
```bash
cd TubeGrowth/backend
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- MongoDB connection string
- JWT secrets (32+ character random strings)
- YouTube API key
- Google OAuth credentials
- Email credentials

3. **Start Development Server**
```bash
npm run dev
```

Server runs on http://localhost:5000

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Campaign.js
│   │   ├── Task.js
│   │   └── Referral.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── campaignController.js
│   │   ├── taskController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── campaignRoutes.js
│   │   ├── taskRoutes.js
│   │   └── adminRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   ├── tokens.js
│   │   ├── email.js
│   │   └── youtube.js
│   ├── app.js
│   └── server.js
```

## API Documentation

See [API.md](./API.md) for detailed endpoint documentation.

## Support

For support, contact: support@tubegrowth.com
