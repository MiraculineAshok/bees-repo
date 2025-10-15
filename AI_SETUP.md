# 🤖 AI Question Generation Setup Guide

This guide will help you set up OpenAI integration for AI-powered interview question generation.

## 🎯 What You'll Get

- **AI-Generated Questions**: Create contextual interview questions based on tags
- **Difficulty Levels**: Beginner, Intermediate, Advanced question generation
- **Tag-Based Context**: Questions relevant to specific technologies/topics
- **Rich Text Support**: Generated questions with proper formatting

## 📋 Prerequisites

1. **OpenAI Account**: You need an OpenAI account with API access
2. **API Credits**: Small amount of credits for question generation (~$0.001-0.002 per question)
3. **Environment Access**: Ability to set environment variables (locally or on Render)

## 🚀 Quick Setup

### Step 1: Get Your OpenAI API Key

1. **Visit OpenAI Platform**
   - Go to: https://platform.openai.com/
   - Sign in or create an account

2. **Generate API Key**
   - Navigate to: https://platform.openai.com/api-keys
   - Click "**Create new secret key**"
   - Give it a name (e.g., "BEES Interview Platform")
   - **Copy the key immediately** (starts with `sk-`)
   - ⚠️ **Important**: You can only see this key once!

3. **Add Credits (if needed)**
   - Go to: https://platform.openai.com/account/billing
   - Add a small amount ($5-10 is plenty for testing)

### Step 2: Configure Environment Variable

#### Option A: Local Development (.env file)

1. **Open your `.env` file** in the project root
2. **Add the OpenAI API key**:
   ```bash
   # AI Question Generation
   OPENAI_API_KEY=sk-your-actual-api-key-here
   OPENAI_MODEL=gpt-3.5-turbo
   ```
3. **Save the file**
4. **Restart your server**: `npm start`

#### Option B: Render Deployment

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com/
   - Select your BEES service

2. **Add Environment Variable**
   - Click "**Environment**" tab
   - Click "**Add Environment Variable**"
   - **Key**: `OPENAI_API_KEY`
   - **Value**: `sk-your-actual-api-key-here`
   - Click "**Save Changes**"

3. **Automatic Redeploy**
   - Render will automatically redeploy your service
   - Wait for deployment to complete (~2-3 minutes)

## 🧪 Testing the Setup

### Step 1: Access Interview Session
1. Go to any interview session in your BEES platform
2. Look for the new action buttons at the bottom

### Step 2: Try AI Generation
1. Click "**🤖 Generate Question from AI**"
2. Enter relevant tags:
   - **Frontend**: `javascript, react, css, html`
   - **Backend**: `python, django, database, api`
   - **Data Science**: `python, pandas, machine-learning`
   - **DevOps**: `docker, kubernetes, aws, ci-cd`

3. Select difficulty level
4. Click "**🤖 Generate Question**"

### Step 3: Verify Results
- ✅ **Success**: Question appears in the editor
- ❌ **Error**: Check the troubleshooting section below

## 🎨 How to Use AI Questions

### During Interviews:

1. **Generate Context-Specific Questions**
   ```
   Tags: "react, hooks, state-management"
   → AI generates React hooks interview question
   ```

2. **Adjust Difficulty**
   - **Beginner**: Basic concepts and syntax
   - **Intermediate**: Problem-solving and best practices  
   - **Advanced**: Architecture and optimization

3. **Edit Generated Questions**
   - Questions appear in rich text editor
   - Modify as needed before adding
   - Add images, formatting, code blocks

4. **Add to Interview or Question Bank**
   - **Add Question**: Adds to current interview
   - **Add to Bank**: Saves for future use

## 💰 Cost Information

### Pricing Breakdown:
- **Model**: GPT-3.5-turbo
- **Cost per question**: ~$0.001-0.002
- **500 questions**: ~$0.50-1.00
- **Monthly usage (heavy)**: ~$5-10

### Cost Control:
- Questions are generated on-demand only
- No background processing or storage
- You control exactly when API is called

## 🔧 Troubleshooting

### Common Issues:

#### ❌ "AI question generation is not configured"
**Solution**: OpenAI API key not set
1. Check your `.env` file or Render environment variables
2. Ensure key starts with `sk-`
3. Restart server after adding key

#### ❌ "Failed to generate question from AI service"
**Possible Causes**:
1. **Invalid API Key**: Double-check your key
2. **No Credits**: Add billing to your OpenAI account
3. **Rate Limits**: Wait a moment and try again
4. **Network Issues**: Check internet connection

#### ❌ "Internal server error while generating question"
**Solutions**:
1. Check server logs for detailed error
2. Verify OpenAI service status
3. Try with simpler tags first

### Debug Steps:

1. **Check Server Logs**
   ```bash
   # Local development
   npm start
   
   # Look for OpenAI-related errors in console
   ```

2. **Test API Key Manually**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer sk-your-api-key"
   ```

3. **Verify Environment Variables**
   ```javascript
   // In server console
   console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not Set');
   ```

## 🔒 Security Best Practices

### API Key Security:
- ✅ **Never commit** API keys to git
- ✅ **Use environment variables** only
- ✅ **Rotate keys** periodically
- ✅ **Monitor usage** on OpenAI dashboard

### Access Control:
- Only authenticated users can generate questions
- API calls are logged in audit system
- Usage is tied to specific user sessions

## 🎯 Advanced Configuration

### Custom Model Settings:
You can customize the AI behavior by modifying the server code:

```javascript
// In server.js - AI Question Generation API
{
    model: 'gpt-3.5-turbo',        // or 'gpt-4' for better quality
    max_tokens: 500,               // Increase for longer questions
    temperature: 0.7,              // 0.1-1.0 (creativity level)
}
```

### Custom Prompts:
Modify the prompt in `/server.js` to change question style:
- Add company-specific context
- Include specific frameworks or tools
- Adjust question format or structure

## 📞 Support

### If You Need Help:
1. **Check this guide** for common solutions
2. **Review server logs** for specific errors
3. **Test with simple tags** first (e.g., "javascript")
4. **Verify OpenAI account** has sufficient credits

### Working Configuration Example:
```bash
# .env file
OPENAI_API_KEY=sk-1234567890abcdef...
OPENAI_MODEL=gpt-3.5-turbo

# Server should log on startup:
✅ OpenAI API configured successfully
```

---

**🎉 Once configured, you'll have AI-powered question generation available in all interview sessions!**

The AI will help create contextual, relevant interview questions tailored to specific technologies and difficulty levels, making your interviews more effective and comprehensive.
