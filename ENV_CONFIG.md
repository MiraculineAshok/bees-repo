Cloudinary (images)
-------------------
Set these environment variables for Cloudinary uploads to work (Render → Environment):

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Without these, the server will fall back to local uploads (`/uploads` or `/tmp`).

# Environment Variables Configuration

This document lists all the environment variables used in the Zoho OAuth integration.

## Required Environment Variables

### OAuth Credentials
- `ZOHO_CLIENT_ID` - Your Zoho OAuth client ID
- `ZOHO_CLIENT_SECRET` - Your Zoho OAuth client secret
- `ZOHO_REDIRECT_URL` - The redirect URI registered with Zoho

### OAuth Flow Parameters
- `ZOHO_SCOPE` - OAuth scope (default: "email")
- `ZOHO_RESPONSE_TYPE` - Response type (default: "code")
- `ZOHO_ACCESS_TYPE` - Access type (default: "offline")
- `ZOHO_PROMPT` - Prompt parameter (default: "consent")
- `ZOHO_GRANT_TYPE` - Grant type for token exchange (default: "authorization_code")
- `ZOHO_STATE` - State parameter for security (default: "default-state")

### API Endpoints
- `ZOHO_AUTH_URL` - Zoho authorization endpoint (default: "https://accounts.zoho.in/oauth/v2/auth")
- `ZOHO_TOKEN_URL` - Zoho token exchange endpoint (default: "https://accounts.zoho.in/oauth/v2/token")

### Optional Parameters
- `ZOHO_COOKIE_HEADER` - Cookie header for session management

### Server Configuration
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: "development")

## Example .env File

```bash
# Zoho OAuth Configuration
ZOHO_CLIENT_ID=1000.9OLXK925B3ZYBG3SXCSQSX5WYS251A
ZOHO_CLIENT_SECRET=112e208ce2abddeac835b26d228580362477ba9653
ZOHO_REDIRECT_URL=http://localhost:3000/getCode
ZOHO_SCOPE=email
ZOHO_RESPONSE_TYPE=code
ZOHO_ACCESS_TYPE=offline
ZOHO_PROMPT=consent
ZOHO_GRANT_TYPE=authorization_code
ZOHO_STATE=default-state
ZOHO_AUTH_URL=https://accounts.zoho.in/oauth/v2/auth
ZOHO_TOKEN_URL=https://accounts.zoho.in/oauth/v2/token
ZOHO_COOKIE_HEADER=iamcsr=57700fb3-ff9f-4fac-8c09-656eb8a2576b; zalb_6e73717622=680d8e643c8d4f4ecb79bf7c0a6012e8
PORT=3000
NODE_ENV=development
```

## Usage

1. Create a `.env` file in the project root
2. Copy the example values above
3. Update with your actual Zoho OAuth credentials
4. The server will automatically load these environment variables

## Security Notes

- Never commit your `.env` file to version control
- Keep your `ZOHO_CLIENT_SECRET` secure
- Use different credentials for development and production environments
