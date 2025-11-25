# Email Configuration Guide

## Overview
The email sending functionality uses `nodemailer` to send emails via SMTP. You need to configure email credentials as environment variables.

## Environment Variables Required

Add these to your `.env` file or environment:

### For Gmail:
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # NOT your regular Gmail password!
EMAIL_SERVICE=gmail
EMAIL_FROM_NAME=BEES Interview Platform  # Optional: Display name
```

### For Custom SMTP (e.g., Outlook, SendGrid, etc.):
```bash
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
EMAIL_HOST=smtp.domain.com
EMAIL_PORT=587
EMAIL_SECURE=true  # Use 'false' for port 587, 'true' for port 465
EMAIL_FROM_NAME=BEES Interview Platform  # Optional
```

## Gmail Setup Instructions

1. **Enable 2-Step Verification** on your Google Account
2. **Generate an App Password**:
   - Go to Google Account → Security
   - Under "2-Step Verification", click "App passwords"
   - Generate a new app password for "Mail"
   - Use this 16-character password (not your regular Gmail password)

## Testing Email Configuration

After setting up environment variables, restart your server and try sending an email from the consolidation view. Check server logs for:
- ✅ "Email transporter verified successfully" - Configuration is correct
- ✅ "Email sent successfully" - Email was sent
- ❌ Error messages will indicate what needs to be fixed

## Troubleshooting

### "Email service not configured"
- Make sure EMAIL_USER and EMAIL_PASSWORD are set in your environment

### "Invalid login" or "Authentication failed"
- For Gmail: Make sure you're using an App Password, not your regular password
- Check that 2-Step Verification is enabled
- Verify the email and password are correct

### "Connection timeout"
- Check your firewall/network settings
- Verify EMAIL_HOST and EMAIL_PORT are correct
- Try EMAIL_SECURE=false for port 587

### "Email sent successfully" but email not received
- Check spam/junk folder
- Verify recipient email address is correct
- Check sender email reputation
- Some email providers may delay delivery

## Security Notes

- Never commit `.env` file with credentials to git
- Use App Passwords instead of regular passwords when possible
- Consider using a dedicated email service account for production
- Rotate passwords regularly

