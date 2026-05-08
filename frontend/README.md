# TubeGrowth - Frontend

React-based frontend for TubeGrowth platform with Tailwind CSS and glassmorphism design.

## Features

- User authentication (Email & Google OAuth)
- Dashboard with stats
- Campaign management
- Task-based credit earning
- Referral system
- Dark mode with glass effect UI

## Installation

```bash
cd TubeGrowth/frontend
npm install
```

## Development

```bash
npm start
```

Server runs on http://localhost:3000

## Build

```bash
npm run build
```

## Environment Variables

Create `.env` file from `.env.example`:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Tech Stack

- React 18
- React Router v6
- Tailwind CSS
- Axios
- Socket.io client

## Folder Structure

```
src/
├── components/        # Reusable UI components
├── context/          # React context (Auth, Toast)
├── pages/            # Page components
├── utils/            # API calls, storage
├── App.js            # Main app component
└── index.js          # Entry point
```

## Support

For issues or questions, contact support@tubegrowth.com
