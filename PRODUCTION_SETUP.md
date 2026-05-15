# TubeGrowth Production Setup Guide

## Render Deployment Configuration

### Required Environment Variables in Render Dashboard

Set these environment variables in your Render service dashboard (Settings > Environment):

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tubegrowth?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
YOUTUBE_API_KEY=your-youtube-data-api-key
YOUTUBE_CLIENT_ID=your-google-oauth-client-id
YOUTUBE_CLIENT_SECRET=your-google-oauth-client-secret
YOUTUBE_REDIRECT_URI=https://tubegrowth.zone.id/api/user/youtube/callback
FRONTEND_URL=https://tubegrowth.zone.id
CORS_ORIGIN=https://tubegrowth.zone.id,https://www.tubegrowth.zone.id,https://nani25-tech.github.io,https://nani25-tech.github.io/TubeGrowth
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

### Steps to Configure:

1. **Get MongoDB URI**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a cluster if you haven't already
   - Get the connection string: `mongodb+srv://username:password@cluster.mongodb.net/tubegrowth?retryWrites=true&w=majority`

2. **Set Render Environment Variables**
   - Go to https://dashboard.render.com
   - Select your `tubegrowth-backend` service
   - Go to **Settings** → **Environment**
   - Add each variable from the list above
   - Click **Save**

### YouTube data note

- `YOUTUBE_API_KEY` is for YouTube Data API lookups such as channel metadata.
- YouTube Analytics does **not** use an API key. It uses the OAuth credentials above plus the user's connected YouTube account.
- The backend already stores the user's YouTube OAuth tokens after `/api/user/youtube/callback`, then uses them to fetch real analytics data.

3. **Re-deploy the service**
   - Go to **Deployments**
   - Click the latest deployment
   - Click **Redeploy** button

4. **Check Deployment Logs**
   - Go to **Logs** tab
   - Look for `[SERVER] ✅ Server running on port 5000`
   - Should see `[DB] ✅ MongoDB connected`

### Verify Production Admin Access

After deployment completes:

1. Visit https://tubegrowth.zone.id/admin.html
2. Log in with admin credentials:
   - Email: `admin@tubegrowth.tg`
   - Password: `Admin@25`
3. Should see "Loaded X users" message

### Troubleshooting

**Login fails with "Invalid credentials":**
- Check that admin user exists in production MongoDB
- Verify MONGODB_URI is correct in Render environment

**Server errors in logs:**
- Check MongoDB connection string format
- Verify IP whitelist on MongoDB Atlas allows Render's IP

**Page shows "Not signed in" after login:**
- Check browser console for CORS errors
- Verify CORS_ORIGIN includes your domain
- Clear browser localStorage and try again
