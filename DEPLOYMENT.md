# Deployment Guide

This guide covers deploying the Company Portal to Cloudflare Pages (frontend) and Railway (backend).

## Prerequisites

- Cloudflare account with Pages enabled
- Railway account
- GitHub repository (or GitLab/Bitbucket)

## Frontend Deployment (Cloudflare Pages)

### Step 1: Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository
4. Select the repository containing this project

### Step 2: Configure Build Settings

**Build Configuration:**
- **Framework preset:** Vite
- **Build command:** `cd web && npm install && npm run build`
- **Build output directory:** `web/dist`
- **Root directory:** `/` (root of repo)

**Environment Variables:**
Add these in Cloudflare Pages → Settings → Environment Variables:

```
VITE_API_URL=https://your-railway-api-url.railway.app
```

Replace `your-railway-api-url.railway.app` with your actual Railway API URL.

### Step 3: Deploy

1. Click **Save and Deploy**
2. Cloudflare will automatically build and deploy your site
3. Your site will be available at `https://companyportal.pages.dev`

### Step 4: Custom Domain (Optional)

1. Go to **Custom domains** in your Pages project
2. Add your domain
3. Update DNS records as instructed by Cloudflare

## Backend Deployment (Railway)

### Step 1: Connect Repository

1. Go to [Railway Dashboard](https://railway.app/)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository

### Step 2: Configure Service

1. Railway will auto-detect the project
2. Set the **Root Directory** to `api`
3. Set the **Start Command** to `npm start`

### Step 3: Environment Variables

Add these in Railway → Variables:

```
# Database
DATABASE_URL=your_postgresql_connection_string

# JWT
JWT_SECRET=your_secure_random_secret_key

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://your-r2-public-url.com

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=Your Company <noreply@yourdomain.com>

# Frontend URL (for email links)
FRONTEND_URL=https://companyportal.pages.dev

# Server
PORT=3000
NODE_ENV=production
```

### Step 4: Database Setup

1. In Railway, add a **PostgreSQL** service
2. Copy the connection string to `DATABASE_URL`
3. The database will be automatically migrated on first deploy

### Step 5: Deploy

1. Railway will automatically deploy on push to main branch
2. Your API will be available at `https://your-project.railway.app`

## Post-Deployment Checklist

### Frontend
- [ ] Verify `VITE_API_URL` points to your Railway API
- [ ] Test login functionality
- [ ] Verify all routes work (SPA routing)
- [ ] Check that images/assets load correctly

### Backend
- [ ] Verify database connection
- [ ] Test API endpoints
- [ ] Verify R2 uploads work
- [ ] Test email sending (invitations)
- [ ] Verify scheduled jobs are running (report generation)

## Environment Variables Reference

### Frontend (Cloudflare Pages)
- `VITE_API_URL` - Your Railway API URL

### Backend (Railway)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (generate a secure random string)
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 secret key
- `CLOUDFLARE_R2_BUCKET_NAME` - R2 bucket name
- `CLOUDFLARE_R2_PUBLIC_URL` - Public URL for R2 bucket
- `RESEND_API_KEY` - Resend API key for emails
- `FROM_EMAIL` - Email address for sending emails
- `FRONTEND_URL` - Your Cloudflare Pages URL
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to `production`

## Troubleshooting

### Frontend Issues

**404 on page refresh:**
- Ensure `_redirects` file is in `web/public/` directory
- Verify Cloudflare Pages is configured for SPA routing

**API calls failing:**
- Check `VITE_API_URL` is set correctly
- Verify CORS is configured on backend
- Check browser console for errors

### Backend Issues

**Database connection errors:**
- Verify `DATABASE_URL` is correct
- Check Railway PostgreSQL service is running
- Ensure database migrations have run

**R2 upload failures:**
- Verify R2 credentials are correct
- Check bucket name matches
- Verify bucket permissions

**Scheduled jobs not running:**
- Check Railway logs for scheduler startup messages
- Verify server is running continuously (not sleeping)

## Continuous Deployment

Both Cloudflare Pages and Railway support automatic deployments:
- **Cloudflare Pages:** Deploys on push to main branch
- **Railway:** Deploys on push to main branch (if configured)

To deploy manually:
- **Cloudflare:** Trigger deployment from dashboard
- **Railway:** Redeploy from dashboard or push to main branch
