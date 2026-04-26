# Design Document: Admin Notes/Comments

## Overview

The Admin Notes/Comments feature enables administrators to collaborate on emergency reports by adding, viewing, editing, and deleting text notes. This feature provides a shared timeline of actions and observations for each emergency incident, facilitating coordination between responders.

### Key Capabilities

- **Note Management**: Create, read, update, and delete notes on emergency reports
- **Real-Time Synchronization**: Automatic updates when other admins add or modify notes
- **Author Attribution**: Each note displays the admin's email and timestamp
- **Edit History**: Notes show when they were last updated
- **Dark Mode Support**: Consistent styling with the existing admin dashboard theme
- **Access Control**: Admins can only edit/delete their own notes but can view all notes

### Technical Context

The feature integrates with the existing emergency response system built on:
- **Frontend**: Next.js with React hooks for state management
- **Backend**: Supabase for database, authentication, and real-time subscriptions
- **Database**: PostgreSQL with Row Level Security (RLS) policies
- **UI**: Inline styles with dark mode support matching the admin dashboard

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard (React)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Report Detail Modal                                    │ │
│  │  ├─ Report Information                                  │ │
│  │  ├─ Media Display                                       │ │
│  │  └─ Notes Section ◄─────────────────┐                  │ │
│  │     ├─ Notes List (scrollable)      │                  │ │
│  │     │  ├─ Note Card (view mode)     │                  │ │
│  │     │  └─ Note Card (edit mode)     │                  │ │
│  │     └─ Add Note Form                │                  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ API Calls (CRUD)
                       │ Real-time Subscription
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                    │ │
│  │  ├─ reports table                                       │ │
│  │  └─ report_notes table                                  │ │
│  │     ├─ id (UUID, PK)                                    │ │
│  │     ├─ report_id (UUID, FK → reports.id)               │ │
│  │     ├─ admin_id (UUID, FK → auth.users.id)             │ │
│  │     ├─ admin_email (TEXT)                               │ │
│  │     ├─ note (TEXT)                                      │ │
│  │     ├─ created_at (TIMESTAMPTZ)                         │ │
│  │     └─ updated_at (TIMESTAMPTZ)                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Row Level Security (RLS) Policies                      │ │
│  │  ├─ SELECT: All admins can view all notes              │ │
│  │  ├─ INSERT: Admins can create notes                    │ │
│  │  ├─ UPDATE: Admins can update own notes only           │ │
│  │  └─ DELETE: Admins can delete own notes only           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Real-time Subscriptions                                │ │
│  │  └─ report_notes channel (postgres_changes)            │ │
│  │     ├─ INSERT events                                    │ │
│  │     ├─ UPDATE events                                    │ │
│  │     └─ DELETE events                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Creating a Note

```
1. Admin types note text in textarea
2. Admin clicks "Add Note" button
3. Frontend validates note is not empty
4. Frontend calls supabase.from('report_notes').insert()
   - report_id: selected report ID
   - admin_id: authenticated user ID
   - admin_email: authenticated user email
   - note: trimmed note text
5. Supabase validates RLS policy (admin must be authenticated)
6. Database inserts note with auto-generated ID and timestamps
7. Database trigger updates updated_at timestamp
8. Supabase broadcasts INSERT event via real-time channel
9. All connected clients receive new note
10. Frontend updates local state and displays new note
11. Frontend clears input field
```

#### Editing a Note

```
1. Admin clicks "Edit" button on their own note
2. Frontend switches note to edit mode with textarea
3. Admin modifies text and clicks "Save"
4. Frontend validates note is not empty
5. Frontend calls supabase.from('report_notes').update()
   - note: trimmed note text
   - WHERE id = note_id
6. Supabase validates RLS policy (admin_id must match auth.uid())
7. Database updates note text
8. Database trigger updates updated_at timestamp
9. Supabase broadcasts UPDATE event via real-time channel
10. All connected clients receive updated note
11. Frontend updates local state and switches back to view mode
```

#### Deleting a Note

```
1. Admin clicks "Delete" button on their own note
2. Frontend displays confirmation dialog
3. Admin confirms deletion
4. Frontend calls supabase.from('report_notes').delete()
   - WHERE id = note_id
5. Supabase validates RLS policy (admin_id must match auth.uid())
6. Database deletes note
7. Cascade delete ensures referential integrity
8. Supabase broadcasts DELETE event via real-time channel
9. All connected clients receive deletion event
10. Frontend removes note from local state
```

#### Real-Time Synchronization

```
1. Admin opens report detail modal
2. Frontend loads notes: supabase.from('report_notes').select()
3. Frontend subscribes to real-time channel for report_notes table
4. When another admin performs CRUD operation:
   a. Supabase broadcasts event to all subscribers
   b. Frontend receives event payload
   c. Frontend updates local notes state
   d. React re-renders notes list
5. Updates appear within 2 seconds (typical Supabase latency)
6. When modal closes, frontend unsubscribes from channel
```

## Components and Interfaces

### Frontend Components

#### NotesSection Component (Inline in Modal)

**Location**: `frontend/pages/admin.js` (within report detail modal)

**State Management**:
```javascript
const [notes, setNotes] = useState([]);              // Array of note objects
const [newNote, setNewNote] = useState('');          // Text for new note
const [editingNoteId, setEditingNoteId] = useState(null);  // ID of note being edited
const [editingNoteText, setEditingNoteText] = useState(''); // Text during edit
```

**Functions**:
- `loadNotes(reportId)`: Fetch all notes for a report
- `addNote(reportId)`: Create a new note
- `updateNote(noteId)`: Update an existing note
- `deleteNote(noteId)`: Delete a note
- Real-time subscription handler (inline in useEffect)

**UI Structure**:
```
Notes Section
├─ Header ("💬 Admin Notes" + count)
├─ Notes List (scrollable, max-height: 300px)
│  └─ Note Cards (for each note)
│     ├─ View Mode
│     │  ├─ Note text (pre-wrap)
│     │  ├─ Author email + timestamp
│     │  └─ Edit/Delete buttons (if own note)
│     └─ Edit Mode
│        ├─ Textarea with current text
│        └─ Save/Cancel buttons
└─ Add Note Form
   ├─ Textarea (placeholder text)
   └─ Add Note button (disabled if empty)
```

### Backend Schema

#### report_notes Table

```sql
CREATE TABLE report_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_report_notes_report_id ON report_notes(report_id);
CREATE INDEX idx_report_notes_created_at ON report_notes(created_at DESC);
```

**Constraints**:
- `id`: Auto-generated UUID primary key
- `report_id`: Must reference existing report, cascade delete
- `admin_id`: Must reference existing user, cascade delete
- `admin_email`: Denormalized for display (avoids join)
- `note`: Required, cannot be null
- `created_at`: Auto-set on insert
- `updated_at`: Auto-updated via trigger

#### RLS Policies

```sql
-- All admins can view all notes
CREATE POLICY "Admins can view all notes"
  ON report_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Admins can insert notes (must set own admin_id)
CREATE POLICY "Admins can insert notes"
  ON report_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
    AND admin_id = auth.uid()
  );

-- Admins can update only their own notes
CREATE POLICY "Admins can update own notes"
  ON report_notes FOR UPDATE TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Admins can delete only their own notes
CREATE POLICY "Admins can delete own notes"
  ON report_notes FOR DELETE TO authenticated
  USING (admin_id = auth.uid());
```

### API Interface

#### Supabase Client Methods

**Load Notes**:
```javascript
const { data, error } = await supabase
  .from('report_notes')
  .select('*')
  .eq('report_id', reportId)
  .order('created_at', { ascending: true });
```

**Create Note**:
```javascript
const { data, error } = await supabase
  .from('report_notes')
  .insert([{
    report_id: reportId,
    admin_id: user.id,
    admin_email: user.email,
    note: noteText.trim()
  }])
  .select()
  .single();
```

**Update Note**:
```javascript
const { error } = await supabase
  .from('report_notes')
  .update({ note: noteText.trim() })
  .eq('id', noteId);
```

**Delete Note**:
```javascript
const { error } = await supabase
  .from('report_notes')
  .delete()
  .eq('id', noteId);
```

**Real-Time Subscription**:
```javascript
const subscription = supabase
  .channel('report-notes-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'report_notes'
  }, (payload) => {
    if (payload.eventType === 'INSERT') {
      setNotes(prev => [...prev, payload.new]);
    } else if (payload.eventType === 'UPDATE') {
      setNotes(prev => prev.map(n =>
        n.id === payload.new.id ? payload.new : n
      ));
    } else if (payload.eventType === 'DELETE') {
      setNotes(prev => prev.filter(n => n.id !== payload.old.id));
    }
  })
  .subscribe();
```

## Data Models

### Note Object

```typescript
interface Note {
  id: string;              // UUID
  report_id: string;       // UUID, foreign key to reports
  admin_id: string;        // UUID, foreign key to auth.users
  admin_email: string;     // Email of admin who created note
  note: string;            // Note text content
  created_at: string;      // ISO 8601 timestamp with timezone
  updated_at: string;      // ISO 8601 timestamp with timezone
}
```

**Example**:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "report_id": "f1e2d3c4-b5a6-7890-1234-567890abcdef",
  "admin_id": "12345678-90ab-cdef-1234-567890abcdef",
  "admin_email": "fire.admin@emergency.gov.gh",
  "note": "Fire truck dispatched at 14:30. ETA 8 minutes.",
  "created_at": "2024-02-15T14:30:15.123Z",
  "updated_at": "2024-02-15T14:30:15.123Z"
}
```

### State Models

**Component State**:
```typescript
interface NotesState {
  notes: Note[];                    // All notes for current report
  newNote: string;                  // Text input for new note
  editingNoteId: string | null;    // ID of note being edited
  editingNoteText: string;          // Text during edit operation
}
```

## Error Handling

### Client-Side Validation

**Empty Note Prevention**:
```javascript
// Before submission
if (!newNote.trim()) {
  // Button is disabled, no action taken
  return;
}
```

**Edit Validation**:
```javascript
// Before update
if (!editingNoteText.trim()) {
  // Save button should be disabled or show validation message
  return;
}
```

### Database Errors

**Insert Failure**:
```javascript
try {
  const { data, error } = await supabase
    .from('report_notes')
    .insert([noteData]);
  
  if (error) throw error;
  // Success handling
} catch (e) {
  console.error('Error adding note:', e);
  alert('Failed to add note');
}
```

**Update Failure**:
```javascript
try {
  const { error } = await supabase
    .from('report_notes')
    .update({ note: editingNoteText.trim() })
    .eq('id', noteId);
  
  if (error) throw error;
  // Success handling
} catch (e) {
  console.error('Error updating note:', e);
  alert('Failed to update note');
}
```

**Delete Failure**:
```javascript
try {
  const { error } = await supabase
    .from('report_notes')
    .delete()
    .eq('id', noteId);
  
  if (error) throw error;
  // Success handling
} catch (e) {
  console.error('Error deleting note:', e);
  alert('Failed to delete note');
}
```

### Authentication Errors

**Unauthenticated User**:
- RLS policies will reject operations
- Frontend should redirect to login page
- Handled by existing auth flow in admin.js

**Unauthorized Operations**:
- Attempting to edit/delete another admin's note
- RLS policy will reject at database level
- Frontend prevents UI from showing edit/delete buttons for other admins' notes

### Network Errors

**Connection Loss**:
- Supabase client handles reconnection automatically
- Real-time subscription will reconnect when network restored
- User may need to refresh to see missed updates

**Timeout**:
- Supabase has built-in timeout handling
- Frontend shows generic error message
- User can retry operation

### Data Integrity Errors

**Foreign Key Violations**:
- Cannot create note for non-existent report
- Cannot create note with non-existent admin_id
- Database enforces referential integrity

**Cascade Deletes**:
- When report is deleted, all notes are automatically deleted
- When admin user is deleted, their notes are deleted
- Handled by ON DELETE CASCADE constraints

## Testing Strategy

### Unit Tests

**Note CRUD Operations**:
- Test `loadNotes()` fetches notes for correct report
- Test `addNote()` creates note with correct data
- Test `updateNote()` updates only the specified note
- Test `deleteNote()` removes the correct note
- Test validation prevents empty notes

**State Management**:
- Test notes state updates correctly after CRUD operations
- Test edit mode state transitions (view → edit → view)
- Test new note input clears after successful submission

**UI Rendering**:
- Test notes list displays all notes in chronological order
- Test note card shows author email and timestamp
- Test edit/delete buttons only appear for own notes
- Test dark mode styling applies correctly

### Integration Tests

**Database Integration**:
- Test notes persist to Supabase database
- Test RLS policies enforce access control
- Test cascade deletes work correctly
- Test timestamps are set automatically

**Real-Time Synchronization**:
- Test subscription receives INSERT events
- Test subscription receives UPDATE events
- Test subscription receives DELETE events
- Test multiple clients stay synchronized
- Test subscription cleanup on component unmount

**Authentication Integration**:
- Test unauthenticated users cannot access notes
- Test admin_id is set to authenticated user
- Test admins cannot edit other admins' notes
- Test admins cannot delete other admins' notes

### End-to-End Tests

**Complete Note Lifecycle**:
1. Admin logs in
2. Admin opens report detail modal
3. Admin adds a note
4. Note appears in list immediately
5. Admin edits the note
6. Updated note displays with "(edited)" indicator
7. Admin deletes the note
8. Note is removed from list

**Multi-User Scenarios**:
1. Admin A opens report
2. Admin B opens same report
3. Admin A adds note
4. Admin B sees note appear in real-time (within 2 seconds)
5. Admin A edits their note
6. Admin B sees update in real-time
7. Admin A deletes their note
8. Admin B sees note disappear in real-time

**Dark Mode**:
1. Admin toggles dark mode
2. Notes section updates styling
3. Text remains readable with proper contrast
4. Input fields are visible and usable

### Manual Testing Checklist

- [ ] Can add note to report
- [ ] Note appears immediately without refresh
- [ ] Can edit own note
- [ ] Cannot edit other admin's note (buttons hidden)
- [ ] Can delete own note with confirmation
- [ ] Cannot delete other admin's note (buttons hidden)
- [ ] Empty notes are rejected (button disabled)
- [ ] Whitespace-only notes are rejected
- [ ] Notes display in chronological order
- [ ] Timestamps are formatted correctly
- [ ] "(edited)" indicator appears after update
- [ ] Real-time updates work across multiple browsers
- [ ] Dark mode styling is consistent
- [ ] Notes section scrolls when many notes present
- [ ] Error messages display on failure
- [ ] Confirmation dialog appears before delete

### Performance Testing

**Load Testing**:
- Test with 50+ notes on a single report
- Verify scrolling performance remains smooth
- Verify real-time updates don't cause lag

**Network Testing**:
- Test with slow network connection
- Test with intermittent connection
- Verify graceful degradation

## Implementation Notes

### Existing Code Integration

The notes feature is already implemented in `frontend/pages/admin.js`. The implementation includes:

1. **State Management** (lines 35-38):
   - `notes`, `newNote`, `editingNoteId`, `editingNoteText`

2. **CRUD Functions** (lines 175-235):
   - `loadNotes()`: Fetches notes for selected report
   - `addNote()`: Creates new note
   - `updateNote()`: Updates existing note
   - `deleteNote()`: Deletes note with confirmation

3. **UI Components** (lines 1100-1280):
   - Notes section in report detail modal
   - Notes list with view/edit modes
   - Add note form with textarea

4. **Real-Time Subscription**:
   - Currently not implemented
   - Needs to be added to sync notes across clients

### Required Enhancements

**Add Real-Time Subscription**:
```javascript
useEffect(() => {
  if (!selectedReport) return;

  // Subscribe to notes changes
  const subscription = supabase
    .channel('report-notes-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'report_notes',
      filter: `report_id=eq.${selectedReport.id}`
    }, (payload) => {
      if (payload.eventType === 'INSERT') {
        setNotes(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setNotes(prev => prev.map(n =>
          n.id === payload.new.id ? payload.new : n
        ));
      } else if (payload.eventType === 'DELETE') {
        setNotes(prev => prev.filter(n => n.id !== payload.old.id));
      }
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [selectedReport]);
```

**Enable Realtime in Supabase**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE report_notes;
```

### Dark Mode Styling

The notes section uses the existing `colors` object that adapts to dark mode:

```javascript
const colors = {
  bg: darkMode ? "#0f172a" : "#f8fafc",
  cardBg: darkMode ? "#1e293b" : "white",
  text: darkMode ? "#f1f5f9" : "#0f172a",
  textSecondary: darkMode ? "#94a3b8" : "#64748b",
  border: darkMode ? "#334155" : "#e2e8f0",
  // ... other colors
};
```

All note UI elements use these color variables with `transition: "all 0.3s"` for smooth theme switching.

### Security Considerations

**Row Level Security**:
- All database operations are protected by RLS policies
- Frontend cannot bypass these policies
- Malicious users cannot access or modify unauthorized notes

**Input Sanitization**:
- Note text is trimmed before storage
- No HTML rendering (uses `whiteSpace: "pre-wrap"`)
- XSS protection through React's default escaping

**Authentication**:
- All operations require authenticated user
- Admin profile must exist in `admin_profiles` table
- User ID is verified against `auth.uid()` in RLS policies

## Deployment Considerations

### Database Migration

1. Run SQL script to create `report_notes` table
2. Create indexes for performance
3. Enable RLS and create policies
4. Create trigger for `updated_at` timestamp
5. Enable realtime publication (optional)

### Frontend Deployment

1. No new dependencies required (Supabase client already installed)
2. Code is already in `frontend/pages/admin.js`
3. Add real-time subscription code
4. Test in staging environment
5. Deploy to production

### Monitoring

**Metrics to Track**:
- Number of notes created per day
- Average notes per report
- Real-time subscription connection rate
- Database query performance
- Error rates for CRUD operations

**Logging**:
- Log all database errors to console
- Log real-time subscription events (connect/disconnect)
- Log authentication failures

### Rollback Plan

If issues arise:
1. Disable real-time subscription (remove subscription code)
2. Notes will still work without real-time updates
3. Users can refresh to see new notes
4. Database table can remain (no breaking changes)

---

**Design Version**: 1.0  
**Last Updated**: 2024-02-15  
**Status**: Ready for Implementation
