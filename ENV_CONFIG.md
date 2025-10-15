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

### AI Question Generation (Optional)
- `OPENAI_API_KEY` - Your OpenAI API key for AI-powered question generation
- `OPENAI_MODEL` - OpenAI model to use (default: "gpt-3.5-turbo")

### Database Connection Pool (Optional)
- `DB_POOL_MAX` - Maximum database connections (default: 20)

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

# Server Configuration
PORT=3000
NODE_ENV=development

# AI Question Generation (Optional)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Database Configuration (Optional)
DB_POOL_MAX=20
```

## Usage

1. Create a `.env` file in the project root
2. Copy the example values above
3. Update with your actual Zoho OAuth credentials
4. (Optional) Add your OpenAI API key for AI question generation
5. The server will automatically load these environment variables

## OpenAI API Setup (For AI Question Generation)

### Step 1: Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the generated API key (starts with `sk-`)

### Step 2: Add to Environment Variables

#### For Local Development:
Add to your `.env` file:
```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

#### For Render Deployment:
1. Go to your Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Add new environment variable:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** `sk-your-actual-api-key-here`
5. Click "Save Changes"
6. Your service will automatically redeploy

### Step 3: Test AI Question Generation
1. Go to any interview session
2. Click "🤖 Generate Question from AI"
3. Enter tags (e.g., "javascript, react, algorithms")
4. Click "🤖 Generate Question"
5. The AI will generate a relevant interview question

### API Usage & Costs
- Uses OpenAI GPT-3.5-turbo model
- Approximate cost: $0.001-0.002 per question
- Questions are generated with 500 max tokens
- No questions are stored by OpenAI (per their API policy)

### Troubleshooting
- **Error: "AI question generation is not configured"** → API key not set
- **Error: "Failed to generate question from AI service"** → Invalid API key or quota exceeded
- **Error: "Internal server error"** → Check server logs for detailed error

## Security Notes

- Never commit your `.env` file to version control
- Keep your `ZOHO_CLIENT_SECRET` and `OPENAI_API_KEY` secure
- Use different credentials for development and production environments
- Monitor your OpenAI usage to avoid unexpected costs
