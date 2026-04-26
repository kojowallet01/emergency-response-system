// SMS Notification Helper Functions
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Send test SMS
export const sendTestSMS = async (phoneNumber, message) => {
  try {
    const response = await fetch(`${BACKEND_URL}/sms/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, message })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send SMS');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error sending test SMS:', error);
    return { success: false, error: error.message };
  }
};

// Send emergency alert to multiple numbers
export const sendEmergencyAlert = async (phoneNumbers, report) => {
  try {
    const response = await fetch(`${BACKEND_URL}/sms/emergency-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, report })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send emergency alert');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error sending emergency alert:', error);
    return { success: false, error: error.message };
  }
};

// Send status change alert
export const sendStatusChangeAlert = async (phoneNumbers, report, oldStatus, newStatus) => {
  try {
    const response = await fetch(`${BACKEND_URL}/sms/status-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, report, oldStatus, newStatus })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send status change alert');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error sending status change alert:', error);
    return { success: false, error: error.message };
  }
};

// Send bulk SMS
export const sendBulkSMS = async (phoneNumbers, message) => {
  try {
    const response = await fetch(`${BACKEND_URL}/sms/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, message })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send bulk SMS');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error sending bulk SMS:', error);
    return { success: false, error: error.message };
  }
};

// Validate phone number
export const validatePhoneNumber = async (phoneNumber) => {
  try {
    const response = await fetch(`${BACKEND_URL}/sms/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to validate phone number');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error validating phone number:', error);
    return { success: false, error: error.message };
  }
};

// Get SMS notification settings from localStorage
export const getSMSSettings = () => {
  try {
    const settings = localStorage.getItem('sms_settings');
    return settings ? JSON.parse(settings) : {
      enabled: false,
      phoneNumbers: [],
      notifyOnNew: true,
      notifyOnStatusChange: true
    };
  } catch (error) {
    console.error('Error getting SMS settings:', error);
    return {
      enabled: false,
      phoneNumbers: [],
      notifyOnNew: true,
      notifyOnStatusChange: true
    };
  }
};

// Save SMS notification settings to localStorage
export const saveSMSSettings = (settings) => {
  try {
    localStorage.setItem('sms_settings', JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving SMS settings:', error);
    return false;
  }
};

// Format phone number for display
export const formatPhoneDisplay = (phoneNumber) => {
  // Remove + and country code for display
  if (phoneNumber.startsWith('+233')) {
    return '0' + phoneNumber.substring(4);
  }
  return phoneNumber;
};
