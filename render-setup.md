# Render Deployment Setup

## Environment Variables Required

You need to set the following environment variables in your Render dashboard:

### 1. Database Configuration
```
DATABASE_URL=postgresql://neondb_owner:npg_dI2XKrE5lcbZ@ep-crimson-field-adzgxrr5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 2. Base URL
```
BASE_URL=https://bees-repo.onrender.com
```

### 3. Zoho OAuth (Optional)
```
ZOHO_CLIENT_ID=1000.UL4MAM5ZPKYPTLH1M3DABTDVC964ZW
ZOHO_CLIENT_SECRET=2e4e1d8cb9dc7cde4f515b0f9615cbaafb557c6e9a
ZOHO_REDIRECT_URL=https://bees-repo.onrender.com/getCode
```

## How to Set Environment Variables in Render

1. Go to your Render dashboard
2. Select your `bees-repo` service
3. Go to the "Environment" tab
4. Add each environment variable:
   - Click "Add Environment Variable"
   - Enter the key (e.g., `DATABASE_URL`)
   - Enter the value (e.g., the PostgreSQL connection string)
   - Click "Save Changes"
5. After adding all variables, click "Deploy Latest Commit" to restart your service

## Verification

After setting the environment variables and redeploying, check the logs to see:
- ✅ Database URL found: Yes
- ✅ Database connection test successful
- ✅ Database initialized successfully

If you see these messages, your database connection is working properly.
