# Netlify Deployment Guide

This guide will walk you through deploying your KYC Adapter Frontend to Netlify.

## Prerequisites

- A Netlify account (sign up at [netlify.com](https://netlify.com))
- Your repository hosted on GitHub, GitLab, or Bitbucket
- Your backend API deployed and accessible
- Your backend URLs (API and WebSocket)

## Quick Start

### Step 1: Prepare Your Repository

1. Ensure all files are committed:
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push
   ```

2. Verify these files exist:
   - ✅ `netlify.toml` - Netlify configuration
   - ✅ `public/_redirects` - SPA routing redirects
   - ✅ `.env.example` - Environment variable template

### Step 2: Connect to Netlify (Dashboard Method)

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Sign in or create an account

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Netlify to access your repositories
   - Select the repository containing this frontend

3. **Configure Build Settings**
   - Netlify should auto-detect these from `netlify.toml`:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - If not auto-detected, manually enter:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Show advanced" and verify:
     - Node version: `18.x` or higher (or set in `.nvmrc`)

4. **Set Environment Variables**
   - Before deploying, click "Show advanced" → "New variable"
   - Add each of these variables:
     
     ```env
     VITE_API_URL=https://your-backend-api.com
     VITE_WS_URL=wss://your-backend-api.com
     VITE_API_KEYS_ONLY=false
     VITE_IDMETA_API_KEY=your-api-key-if-needed
     ```
   
   **Important**: 
   - Replace `https://your-backend-api.com` with your actual backend API URL
   - Use `https://` for API URL and `wss://` (secure WebSocket) for WS URL
   - Do NOT include `/api/v1` in the URL if your backend doesn't use it

5. **Deploy**
   - Click "Deploy site"
   - Wait for the build to complete (usually 2-3 minutes)
   - Your site will be live at `https://your-site-name.netlify.app`

### Step 3: Configure Custom Domain (Optional)

1. In Netlify dashboard, go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Enter your domain name
4. Follow the DNS configuration instructions
5. Netlify will automatically provision SSL certificates

## Using Netlify CLI (Alternative Method)

If you prefer using the command line:

### Initial Setup

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to your project directory
cd /path/to/CLIENT

# Initialize Netlify (first time only)
netlify init
```

When prompted:
- **Create & configure a new site**: Choose this option
- **Team**: Select your team
- **Site name**: Enter a name or press Enter for auto-generated name
- **Build command**: `npm run build` (should be auto-detected)
- **Directory to deploy**: `dist` (should be auto-detected)

### Set Environment Variables

```bash
# Set API URL
netlify env:set VITE_API_URL https://your-backend-api.com

# Set WebSocket URL (use wss:// for production)
netlify env:set VITE_WS_URL wss://your-backend-api.com

# Set feature flags
netlify env:set VITE_API_KEYS_ONLY false

# Optional: Set API key if needed
netlify env:set VITE_IDMETA_API_KEY your-key-here
```

### Deploy

```bash
# Deploy to production
netlify deploy --prod

# Or create a draft deployment first
netlify deploy
```

## Configuration Files Explained

### `netlify.toml`

This file configures:
- **Build settings**: Command and output directory
- **Redirects**: SPA routing support (redirects all routes to `index.html`)
- **Headers**: Security headers and caching
- **Asset caching**: Long-term caching for static assets

### `public/_redirects`

This file ensures React Router works correctly:
- Redirects all routes (`/*`) to `index.html` with a 200 status
- This allows client-side routing to work properly
- Netlify automatically serves this file

## Environment Variables

All environment variables for Vite must be prefixed with `VITE_`.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Your backend API URL | `https://api.example.com` |
| `VITE_WS_URL` | WebSocket URL for real-time updates | `wss://api.example.com` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_API_KEYS_ONLY` | Enable API key-only mode | `false` | `true` |
| `VITE_IDMETA_API_KEY` | API key for IDMeta integration | - | `your-key` |

## Post-Deployment Checklist

After deployment, verify:

- [ ] Site loads without errors
- [ ] All routes work (try navigating to different pages)
- [ ] API calls are successful (check browser console)
- [ ] WebSocket connections work (check browser console)
- [ ] Authentication works (try logging in)
- [ ] Environment variables are set correctly
- [ ] SSL certificate is active (should be automatic)
- [ ] Custom domain is configured (if applicable)

## Troubleshooting

### Build Fails

**Problem**: Build command fails
- **Solution**: Check build logs in Netlify dashboard
- Common issues:
  - TypeScript errors: Fix them locally first
  - Missing dependencies: Ensure `package.json` is correct
  - Node version: Set in `.nvmrc` or Netlify settings

### 404 Errors on Routes

**Problem**: Pages other than `/` show 404
- **Solution**: Ensure `public/_redirects` file exists and contains `/* /index.html 200`
- Verify the file is committed to your repository
- Check Netlify build logs to confirm the file is being copied

### API Calls Failing (CORS)

**Problem**: API requests blocked by CORS
- **Solution**: Configure CORS on your backend to allow your Netlify domain
- Add `https://your-site.netlify.app` to allowed origins

### Environment Variables Not Working

**Problem**: `import.meta.env.VITE_*` is undefined
- **Solution**: 
  - Ensure variables start with `VITE_`
  - Redeploy after adding/changing variables
  - Check variable names match exactly (case-sensitive)

### WebSocket Connection Fails

**Problem**: WebSocket can't connect
- **Solution**:
  - Use `wss://` (secure WebSocket) for production, not `ws://`
  - Ensure your backend supports secure WebSocket connections
  - Check firewall/network settings

### Backend Not Accessible

**Problem**: Can't reach backend API
- **Solution**:
  - Verify backend is deployed and running
  - Check backend URL is correct in environment variables
  - Test backend URL directly in browser/Postman
  - Ensure backend allows requests from your Netlify domain

## Continuous Deployment

Netlify automatically deploys when you push to your repository:

1. **Default branch** (usually `main` or `master`) → Production deployment
2. **Other branches** → Preview deployments
3. **Pull requests** → Deploy previews

### Branch Deploys

- Each branch gets a unique preview URL
- Perfect for testing before merging
- Uses the same environment variables as production

### Deploy Contexts

You can set different environment variables for different contexts:
- **Production**: Your main branch
- **Branch deploys**: Other branches
- **Deploy previews**: Pull requests

Set these in: **Site settings** → **Environment variables** → **Deploy contexts**

## Performance Optimization

Netlify automatically:
- ✅ Serves files from CDN
- ✅ Enables Gzip/Brotli compression
- ✅ Applies security headers
- ✅ Caches static assets

Your `netlify.toml` also includes:
- Asset caching (1 year for `/assets/*`)
- Security headers (X-Frame-Options, etc.)

## Support

If you encounter issues:
1. Check Netlify build logs
2. Check browser console for errors
3. Verify environment variables are set
4. Test your backend API directly
5. Check [Netlify documentation](https://docs.netlify.com)
6. Contact Netlify support if needed

---

**Happy Deploying! 🚀**

