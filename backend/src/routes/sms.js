const express = require('express');
const router = express.Router();
const { sendSMS, sendEmergencyAlert, sendStatusChangeAlert, sendBulkSMS, validatePhoneNumber, formatPhoneNumber } = require('../services/sms');

// Send test SMS
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    if (!validatePhoneNumber(formattedNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use E.164 format: +233XXXXXXXXX' });
    }
    
    const result = await sendSMS(formattedNumber, message);
    
    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully', sid: result.sid });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error in /test route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send emergency alert to multiple numbers
router.post('/emergency-alert', async (req, res) => {
  try {
    const { phoneNumbers, report } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'Phone numbers array is required' });
    }
    
    if (!report) {
      return res.status(400).json({ error: 'Report data is required' });
    }
    
    // Format and validate phone numbers
    const formattedNumbers = phoneNumbers.map(num => formatPhoneNumber(num));
    const invalidNumbers = formattedNumbers.filter(num => !validatePhoneNumber(num));
    
    if (invalidNumbers.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid phone numbers', 
        invalidNumbers 
      });
    }
    
    const results = await sendEmergencyAlert(formattedNumbers, report);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    res.json({ 
      success: true, 
      sent: successCount, 
      failed: failedCount,
      results 
    });
  } catch (error) {
    console.error('Error in /emergency-alert route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send status change alert
router.post('/status-change', async (req, res) => {
  try {
    const { phoneNumbers, report, oldStatus, newStatus } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'Phone numbers array is required' });
    }
    
    if (!report || !oldStatus || !newStatus) {
      return res.status(400).json({ error: 'Report data, oldStatus, and newStatus are required' });
    }
    
    // Format and validate phone numbers
    const formattedNumbers = phoneNumbers.map(num => formatPhoneNumber(num));
    const invalidNumbers = formattedNumbers.filter(num => !validatePhoneNumber(num));
    
    if (invalidNumbers.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid phone numbers', 
        invalidNumbers 
      });
    }
    
    const results = await sendStatusChangeAlert(formattedNumbers, report, oldStatus, newStatus);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    res.json({ 
      success: true, 
      sent: successCount, 
      failed: failedCount,
      results 
    });
  } catch (error) {
    console.error('Error in /status-change route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send bulk SMS
router.post('/bulk', async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'Phone numbers array is required' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Format and validate phone numbers
    const formattedNumbers = phoneNumbers.map(num => formatPhoneNumber(num));
    const invalidNumbers = formattedNumbers.filter(num => !validatePhoneNumber(num));
    
    if (invalidNumbers.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid phone numbers', 
        invalidNumbers 
      });
    }
    
    const results = await sendBulkSMS(formattedNumbers, message);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    res.json({ 
      success: true, 
      sent: successCount, 
      failed: failedCount,
      results 
    });
  } catch (error) {
    console.error('Error in /bulk route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate phone number
router.post('/validate', (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const formatted = formatPhoneNumber(phoneNumber);
    const isValid = validatePhoneNumber(formatted);
    
    res.json({ 
      valid: isValid, 
      formatted: isValid ? formatted : null,
      original: phoneNumber
    });
  } catch (error) {
    console.error('Error in /validate route:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
