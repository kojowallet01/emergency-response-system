// SMS Notification Service using Twilio
const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;

const initTwilio = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.warn('⚠️ Twilio credentials not configured. SMS notifications disabled.');
    return null;
  }
  
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS service initialized');
    return twilioClient;
  } catch (error) {
    console.error('❌ Error initializing Twilio:', error);
    return null;
  }
};

// Send SMS notification
const sendSMS = async (to, message) => {
  if (!twilioClient) {
    twilioClient = initTwilio();
  }
  
  if (!twilioClient) {
    console.log('SMS not sent - Twilio not configured');
    return { success: false, error: 'Twilio not configured' };
  }
  
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!fromNumber) {
    console.error('❌ TWILIO_PHONE_NUMBER not configured');
    return { success: false, error: 'Twilio phone number not configured' };
  }
  
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });
    
    console.log(`✅ SMS sent to ${to}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`❌ Error sending SMS to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send emergency alert SMS
const sendEmergencyAlert = async (phoneNumbers, report) => {
  const emergencyTypes = {
    fire: '🔥 FIRE',
    medical: '🏥 MEDICAL',
    crime: '🚔 CRIME'
  };
  
  const type = emergencyTypes[report.type] || report.type.toUpperCase();
  const location = `${report.latitude?.toFixed(4)}°, ${report.longitude?.toFixed(4)}°`;
  
  const message = `EMERGENCY ALERT!\n\n${type} Emergency Reported\n\nLocation: ${location}\n${report.description ? `Details: ${report.description}\n` : ''}Time: ${new Date(report.created_at).toLocaleString()}\n\nRespond immediately!`;
  
  const results = [];
  
  for (const phoneNumber of phoneNumbers) {
    const result = await sendSMS(phoneNumber, message);
    results.push({ phoneNumber, ...result });
  }
  
  return results;
};

// Send status change SMS
const sendStatusChangeAlert = async (phoneNumbers, report, oldStatus, newStatus) => {
  const statusEmojis = {
    pending: '🔴',
    responding: '🟡',
    resolved: '🟢'
  };
  
  const emergencyTypes = {
    fire: '🔥',
    medical: '🏥',
    crime: '🚔'
  };
  
  const message = `Status Update\n\n${emergencyTypes[report.type] || ''} ${report.type.toUpperCase()} Emergency\n\nStatus: ${statusEmojis[oldStatus]} ${oldStatus.toUpperCase()} → ${statusEmojis[newStatus]} ${newStatus.toUpperCase()}\n\nLocation: ${report.latitude?.toFixed(4)}°, ${report.longitude?.toFixed(4)}°\n\nTime: ${new Date().toLocaleString()}`;
  
  const results = [];
  
  for (const phoneNumber of phoneNumbers) {
    const result = await sendSMS(phoneNumber, message);
    results.push({ phoneNumber, ...result });
  }
  
  return results;
};

// Send custom SMS to multiple recipients
const sendBulkSMS = async (phoneNumbers, message) => {
  const results = [];
  
  for (const phoneNumber of phoneNumbers) {
    const result = await sendSMS(phoneNumber, message);
    results.push({ phoneNumber, ...result });
  }
  
  return results;
};

// Validate phone number format (E.164 format)
const validatePhoneNumber = (phoneNumber) => {
  // E.164 format: +[country code][number]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

// Format phone number to E.164
const formatPhoneNumber = (phoneNumber, countryCode = '+233') => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If starts with 0, remove it (Ghana format)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add country code if not present
  if (!phoneNumber.startsWith('+')) {
    return `${countryCode}${cleaned}`;
  }
  
  return phoneNumber;
};

module.exports = {
  initTwilio,
  sendSMS,
  sendEmergencyAlert,
  sendStatusChangeAlert,
  sendBulkSMS,
  validatePhoneNumber,
  formatPhoneNumber
};
