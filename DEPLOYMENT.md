# Deployment Guide for Render

## Database Setup (Neon Postgres)

### 1. Create Neon Database
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string (both direct and pooled)

### 2. Render Environment Variables
Set these in your Render service settings:

```bash
# Database (Neon Postgres)
DATABASE_URL=postgresql://neondb_owner:npg_dI2XKrE5lcbZ@ep-crimson-field-adzgxrr5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_POOL_URL=postgresql://neondb_owner:npg_dI2XKrE5lcbZ@ep-crimson-field-adzgxrr5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Base URL (update with your Render URL)
BASE_URL=https://your-app-name.onrender.com

# Zoho OAuth
ZOHO_CLIENT_ID=1000.UL4MAM5ZPKYPTLH1M3DABTDVC964ZW
ZOHO_CLIENT_SECRET=2e4e1d8cb9dc7cde4f515b0f9615cbaafb557c6e9a
ZOHO_REDIRECT_URL=https://your-app-name.onrender.com/getCode

# Server
NODE_ENV=production
PORT=10000
```

### 3. Update Zoho OAuth Settings
1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Update your OAuth application redirect URI to:
   ```
   https://your-app-name.onrender.com/getCode
   ```

## Database Schema

The application automatically creates a `users` table with:
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR, UNIQUE)
- `name` (VARCHAR) - extracted from email
- `role` (VARCHAR) - 'user' or 'admin' based on email domain
- `zoho_user_id` (VARCHAR) - from JWT payload
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Endpoints

- `GET /` - Main application
- `GET /health` - Health check
- `GET /api/hello` - Test endpoint
- `GET /api/users` - Get all users (admin)
- `GET /api/user/:email` - Get user by email
- `GET /authredirction` - OAuth authorization
- `GET /getCode` - OAuth callback

## User Role Logic

- Users with `@zohotest.com` or `@zoho.com` emails get `admin` role
- All other users get `user` role
- Name is extracted from email (part before @)

## Scaling Notes

- Database connection pool is set to max 5 per instance
- Safe for multiple Render instances
- Neon handles connection pooling automatically
- No data loss during redeploys
