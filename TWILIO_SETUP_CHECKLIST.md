# Twilio Setup Checklist

## ✅ Your Twilio Credentials

**⚠️ SECURITY WARNING: These credentials are sensitive. Never commit them to git or share them publicly.**

**Store your Twilio credentials securely:**
- **Account SID**: Get from Twilio Console → Account → API Keys & Tokens
- **Auth Token**: Get from Twilio Console → Account → API Keys & Tokens  
- **From Number**: Your Twilio phone number (E.164 format, e.g., `+1234567890`)

## 📋 Setup Steps

### 1. Set Environment Variables in Render

Go to your Render dashboard → Your Service → Environment tab → Add the following:

```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
```

**Replace the placeholder values with your actual Twilio credentials.**

### 2. Verify Twilio Account

- ✅ Account SID format should start with `AC`
- ✅ Auth Token should be 32 characters
- ✅ Phone number should be in E.164 format (e.g., `+1234567890`)

### 3. Test SMS Sending

After setting environment variables and redeploying:

1. Go to Admin Dashboard → Consolidation
2. Click "Send Mail" on any record
3. Select "SMS" in the communication type modal
4. The SMS popup should show your from number (your configured Twilio number)
5. Enter a phone number and message
6. Click "Send"

### 4. Check Twilio Console

After sending a test SMS:
- Go to [Twilio Console](https://console.twilio.com/)
- Navigate to Monitor → Logs → Messaging
- You should see your test message with status (queued, sent, delivered, failed)

## 🔍 Troubleshooting

### If SMS doesn't send:

1. **Check Environment Variables**: Verify all three variables are set in Render
2. **Check Twilio Console**: Look for error messages in Twilio logs
3. **Verify Phone Number**: Ensure recipient number is in E.164 format
4. **Check Account Balance**: Ensure your Twilio account has sufficient credits
5. **Trial Account Limits**: If using a trial account, verify the recipient number is verified

### Common Issues:

- **"Twilio client not initialized"**: Environment variables not set correctly
- **"Invalid phone number"**: Phone number not in E.164 format
- **"Failed to send SMS"**: Check Twilio account balance and phone number verification

## 📱 WhatsApp Setup (Optional)

To enable WhatsApp messaging:

1. Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Join the sandbox by sending the join code to `+1 415 523 8886`
3. Add this environment variable in Render:
   ```
   TWILIO_WHATSAPP_FROM_NUMBER=whatsapp:+14155238886
   ```

## ✅ Verification Checklist

- [ ] Environment variables set in Render dashboard
- [ ] Service redeployed after adding variables
- [ ] From number displays correctly in SMS popup (your Twilio number)
- [ ] Test SMS sent successfully
- [ ] SMS appears in Twilio Console logs
- [ ] SMS logs appear in Admin Dashboard → Settings → SMS Logs

## 🎉 Ready to Use!

Once environment variables are set and the service is redeployed, SMS/WhatsApp messaging will be fully functional!

