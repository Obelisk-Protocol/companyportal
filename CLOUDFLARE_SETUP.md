# Cloudflare Pages Quick Setup

## Step-by-Step Deployment

### 1. Prepare Your Repository

Make sure your code is pushed to GitHub/GitLab/Bitbucket.

### 2. Deploy to Cloudflare Pages

1. **Go to Cloudflare Dashboard**
   - Visit https://dash.cloudflare.com/
   - Navigate to **Pages** in the sidebar

2. **Create a New Project**
   - Click **Create a project**
   - Select **Connect to Git**
   - Authorize Cloudflare to access your repository
   - Select your repository

3. **Configure Build Settings**
   
   **Project name:** `company-portal` (or your preferred name)
   
   **Build settings:**
   - **Framework preset:** `Vite`
   - **Build command:** `cd web && npm install && npm run build`
   - **Build output directory:** `web/dist`
   - **Root directory:** `/` (leave empty or set to `/`)

4. **Set Environment Variables**
   
   Click **Environment variables** and add:
   
   ```
   VITE_API_URL = https://your-railway-app.railway.app
   ```
   
   Replace `your-railway-app.railway.app` with your actual Railway API URL.

5. **Deploy**
   - Click **Save and Deploy**
   - Wait for the build to complete (usually 2-3 minutes)
   - Your site will be live at `https://your-project.pages.dev`

### 3. Custom Domain (Optional)

1. In your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `portal.yourcompany.com`)
4. Follow Cloudflare's DNS instructions
5. Update your `FRONTEND_URL` environment variable in Railway to match

### 4. Update Backend CORS

After deploying, update your Railway environment variable:
```
FRONTEND_URL = https://your-project.pages.dev
```

Or if using a custom domain:
```
FRONTEND_URL = https://portal.yourcompany.com
```

## Build Configuration Summary

- **Framework:** Vite
- **Build Command:** `cd web && npm install && npm run build`
- **Output Directory:** `web/dist`
- **Node Version:** 18 (default, or 20)

## Environment Variables Needed

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Your Railway API URL | `https://api.railway.app` |

## Troubleshooting

### Build Fails
- Check build logs in Cloudflare dashboard
- Verify Node version (should be 18 or 20)
- Ensure all dependencies are in `package.json`

### 404 Errors on Page Refresh
- Verify `_redirects` file exists in `web/public/`
- Check that it contains: `/*    /index.html   200`

### API Calls Fail
- Verify `VITE_API_URL` is set correctly
- Check CORS settings on backend
- Verify Railway API is accessible

### Assets Not Loading
- Check that public folder files are included
- Verify build output includes all assets
- Check browser console for 404 errors

## Post-Deployment Checklist

- [ ] Site loads at Cloudflare Pages URL
- [ ] Login page works
- [ ] API calls succeed (check network tab)
- [ ] All routes work (try refreshing on different pages)
- [ ] Images/assets load correctly
- [ ] Environment variables are set
- [ ] Custom domain configured (if applicable)

## Continuous Deployment

Cloudflare Pages automatically deploys when you push to your main branch. To deploy manually:

1. Go to your Pages project
2. Click **Deployments**
3. Click **Retry deployment** on any deployment
4. Or trigger a new deployment from the dashboard
