# Email Configuration Guide

## Overview
The email sending functionality uses `nodemailer` to send emails via SMTP. You need to configure email credentials as environment variables.

## Environment Variables Required

Add these to your `.env` file or environment:

### For Zoho Mail (Domain-based emails like admissions@zohoschools.in):
```bash
EMAIL_USER=admissions@zohoschools.in
EMAIL_PASSWORD=your-zoho-password  # Your Zoho Mail account password
EMAIL_HOST=smtppro.zoho.in  # Use .in for India datacenter, .com for others
EMAIL_PORT=465  # Use 465 for SSL (recommended) or 587 for TLS
EMAIL_SECURE=true  # Use 'true' for port 465 (SSL), 'false' for port 587 (TLS)
EMAIL_FROM_NAME=Admissions_Zoho Schools  # Optional: Display name (default: Admissions_Zoho Schools)
```

**Note:** 
- For India datacenter accounts, use `smtppro.zoho.in` (check your Zoho Mail settings to confirm)
- For other datacenters, use `smtppro.zoho.com`
- The code will automatically try both `.in` and `.com` servers if authentication fails
- If you have 2FA enabled, you may need to use an Application-specific Password instead of your regular password

**Zoho Mail SMTP Settings:**
- **SSL Configuration (Recommended):** `smtppro.zoho.in` or `smtppro.zoho.com`, Port `465`, `EMAIL_SECURE=true`
- **TLS Configuration:** `smtppro.zoho.in` or `smtppro.zoho.com`, Port `587`, `EMAIL_SECURE=false`

### For Gmail:
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # NOT your regular Gmail password!
EMAIL_SERVICE=gmail
EMAIL_FROM_NAME=Admissions_Zoho Schools  # Optional: Display name (default: Admissions_Zoho Schools)
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

## Zoho Mail Setup Instructions

### Step 1: Enable SMTP Access in Zoho Mail
**CRITICAL:** SMTP access must be enabled in your Zoho Mail settings before it will work!

1. **Login to Zoho Mail** web interface with your account (admissions@zohoschools.in)
2. Go to **Settings** → **Mail Accounts**
3. Click on your primary email address (admissions@zohoschools.in)
4. Scroll down to the **SMTP** section
5. **Check the "SMTP Access" checkbox** to enable SMTP access
6. Click **Save**

**Reference:** [Zoho Mail IMAP/SMTP Access Guide](https://www.zoho.com/mail/help/imap-access.html#EnableIMAP)

### Step 2: Get Your Password or Application-specific Password

**If you have Two-Factor Authentication (2FA) enabled:**
- You **MUST** use an Application-specific Password, not your regular password
- Go to Zoho Account → Security → Application-specific Passwords
- Generate a new password for "Mail" or "SMTP"
- Use this password in `EMAIL_PASSWORD`

**If you use Federated Sign-In (Google, SAML, etc.):**
- You **MUST** generate an Application-specific Password
- You cannot use your external account password for SMTP
- Go to Zoho Account → Security → Application-specific Passwords
- Generate a new password for "Mail" or "SMTP"

**If you have a regular Zoho account password:**
- Try using your regular password first
- If it doesn't work, generate an Application-specific Password as a fallback

### Step 3: Configure Environment Variables
Set the environment variables in Render as shown in the configuration section above.

### Step 4: Test the Configuration
After setting up, restart your server and try sending a test email. Check server logs for detailed error messages.

**Reference:** [Zoho Mail SMTP Configuration](https://www.zoho.com/mail/help/zoho-smtp.html)

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

### "Invalid login" or "Authentication failed" (Error 535)
**For Zoho Mail specifically - Follow these steps IN ORDER:**

1. **CRITICAL: Enable SMTP Access in Zoho Mail Settings:**
   - Login to Zoho Mail web interface
   - Go to **Settings** → **Mail Accounts** → Click your email address
   - Scroll down to **SMTP** section
   - **Check the "SMTP Access" checkbox** (this is often the main issue!)
   - Click **Save**
   - **Reference:** [Enable IMAP/SMTP Access](https://www.zoho.com/mail/help/imap-access.html#EnableIMAP)

2. **Check if You Need Application-specific Password:**
   - **If 2FA is enabled:** You MUST use Application-specific Password
   - **If you use Federated Sign-In (Google/SAML):** You MUST use Application-specific Password
   - **If you have regular password:** Try regular password first, then app password if it fails
   - To generate: Zoho Account → Security → Application-specific Passwords → Generate for "Mail"

3. **Verify Email Address Format:**
   - Ensure EMAIL_USER matches your Zoho account email exactly (case-sensitive)
   - For domain-based emails: Use the full email (e.g., `admissions@zohoschools.in`)
   - No extra spaces before/after

4. **Verify Password:**
   - Copy password exactly - no extra spaces before/after
   - Password length should match what you see in Zoho
   - If using app password, make sure it was generated for "Mail" or "SMTP"

5. **SMTP Server Configuration:**
   - For domain-based emails (like admissions@zohoschools.in): Use `smtppro.zoho.com`
   - The code will automatically try both `smtppro.zoho.com` and `smtp.zoho.com`
   - The code will automatically try both port 587 (TLS) and 465 (SSL)

6. **Check Server Logs:**
   - Look for "📧 Trying SMTP Configuration" output
   - Check which SMTP server/port combinations were tried
   - Verify password length matches your actual password
   - Look for specific error codes and messages

**For Gmail:**
- Make sure you're using an App Password, not your regular password
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


