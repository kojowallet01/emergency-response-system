# Requirements Document

## Introduction

The Admin Notes/Comments feature enables administrators to add, view, edit, and delete notes on emergency reports. This facilitates communication and coordination between responders by providing a shared timeline of actions and observations for each emergency incident.

## Glossary

- **Admin_User**: An authenticated user with admin privileges (fire, medical, crime, or super_admin role) who can manage emergency reports
- **Emergency_Report**: A record of an emergency incident submitted by a user, containing location, type, status, and media
- **Note**: A text comment added by an Admin_User to an Emergency_Report, including timestamp and author information
- **Note_System**: The subsystem responsible for managing notes on emergency reports
- **Admin_Dashboard**: The web interface where Admin_Users view and manage emergency reports
- **Supabase**: The backend-as-a-service platform providing database, authentication, and real-time subscriptions

## Requirements

### Requirement 1: Create Notes on Emergency Reports

**User Story:** As an admin user, I want to add notes to emergency reports, so that I can document actions taken and communicate with other responders.

#### Acceptance Criteria

1. WHEN an Admin_User submits a note for an Emergency_Report, THE Note_System SHALL store the note with the report ID, admin ID, admin email, note text, and creation timestamp
2. WHEN an Admin_User submits a note, THE Note_System SHALL validate that the note text is not empty after trimming whitespace
3. WHEN an Admin_User submits a note, THE Note_System SHALL associate the note with the authenticated Admin_User's ID and email
4. WHEN a note is successfully created, THE Note_System SHALL display the new note in the notes list without requiring a page refresh
5. IF note creation fails, THEN THE Note_System SHALL display an error message to the Admin_User

### Requirement 2: Display Notes for Emergency Reports

**User Story:** As an admin user, I want to view all notes on an emergency report, so that I can see the history of actions and communications.

#### Acceptance Criteria

1. WHEN an Admin_User views an Emergency_Report, THE Admin_Dashboard SHALL display all notes associated with that report in chronological order
2. THE Admin_Dashboard SHALL display each note with the author's email, note text, and creation timestamp
3. WHEN a note has been edited, THE Admin_Dashboard SHALL display the last updated timestamp
4. THE Admin_Dashboard SHALL load notes when an Emergency_Report is selected for viewing
5. WHEN new notes are added by other Admin_Users, THE Admin_Dashboard SHALL update the notes list in real-time using Supabase subscriptions

### Requirement 3: Edit Existing Notes

**User Story:** As an admin user, I want to edit my notes, so that I can correct mistakes or add additional information.

#### Acceptance Criteria

1. WHEN an Admin_User requests to edit a note, THE Admin_Dashboard SHALL display an edit interface with the current note text
2. WHEN an Admin_User submits an edited note, THE Note_System SHALL validate that the note text is not empty after trimming whitespace
3. WHEN an Admin_User submits an edited note, THE Note_System SHALL update the note text and set the updated timestamp to the current time
4. WHEN a note is successfully updated, THE Admin_Dashboard SHALL display the updated note text and timestamp without requiring a page refresh
5. IF note update fails, THEN THE Note_System SHALL display an error message to the Admin_User
6. WHEN an Admin_User cancels editing, THE Admin_Dashboard SHALL restore the original note display without saving changes

### Requirement 4: Delete Notes

**User Story:** As an admin user, I want to delete notes, so that I can remove incorrect or inappropriate comments.

#### Acceptance Criteria

1. WHEN an Admin_User requests to delete a note, THE Admin_Dashboard SHALL display a confirmation dialog
2. WHEN an Admin_User confirms deletion, THE Note_System SHALL remove the note from the database
3. WHEN a note is successfully deleted, THE Admin_Dashboard SHALL remove the note from the notes list without requiring a page refresh
4. IF note deletion fails, THEN THE Note_System SHALL display an error message to the Admin_User
5. WHEN an Admin_User cancels deletion, THE Admin_Dashboard SHALL retain the note without changes

### Requirement 5: Real-Time Note Synchronization

**User Story:** As an admin user, I want to see notes added by other admins in real-time, so that I have up-to-date information about the emergency.

#### Acceptance Criteria

1. WHEN a note is created by any Admin_User, THE Note_System SHALL broadcast the new note to all Admin_Users viewing the same Emergency_Report
2. WHEN a note is updated by any Admin_User, THE Note_System SHALL broadcast the updated note to all Admin_Users viewing the same Emergency_Report
3. WHEN a note is deleted by any Admin_User, THE Note_System SHALL broadcast the deletion to all Admin_Users viewing the same Emergency_Report
4. THE Note_System SHALL use Supabase real-time subscriptions to deliver note changes within 2 seconds
5. WHEN an Admin_User's connection is interrupted, THE Note_System SHALL automatically reconnect and synchronize notes when the connection is restored

### Requirement 6: Note Persistence and Data Integrity

**User Story:** As a system administrator, I want notes to be reliably stored and associated with the correct reports, so that critical communication is not lost.

#### Acceptance Criteria

1. THE Note_System SHALL store notes in a dedicated database table with foreign key relationship to the reports table
2. WHEN an Emergency_Report is deleted, THE Note_System SHALL cascade delete all associated notes
3. THE Note_System SHALL enforce that each note has a valid report_id referencing an existing Emergency_Report
4. THE Note_System SHALL enforce that each note has a valid admin_id referencing an authenticated Admin_User
5. THE Note_System SHALL store timestamps in UTC format with timezone information preserved

### Requirement 7: Note Display in Dark Mode

**User Story:** As an admin user, I want notes to be readable in both light and dark mode, so that I can work comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN dark mode is enabled, THE Admin_Dashboard SHALL display notes with appropriate contrast ratios for text readability
2. WHEN dark mode is enabled, THE Admin_Dashboard SHALL use dark-themed backgrounds and borders for note containers
3. WHEN dark mode is toggled, THE Admin_Dashboard SHALL update note styling without requiring a page refresh
4. THE Admin_Dashboard SHALL maintain consistent note styling with the existing dark mode implementation
5. THE Admin_Dashboard SHALL ensure note input fields are visible and usable in both light and dark modes

### Requirement 8: Note Input Validation and Error Handling

**User Story:** As an admin user, I want clear feedback when I try to submit invalid notes, so that I understand what went wrong and can correct it.

#### Acceptance Criteria

1. WHEN an Admin_User attempts to submit an empty note, THE Note_System SHALL prevent submission and display a validation message
2. WHEN an Admin_User attempts to submit a note with only whitespace, THE Note_System SHALL prevent submission and display a validation message
3. IF the Admin_User is not authenticated, THEN THE Note_System SHALL prevent note operations and redirect to the login page
4. IF a database error occurs during note operations, THEN THE Note_System SHALL log the error and display a user-friendly error message
5. WHEN a note operation fails due to network issues, THE Note_System SHALL display a message indicating the connection problem
