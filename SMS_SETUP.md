# SMS/WhatsApp Messaging Setup Guide

## Overview

This application now supports sending SMS and WhatsApp messages using Twilio. The implementation includes:

- **SMS Service**: Handles SMS and WhatsApp message sending via Twilio API
- **SMS Logs**: Tracks all sent, failed, and drafted SMS/WhatsApp messages
- **Templates**: SMS templates can be created and used for sending messages
- **Variable Replacement**: Support for dynamic fields (e.g., `${student_name}`)

## Prerequisites

1. **Twilio Account**: Sign up at [https://www.twilio.com](https://www.twilio.com)
2. **Twilio Phone Number**: Purchase a phone number from Twilio (for SMS)
3. **WhatsApp Business Account** (Optional): For WhatsApp messaging via Twilio

## Environment Variables

Add the following environment variables to your `.env` file or Render dashboard:

```bash
# Twilio Configuration (Required for SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890  # Your Twilio phone number (E.164 format)

# WhatsApp Configuration (Optional - for WhatsApp messaging)
TWILIO_WHATSAPP_FROM_NUMBER=whatsapp:+14155238886  # Twilio WhatsApp sandbox number
```

### Getting Your Twilio Credentials

1. **Account SID & Auth Token**:
   - Log in to your Twilio Console
   - Go to Account → API Keys & Tokens
   - Copy your Account SID and Auth Token

2. **Phone Number**:
   - Go to Phone Numbers → Manage → Buy a number
   - Purchase a phone number (supports SMS)
   - Copy the number in E.164 format (e.g., `+1234567890`)

3. **WhatsApp Setup** (Optional):
   - Go to Messaging → Try it out → Send a WhatsApp message
   - Follow the instructions to join the Twilio WhatsApp sandbox
   - Use the sandbox number: `whatsapp:+14155238886`
   - For production, you'll need WhatsApp Business API approval

## Database Setup

The SMS logs table is automatically created when the application starts. If you need to create it manually:

```bash
psql $DATABASE_URL -f db/migrations/025_create_sms_logs.sql
```

## API Endpoints

### Send SMS/WhatsApp

**POST** `/api/admin/send-sms`

**Request Body:**
```json
{
  "from": "+1234567890",
  "to": "+9876543210,+1112223333",
  "message": "Hello ${student_name}, your interview is scheduled.",
  "message_type": "sms",  // or "whatsapp"
  "consolidation_id": 123,
  "status": "sent"  // or "drafted" to save as draft
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS sent successfully to 2 recipient(s)",
  "results": [
    { "to": "+9876543210", "success": true, "sid": "SM123..." },
    { "to": "+1112223333", "success": true, "sid": "SM456..." }
  ],
  "logId": 1
}
```

### Get SMS Logs

**GET** `/api/admin/sms-logs?status=sent|failed|drafted`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "from_number": "+1234567890",
      "to_numbers": "+9876543210,+1112223333",
      "message": "Hello John, your interview is scheduled.",
      "message_type": "sms",
      "status": "sent",
      "sent_at": "2024-01-01T12:00:00Z",
      "sent_by": 1
    }
  ]
}
```

## Phone Number Format

Phone numbers should be in E.164 format:
- **Correct**: `+919876543210`, `+1234567890`
- **Incorrect**: `9876543210`, `09876543210`

The service automatically formats Indian numbers:
- `9876543210` → `+919876543210`
- `09876543210` → `+919876543210`

## Variable Replacement

SMS messages support the same variable replacement as emails:
- `${student_name}` - Student's full name
- `${student_email}` - Student's email
- `${zeta_id}` - Student's Zeta ID
- `${session_name}` - Interview session name
- `${status}` - Interview status
- `${last_interview_at}` - Last interview date/time

## Testing

### Test SMS Sending

1. Set up your Twilio credentials in environment variables
2. Use the API endpoint or UI to send a test SMS
3. Check Twilio Console → Logs → Messaging for delivery status

### Test WhatsApp (Sandbox)

1. Join Twilio WhatsApp sandbox by sending `join <code>` to `+1 415 523 8886`
2. Use `whatsapp:+14155238886` as the `from` number
3. Send messages to your WhatsApp number

## Troubleshooting

### "Twilio client not initialized"
- Check that `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set
- Verify credentials in Twilio Console

### "Invalid phone number"
- Ensure phone numbers are in E.164 format
- Check that country code is included

### "Failed to send SMS"
- Verify your Twilio account has sufficient balance
- Check Twilio Console for error details
- Ensure phone number is verified (for trial accounts)

### WhatsApp Not Working
- Verify you've joined the Twilio WhatsApp sandbox
- Check that `TWILIO_WHATSAPP_FROM_NUMBER` is set correctly
- For production, ensure WhatsApp Business API is approved

## Cost Considerations

- **SMS**: Typically $0.0075 - $0.01 per message (varies by country)
- **WhatsApp**: Similar pricing to SMS
- **Trial Account**: Limited credits for testing

## Next Steps

1. ✅ Backend SMS service implemented
2. ✅ SMS logs table created
3. ✅ SMS sending API endpoint created
4. ⏳ UI for SMS sending (in progress)
5. ⏳ SMS logs UI in settings (pending)
6. ⏳ Update communication type modal (pending)

## Support

For Twilio-specific issues:
- Twilio Documentation: https://www.twilio.com/docs
- Twilio Support: https://support.twilio.com

