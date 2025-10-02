# Coolify Deployment Guide

This guide covers deploying the SERP Email application to Coolify on Ubuntu server at `192.168.0.103`.

## Prerequisites

1. Coolify installed and running on Ubuntu server (192.168.0.103)
2. Git repository accessible from the server
3. Required environment variables configured

## Environment Variables

Configure the following environment variables in Coolify:

### Database
```
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key
CLERK_SECRET_KEY=sk_live_your_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Stripe (if enabled)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### App Configuration
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate_a_secure_random_string
NODE_ENV=production
```

## Deployment Steps

1. **Add Application in Coolify**
   - Go to your Coolify dashboard
   - Click "Add New Resource" → "Application"
   - Select "Git Repository"

2. **Configure Git Repository**
   - Repository URL: Your Git repository URL
   - Branch: `main`
   - Build Pack: Select "Dockerfile"

3. **Configure Build Settings**
   - The `Dockerfile` in the repository will be used automatically
   - Build Command: (handled by Dockerfile)
   - Start Command: (handled by Dockerfile)

4. **Set Environment Variables**
   - In Coolify, go to your application settings
   - Add all environment variables listed above
   - Save configuration

5. **Configure Ports**
   - Internal Port: `3000`
   - Public Port: `80` or `443` (with SSL)

6. **Deploy**
   - Click "Deploy" button
   - Monitor build logs
   - Wait for deployment to complete

7. **Post-Deployment**
   - Run database migrations if needed
   - Verify application is running
   - Test authentication flows
   - Check Clerk webhooks are configured

## Database Setup

Ensure your PostgreSQL database is accessible from the Coolify server:

1. Create database user and database
2. Run Prisma migrations:
   ```bash
   pnpm db:push
   ```
3. Set up Supabase RLS policies (if using Supabase)

## SSL/HTTPS Configuration

Coolify handles SSL automatically with Let's Encrypt:
- Add your domain in Coolify settings
- Enable "Generate SSL Certificate"
- Update Clerk and Stripe webhooks with HTTPS URLs

## Monitoring

- Access application logs in Coolify dashboard
- Monitor performance and errors
- Set up alerts if needed

## Troubleshooting

### Build Fails
- Check build logs in Coolify
- Verify all dependencies are in package.json
- Ensure Node.js version matches (18+)

### Application Won't Start
- Check environment variables are set correctly
- Verify DATABASE_URL is accessible
- Review startup logs

### Authentication Issues
- Verify Clerk keys are correct
- Check NEXT_PUBLIC_APP_URL matches your domain
- Ensure Clerk webhooks point to correct URL

## Updates

To deploy updates:
1. Push changes to your Git repository
2. Coolify will auto-deploy (if configured) or click "Redeploy"

## Rollback

To rollback to a previous version:
1. Go to deployment history in Coolify
2. Select previous successful deployment
3. Click "Redeploy"
