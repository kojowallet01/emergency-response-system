# Create Responder PWA Icons

Since we can't generate images programmatically, you'll need to create two icon files:

## Option 1: Use Online Tool
1. Go to https://www.favicon-generator.org/
2. Upload an image with a 🚑 ambulance emoji or emergency symbol
3. Generate icons
4. Download and rename:
   - `android-icon-192x192.png` → `responder-icon-192.png`
   - `android-icon-512x512.png` → `responder-icon-512.png`
5. Place both files in `frontend/public/`

## Option 2: Use Existing Icons (Temporary)
For now, you can copy the existing admin icons:

```bash
cd frontend/public
copy icon-192x192.png responder-icon-192.png
copy icon-512x512.png responder-icon-512.png
```

## Option 3: Create Simple Icons
Create two PNG files with:
- Size: 192x192 and 512x512
- Background: Purple gradient (#667eea to #764ba2)
- Icon: White 🚑 emoji or ambulance symbol
- Save as `responder-icon-192.png` and `responder-icon-512.png`

Place them in `frontend/public/` folder.
