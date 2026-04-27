# Direct Messaging Chat Setup

The chat system has been converted from group chat to **Direct Messages (DM)** system.

## Changes Made

### 1. Database Schema Updates
- Added `recipient_id` column to `chat_messages` table
- Updated RLS policies to support 1-on-1 conversations
- Added indexes for efficient DM queries

### 2. Frontend Updates
- Added admin list view (online/offline)
- Added conversation view for 1-on-1 chats
- Updated message sending/loading logic
- Added "Back" button to return to admin list

## Setup Instructions

### Step 1: Update Database Schema

Run this SQL in **Supabase SQL Editor**:

```sql
-- Add recipient_id column
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(admin_id, recipient_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON chat_messages;

-- Policy: Admins can view messages they sent or received
CREATE POLICY "Admins can view their messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND (
      admin_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

-- Policy: Admins can send messages
CREATE POLICY "Admins can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND admin_id = auth.uid()
    AND recipient_id IS NOT NULL
    AND recipient_id != auth.uid()
  );
```

### Step 2: Restart Frontend

```bash
cd frontend
rm -rf .next
npm run dev
```

### Step 3: Hard Refresh Browser

Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## How to Use

### 1. Open Chat
- Click the **blue floating button** (💬) in bottom-right corner

### 2. Select Admin
- You'll see a list of admins:
  - **Online Now** (green dot) - Active in last 5 minutes
  - **Offline** (gray dot) - Not active recently
- Click on any admin to start a conversation

### 3. Send Messages
- Type your message in the input field
- Press Enter to send
- Messages appear in real-time for both users

### 4. Navigate
- Click **← Back** to return to admin list
- Click **×** to close chat panel

## Features

✅ **1-on-1 Private Conversations** - Each chat is separate and private
✅ **Online Status** - See who's online (green dot) vs offline (gray dot)
✅ **Real-time Updates** - Messages appear instantly via Supabase Realtime
✅ **Message History** - Last 100 messages per conversation
✅ **Dark Mode Support** - Adapts to dashboard theme
✅ **Responsive Design** - Works on all screen sizes

## Testing

### Test with 2 Admins:

1. **Tab 1**: Login as Admin A
2. **Tab 2**: Login as Admin B (use incognito/different browser)
3. **Tab 1**: Click chat button → Select Admin B → Send message
4. **Tab 2**: Click chat button → Should see Admin A in list → Click Admin A
5. **Verify**: Message from Tab 1 appears in Tab 2 instantly

### Test Online Status:

1. Login as Admin A
2. Wait 6 minutes without activity
3. Login as Admin B
4. Admin A should appear in "Offline" section

## Troubleshooting

### Messages not sending?
- Check browser console for errors
- Verify `recipient_id` column exists in `chat_messages` table
- Verify RLS policies are updated

### Admin list empty?
- Check that multiple admins exist in `admin_profiles` table
- Verify current user is excluded from list

### Real-time not working?
- Check Supabase Realtime is enabled for `chat_messages` table
- Verify subscription filter includes `recipient_id`

## Database Schema

```sql
chat_messages (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL,           -- Sender
  recipient_id UUID NOT NULL,       -- Receiver (NEW)
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ
)
```

## Next Steps (Optional Enhancements)

- [ ] Add typing indicators ("Admin is typing...")
- [ ] Add message read receipts (✓✓)
- [ ] Add message search/filter
- [ ] Add file attachments in DMs
- [ ] Add notification badges (unread count)
- [ ] Add message deletion
- [ ] Add emoji reactions
