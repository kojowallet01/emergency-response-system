# 📱 SMS Notifications Setup Guide

Complete guide to setting up SMS notifications using Twilio for the Emergency Response System.

---

## 🎯 Overview

SMS notifications allow admins to receive text messages when:
- New emergencies are reported
- Emergency status changes (pending → responding → resolved)
- Custom bulk messages need to be sent

---

## 📋 Prerequisites

1. **Twilio Account** - Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. **Twilio Phone Number** - Purchase a phone number that can send SMS
3. **Backend Access** - Ability to update backend environment variables

---

## 🚀 Step-by-Step Setup

### Step 1: Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. Verify your email and phone number
4. You'll get **$15 free credit** for testing

### Step 2: Get Twilio Credentials

1. Log in to [Twilio Console](https://console.twilio.com/)
2. On the dashboard, you'll see:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)
3. Copy both values - you'll need them later

### Step 3: Get a Twilio Phone Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select your country (Ghana: +233)
3. Check **SMS** capability
4. Click **Search** and choose a number
5. Click **Buy** (uses your free credit)
6. Copy the phone number (format: +233XXXXXXXXX)

### Step 4: Configure Backend

1. Open `backend/.env` file
2. Add these lines (replace with your actual values):

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+233XXXXXXXXX
```

3. Save the file

### Step 5: Install Twilio Package

```bash
cd backend
npm install twilio
```

### Step 6: Restart Backend Server

```bash
npm run dev
```

You should see: `✅ Twilio SMS service initialized`

### Step 7: Configure Frontend

1. Open the admin dashboard
2. Click the **📱 SMS OFF** button in the header
3. Enable SMS notifications
4. Add phone numbers (format: 0XXXXXXXXX or +233XXXXXXXXX)
5. Configure notification triggers:
   - ✅ New emergency reported
   - ✅ Status changes
6. Click **Send Test SMS** to verify setup

---

## 📱 Phone Number Format

### Ghana Numbers

**Input formats accepted:**
- `0241234567` (local format)
- `+233241234567` (international format)
- `233241234567` (without +)

**Stored as:**
- `+233241234567` (E.164 format)

### Other Countries

Use E.164 format: `+[country code][number]`
- USA: `+1234567890`
- UK: `+447123456789`
- Nigeria: `+2348012345678`

---

## 💰 Pricing

### Twilio Trial Account
- **Free Credit**: $15
- **Limitations**: 
  - Can only send to verified phone numbers
  - Twilio branding in messages
  - Limited to trial features

### Twilio Paid Account
- **SMS Cost**: ~$0.0075 per SMS (Ghana)
- **Phone Number**: ~$1/month
- **No limitations** on recipients
- **No branding** in messages

### Cost Estimate
- 100 SMS/month: ~$1.75
- 500 SMS/month: ~$4.75
- 1000 SMS/month: ~$8.50

---

## 🔧 API Endpoints

### Test SMS
```bash
POST http://localhost:4000/sms/test
Content-Type: application/json

{
  "phoneNumber": "+233241234567",
  "message": "Test message"
}
```

### Emergency Alert
```bash
POST http://localhost:4000/sms/emergency-alert
Content-Type: application/json

{
  "phoneNumbers": ["+233241234567", "+233501234567"],
  "report": {
    "type": "fire",
    "latitude": 5.6037,
    "longitude": -0.1870,
    "description": "Building fire",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Status Change Alert
```bash
POST http://localhost:4000/sms/status-change
Content-Type: application/json

{
  "phoneNumbers": ["+233241234567"],
  "report": {
    "type": "medical",
    "latitude": 5.6037,
    "longitude": -0.1870
  },
  "oldStatus": "pending",
  "newStatus": "responding"
}
```

### Validate Phone Number
```bash
POST http://localhost:4000/sms/validate
Content-Type: application/json

{
  "phoneNumber": "0241234567"
}
```

---

## 📝 Message Templates

### Emergency Alert
```
EMERGENCY ALERT!

🔥 FIRE Emergency Reported

Location: 5.6037°, -0.1870°
Details: Building fire on main street
Time: 1/15/2024, 10:30:00 AM

Respond immediately!
```

### Status Change
```
Status Update

🔥 FIRE Emergency

Status: 🔴 PENDING → 🟡 RESPONDING

Location: 5.6037°, -0.1870°

Time: 1/15/2024, 10:35:00 AM
```

---

## 🔒 Security Best Practices

1. **Never commit credentials** to Git
   - Use `.env` files
   - Add `.env` to `.gitignore`

2. **Rotate credentials** regularly
   - Change Auth Token every 3-6 months
   - Use Twilio's API key authentication for production

3. **Validate phone numbers** before sending
   - Use the `/sms/validate` endpoint
   - Prevent invalid numbers from being added

4. **Rate limiting**
   - Implement rate limits to prevent abuse
   - Monitor Twilio usage dashboard

5. **Error handling**
   - Log failed SMS attempts
   - Implement retry logic for transient failures

---

## 🐛 Troubleshooting

### "Twilio not configured" Error
**Solution**: Check that all 3 environment variables are set in `backend/.env`

### "Invalid phone number format" Error
**Solution**: Use E.164 format (+233XXXXXXXXX)

### SMS not received
**Possible causes**:
1. Trial account - verify recipient number in Twilio Console
2. Insufficient balance - check Twilio account balance
3. Invalid phone number - verify number is correct
4. Network issues - check Twilio status page

### "Authentication failed" Error
**Solution**: Verify Account SID and Auth Token are correct

---

## 📊 Monitoring

### Twilio Console
- View all sent messages
- Check delivery status
- Monitor costs
- View error logs

### Backend Logs
```bash
# Watch backend logs
cd backend
npm run dev

# Look for:
✅ SMS sent to +233XXXXXXXXX: SMxxxxxxxx
❌ Error sending SMS: [error message]
```

---

## 🎓 Testing

### Test with Trial Account

1. **Verify your phone number** in Twilio Console:
   - Go to Phone Numbers → Verified Caller IDs
   - Add your phone number
   - Enter verification code

2. **Send test SMS**:
   - Open admin dashboard
   - Click SMS Settings
   - Add your verified number
   - Click "Send Test SMS"

3. **Test emergency alert**:
   - Create a test emergency report
   - SMS should be sent automatically (if enabled)

---

## 🚀 Production Deployment

### Render.com

1. Go to your backend service on Render
2. Click **Environment**
3. Add environment variables:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_PHONE_NUMBER=+233xxxxxxxx
   ```
4. Click **Save Changes**
5. Service will auto-redeploy

### Netlify (Frontend)

No changes needed - SMS settings are stored in browser localStorage

---

## 📚 Additional Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [E.164 Phone Number Format](https://www.twilio.com/docs/glossary/what-e164)
- [Twilio Pricing](https://www.twilio.com/sms/pricing)

---

## ✅ Checklist

- [ ] Created Twilio account
- [ ] Got Account SID and Auth Token
- [ ] Purchased Twilio phone number
- [ ] Added credentials to `backend/.env`
- [ ] Installed `twilio` package
- [ ] Restarted backend server
- [ ] Verified "Twilio SMS service initialized" in logs
- [ ] Configured SMS settings in admin dashboard
- [ ] Added phone numbers
- [ ] Sent test SMS successfully
- [ ] Tested emergency alert
- [ ] Tested status change notification

---

**Last Updated**: 2026-04-26
**Status**: SMS Notifications feature complete and ready for production!
