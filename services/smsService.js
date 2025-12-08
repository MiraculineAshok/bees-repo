const twilio = require('twilio');

class SMSService {
  constructor() {
    // Twilio configuration from environment variables
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER; // Your Twilio phone number or WhatsApp number
    this.whatsappFromNumber = process.env.TWILIO_WHATSAPP_FROM_NUMBER; // WhatsApp: whatsapp:+14155238886
    
    // Initialize Twilio client if credentials are available
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    } else {
      console.warn('⚠️ Twilio credentials not configured. SMS/WhatsApp functionality will be disabled.');
    }
  }

  /**
   * Format phone number to E.164 format (required by Twilio)
   * @param {string} phoneNumber - Phone number in any format
   * @returns {string} - Formatted phone number in E.164 format
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If number starts with 0, replace with country code (assuming India +91)
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    // If number doesn't start with country code, add +91 (India)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    // Add + prefix
    return '+' + cleaned;
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - True if valid
   */
  isValidPhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    const formatted = this.formatPhoneNumber(phoneNumber);
    // E.164 format: + followed by 1-15 digits
    return /^\+[1-9]\d{1,14}$/.test(formatted);
  }

  /**
   * Send SMS message
   * @param {string} to - Recipient phone number
   * @param {string} message - Message text
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendSMS(to, message) {
    if (!this.client) {
      throw new Error('Twilio client not initialized. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }

    if (!this.fromNumber) {
      throw new Error('TWILIO_FROM_NUMBER not configured.');
    }

    const formattedTo = this.formatPhoneNumber(to);
    if (!this.isValidPhoneNumber(formattedTo)) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedTo
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from
      };
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Send WhatsApp message
   * @param {string} to - Recipient phone number
   * @param {string} message - Message text
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendWhatsApp(to, message) {
    if (!this.client) {
      throw new Error('Twilio client not initialized. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }

    // Use WhatsApp from number or fallback to regular from number with whatsapp: prefix
    const whatsappFrom = this.whatsappFromNumber || `whatsapp:${this.fromNumber}`;
    
    if (!whatsappFrom) {
      throw new Error('TWILIO_WHATSAPP_FROM_NUMBER or TWILIO_FROM_NUMBER not configured.');
    }

    const formattedTo = this.formatPhoneNumber(to);
    if (!this.isValidPhoneNumber(formattedTo)) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: whatsappFrom.startsWith('whatsapp:') ? whatsappFrom : `whatsapp:${whatsappFrom}`,
        to: `whatsapp:${formattedTo}`
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from
      };
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  /**
   * Send message (SMS or WhatsApp)
   * @param {string} to - Recipient phone number
   * @param {string} message - Message text
   * @param {string} messageType - 'sms' or 'whatsapp'
   * @returns {Promise<Object>} - Result object
   */
  async sendMessage(to, message, messageType = 'sms') {
    if (messageType === 'whatsapp') {
      return await this.sendWhatsApp(to, message);
    } else {
      return await this.sendSMS(to, message);
    }
  }

  /**
   * Send bulk messages
   * @param {Array<string>} toNumbers - Array of recipient phone numbers
   * @param {string} message - Message text
   * @param {string} messageType - 'sms' or 'whatsapp'
   * @returns {Promise<Array>} - Array of results
   */
  async sendBulkMessages(toNumbers, message, messageType = 'sms') {
    const results = [];
    
    for (const to of toNumbers) {
      try {
        const result = await this.sendMessage(to, message, messageType);
        results.push({ to, success: true, ...result });
      } catch (error) {
        results.push({ to, success: false, error: error.message });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

module.exports = new SMSService();

