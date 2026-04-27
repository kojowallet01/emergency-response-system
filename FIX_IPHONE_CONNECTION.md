# Fix iPhone Connection Issue

## ✅ Your IP Address: `172.20.10.6`

## 🔥 Add Windows Firewall Rule

### Option 1: PowerShell (Run as Administrator)

1. **Right-click PowerShell** → **Run as Administrator**
2. **Run this command:**
```powershell
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Option 2: Windows Firewall GUI

1. **Open Windows Defender Firewall**
   - Press `Win + R`
   - Type: `wf.msc`
   - Press Enter

2. **Create Inbound Rule**
   - Click "Inbound Rules" (left sidebar)
   - Click "New Rule..." (right sidebar)
   - Select "Port" → Next
   - Select "TCP" and enter port: `3000` → Next
   - Select "Allow the connection" → Next
   - Check all profiles (Domain, Private, Public) → Next
   - Name: `Next.js Dev Server` → Finish

## 🧪 Test Connection

### On iPhone:

Try these URLs in Safari:

1. **Home:** `http://172.20.10.6:3000/`
2. **Admin:** `http://172.20.10.6:3000/admin`
3. **Responder:** `http://172.20.10.6:3000/responder`

### On Computer:

Test locally first:
```
http://localhost:3000/responder
```

## 🔍 Troubleshooting

### Issue: Still can't connect from iPhone

**Check 1: Same WiFi Network**
- iPhone and computer must be on the same WiFi
- Check iPhone WiFi settings
- Check computer WiFi settings

**Check 2: Verify IP Address**
```bash
ipconfig
```
Look for "IPv4 Address" - should be `172.20.10.6`

**Check 3: Verify Server is Running**
```bash
netstat -ano | findstr :3000
```
Should show: `0.0.0.0:3000` (listening on all interfaces)

**Check 4: Test from Computer Browser**
Open on your computer:
- `http://172.20.10.6:3000/responder`

If this works on computer but not iPhone, it's a firewall issue.

**Check 5: Disable Firewall Temporarily (Testing Only)**
1. Open Windows Security
2. Firewall & network protection
3. Turn off for Private network (temporarily)
4. Test iPhone connection
5. Turn firewall back on
6. Add proper firewall rule

### Issue: Page loads but shows error

**Check Supabase Connection:**
- Verify `.env` file in frontend folder
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Issue: 308 Redirect Error

This is normal - Next.js redirects HTTP to HTTPS in some cases.
Try accessing directly: `http://172.20.10.6:3000/responder`

## 🚀 Quick Test Commands

**On Computer (PowerShell):**
```powershell
# Check if server is running
Get-Process -Name node

# Check if port 3000 is listening
netstat -ano | Select-String ":3000"

# Test local access
curl http://localhost:3000/responder -UseBasicParsing

# Check firewall rules
Get-NetFirewallRule | Where-Object {$_.LocalPort -eq 3000}
```

## ✅ Expected Results

**Server Status:**
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
```

**iPhone Access:**
- Page loads showing "🚑 Responder Login"
- Input field for Responder ID
- Login button

## 📱 Alternative: Use Computer's Hotspot

If WiFi issues persist:

1. **Create Mobile Hotspot on Computer**
   - Settings → Network & Internet → Mobile hotspot
   - Turn on "Share my Internet connection"

2. **Connect iPhone to Computer's Hotspot**

3. **Use Computer's Hotspot IP**
   - Usually: `192.168.137.1`
   - Access: `http://192.168.137.1:3000/responder`

## 🔒 Security Note

After testing, you can remove the firewall rule:
```powershell
Remove-NetFirewallRule -DisplayName "Next.js Dev Server"
```

Or disable it in Windows Firewall GUI.
