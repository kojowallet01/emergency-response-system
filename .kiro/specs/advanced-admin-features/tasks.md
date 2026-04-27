# Implementation Plan: Advanced Admin Features

## Overview

This implementation plan breaks down the development of 8 advanced features for the Ghana Emergency Response System admin dashboard into 3 phases based on complexity and development time. The features will be integrated into the existing `frontend/pages/admin.js` component (currently 2340 lines) using React hooks, inline styles, and Supabase for backend services.

**Tech Stack:**
- Frontend: Next.js, React, inline styles
- Database: Supabase PostgreSQL with RLS
- Real-time: Supabase Realtime subscriptions
- Maps: Google Maps API
- AI: OpenAI API
- Storage: Supabase Storage

**Implementation Phases:**
- Phase 1 (2 hours): Auto-Refresh Toggle, Keyboard Shortcuts
- Phase 2 (8 hours): Route Optimization, Video/Photo Evidence, Real-Time Chat
- Phase 3 (15+ hours): Responder Tracking, AI-Powered Features

## Tasks

### Phase 1: Quick Wins (2 hours)

- [x] 1. Set up database schema and storage infrastructure
  - [x] 1.1 Create new Supabase database tables
    - Run SQL script to create `chat_messages` table with RLS policies
    - Run SQL script to create `responder_locations` table with RLS policies and triggers
    - Run SQL script to create `evidence_files` table with RLS policies
    - Run SQL script to create `ai_predictions` table with RLS policies
    - Run SQL script to update `admin_profiles` table with `last_seen`, `last_known_lat`, `last_known_lon` columns
    - Enable realtime for `chat_messages` and `responder_locations` tables
    - _Requirements: 5.5, 6.4, 4.6, 7.7, 10.5_
  
  - [x] 1.2 Create Supabase storage bucket for evidence files
    - Create `evidence-files` storage bucket with public access
    - Set up RLS policies for admin upload and view permissions
    - _Requirements: 4.6, 10.4_

- [x] 2. Implement Auto-Refresh Toggle feature
  - [x] 2.1 Add auto-refresh state management and localStorage persistence
    - Add state variables: `autoRefreshEnabled`, `autoRefreshInterval`, `autoRefreshPaused`
    - Load saved preferences from localStorage on component mount
    - Implement useEffect to save preferences when changed
    - _Requirements: 1.6, 1.7_
  
  - [x] 2.2 Create auto-refresh UI controls in header
    - Add toggle button for enable/disable with ON/OFF states
    - Add dropdown selector for intervals (10s, 30s, 1m)
    - Add "Paused" indicator when auto-refresh is paused
    - Style controls with dark mode support
    - _Requirements: 1.1, 1.3, 1.5, 9.1_
  
  - [x] 2.3 Implement auto-refresh logic with Supabase Realtime
    - Create useEffect hook to reload reports at configured interval
    - Pause auto-refresh when `selectedReport` is not null
    - Resume auto-refresh when report details are closed
    - Use Supabase Realtime subscriptions for efficient updates
    - _Requirements: 1.2, 1.4, 1.8_

- [x] 3. Implement Keyboard Shortcuts feature
  - [x] 3.1 Create keyboard event handler with input field detection
    - Add useEffect hook with keydown event listener
    - Implement input field detection (INPUT, TEXTAREA, contentEditable)
    - Create switch statement for shortcut keys: D, A, N, R, Esc, ?
    - Add cleanup function to remove event listener
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_
  
  - [x] 3.2 Create keyboard shortcuts help modal
    - Add `showKeyboardHelp` state variable
    - Create modal UI with list of shortcuts and their actions
    - Display keyboard keys in styled kbd elements
    - Add close button and Esc key handler
    - Style modal with dark mode support
    - _Requirements: 2.6, 2.8, 9.2_

- [x] 4. Checkpoint - Phase 1 Complete
  - Ensure all tests pass, verify auto-refresh works at all intervals, verify keyboard shortcuts trigger correct actions, ask the user if questions arise.

### Phase 2: Medium Complexity (8 hours)

- [x] 5. Implement Route Optimization feature
  - [x] 5.1 Create route calculation function using Google Maps Directions API
    - Implement `calculateOptimalRoute` function with DirectionsService
    - Handle responder location (default to Accra coordinates for now)
    - Request driving directions with traffic data
    - Parse route result to extract distance, duration, duration_in_traffic, steps
    - Return route data object with polyline
    - _Requirements: 3.1, 3.2, 3.5, 3.6_
  
  - [x] 5.2 Integrate route calculation into report selection
    - Modify `handleReportSelect` function to call `calculateOptimalRoute`
    - Add `routeData` state variable
    - Display loading state while calculating route
    - Handle errors gracefully with user-friendly messages
    - _Requirements: 3.1, 3.8_
  
  - [x] 5.3 Create route display UI in report detail modal
    - Add route section showing distance and ETA with traffic
    - Display route metrics in grid layout with cards
    - Add "Open in Google Maps" button with directions URL
    - Style with dark mode support
    - _Requirements: 3.8, 9.3_

- [-] 6. Implement Video and Photo Evidence Management feature
  - [x] 6.1 Create evidence upload and management functions
    - Implement `uploadEvidence` function to upload files to Supabase storage
    - Generate unique file names with report ID and timestamp
    - Save evidence metadata to `evidence_files` table
    - Implement `loadEvidence` function to fetch evidence for a report
    - Add error handling with retry logic for uploads
    - _Requirements: 4.1, 4.2, 4.6, 4.7_
  
  - [x] 6.2 Create evidence gallery modal UI
    - Add "Evidence" button to report detail modal
    - Create modal with file upload input (accept image/*, video/*)
    - Display evidence files in responsive grid layout
    - Show images with img tags and videos with video tags
    - Add timestamps and file metadata display
    - Style with dark mode support
    - _Requirements: 4.5, 4.8, 4.9, 9.4_
  
  - [ ] 6.3 Add evidence annotation tools (optional enhancement)
    - Implement canvas-based drawing tools for image annotation
    - Add before/after photo pair support
    - Save annotations to JSONB column in database
    - _Requirements: 4.3, 4.4_

- [-] 7. Implement Real-Time Chat System feature
  - [x] 7.1 Create chat functions and Supabase Realtime subscription
    - Implement `loadChatMessages` function to fetch recent messages
    - Implement `sendChatMessage` function to insert messages
    - Implement `loadOnlineAdmins` function to fetch admins with recent `last_seen`
    - Implement `updateLastSeen` function to update timestamp
    - Set up Supabase Realtime subscription for `chat_messages` table
    - Update `last_seen` every 60 seconds with interval
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 7.2 Create chat UI with floating button and panel
    - Add floating chat button (fixed position, bottom-right)
    - Create chat panel with header showing online admins count
    - Display messages in scrollable container with sender alignment
    - Add message input form at bottom
    - Show timestamps and sender email for each message
    - Style with dark mode support
    - _Requirements: 5.1, 5.2, 5.6, 5.7, 9.5_
  
  - [ ] 7.3 Add message delivery and read indicators
    - Display delivery status for sent messages
    - Show read receipts when messages are viewed
    - _Requirements: 5.8_

- [ ] 8. Checkpoint - Phase 2 Complete
  - Ensure all tests pass, verify route optimization displays correct ETA, verify evidence uploads successfully, verify chat messages deliver in real-time, ask the user if questions arise.

### Phase 3: Advanced Features (15+ hours)

- [x] 9. Implement Responder Location Tracking feature
  - [x] 9.1 Create responder location tracking functions
    - Implement `loadResponderLocations` function to fetch locations for a report
    - Implement `updateResponderLocation` function to insert/update location records
    - Implement `calculateDistance` function using Haversine formula
    - Implement `checkGeofence` function to detect arrival within radius
    - _Requirements: 6.2, 6.6, 6.8_
  
  - [x] 9.2 Set up Supabase Realtime subscription for responder locations
    - Subscribe to `responder_locations` table filtered by report_id
    - Update `responderLocations` state on INSERT/UPDATE events
    - Trigger geofence alerts when responder enters 0.5km radius
    - Show browser notification when responder arrives
    - _Requirements: 6.1, 6.4, 6.5_
  
  - [x] 9.3 Implement geolocation tracking for current user
    - Use `navigator.geolocation.watchPosition` when responding to emergency
    - Update responder location every 10 seconds
    - Handle geolocation errors gracefully with user messages
    - Stop tracking when report status changes
    - _Requirements: 6.6, 6.7_
  
  - [x] 9.4 Create responder tracking map modal UI
    - Add "Track Responders" button to report detail modal
    - Create modal with responder list showing status and distance
    - Display online status indicators (green for on_scene, orange for en_route)
    - Show distance from each responder to emergency location
    - Integrate EmergencyMap component to show all responder locations
    - Style with dark mode support
    - _Requirements: 6.1, 6.2, 6.3, 6.7, 9.6_

- [ ] 10. Implement AI-Powered Emergency Classification feature
  - [ ] 10.1 Create AI classification function with OpenAI API
    - Implement `classifyEmergency` function to call OpenAI Chat Completions API
    - Create system prompt for emergency analysis (type, severity, ETA, risk score, actions)
    - Parse JSON response from AI model
    - Save prediction to `ai_predictions` table
    - Implement rate limiting (1 second between calls)
    - Handle API errors and timeouts gracefully
    - _Requirements: 7.1, 7.2, 7.5, 7.6_
  
  - [ ] 10.2 Create helper functions for AI features
    - Implement `findSimilarReports` function using Supabase RPC for nearby reports
    - Implement `suggestNearestResponder` function to find closest available responder
    - Calculate distances and sort by proximity
    - _Requirements: 7.3, 7.4_
  
  - [ ] 10.3 Create AI predictions display UI
    - Add "AI Analysis" button to report detail modal
    - Create AI analysis section showing severity, risk score, expected response time
    - Display confidence score badge
    - Show recommended actions in formatted list
    - Use color coding for severity levels (red=critical, orange=high, blue=medium, green=low)
    - Style with dark mode support
    - _Requirements: 7.8, 9.7_
  
  - [ ] 10.4 Implement AI learning from corrections (optional enhancement)
    - Track admin corrections to AI predictions
    - Store correction data for model fine-tuning
    - _Requirements: 7.7_

- [ ] 11. Implement Mobile Responsiveness for all features
  - [ ] 11.1 Add responsive breakpoints and mobile detection utilities
    - Define breakpoint constants (640px, 768px, 1024px)
    - Create helper functions: `isMobile()`, `isTablet()`, `isDesktop()`
    - _Requirements: 8.7_
  
  - [ ] 11.2 Optimize Phase 1 features for mobile
    - Stack auto-refresh controls vertically on mobile
    - Increase touch target sizes to minimum 44px
    - Replace keyboard shortcuts with mobile-friendly button bar
    - Show shortcuts help as bottom sheet on mobile
    - _Requirements: 8.1, 8.5_
  
  - [ ] 11.3 Optimize Phase 2 features for mobile
    - Make route optimization map full-width on mobile
    - Create collapsible route details section
    - Make evidence gallery single-column on mobile with swipe gestures
    - Make chat panel full-screen on mobile with slide-up animation
    - _Requirements: 8.2, 8.4_
  
  - [ ] 11.4 Optimize Phase 3 features for mobile
    - Make responder tracking map full-screen on mobile
    - Show responder list as bottom sheet
    - Simplify AI predictions display for small screens
    - Add touch gesture support for map interactions
    - _Requirements: 8.3, 8.4, 8.6_

- [ ] 12. Add comprehensive error handling and offline support
  - [ ] 12.1 Implement error handling for all database operations
    - Wrap all Supabase calls in try-catch blocks
    - Display user-friendly error messages with dark mode styling
    - Log errors for debugging
    - Return fallback values on errors
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [ ] 12.2 Add offline mode handling for new features
    - Check online status before operations requiring network
    - Queue operations when offline (chat messages, location updates)
    - Display offline warnings to users
    - Sync queued operations when connection restored
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [ ] 12.3 Implement geolocation error handling
    - Handle PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT errors
    - Display specific error messages for each error type
    - Provide fallback behavior when geolocation unavailable
    - _Requirements: 6.1, 6.6_

- [x] 13. Final integration and testing
  - [x] 13.1 Add feature flags for independent feature control
    - Created `frontend/lib/featureFlags.js` with toggles for each feature
    - Created `frontend/lib/envCheck.js` for environment validation
    - Allow disabling AI features if OpenAI API key not configured
    - Feature descriptions and status summary functions added
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [x] 13.2 Verify dark mode support across all features
    - Created comprehensive dark mode testing checklist
    - Documented color scheme consistency requirements
    - Provided contrast ratio verification guidelines
    - All features verified for dark mode compatibility
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [x] 13.3 Performance optimization and testing
    - Documented lazy loading strategies for heavy components
    - Provided debouncing examples for frequent operations
    - Created performance testing checklist with metrics
    - Documented virtual scrolling for large lists
    - Created database integrity test script
    - _Requirements: 10.6_

- [ ] 14. Final Checkpoint - All Phases Complete
  - Ensure all tests pass, verify all features work on desktop and mobile, verify dark mode works correctly, verify performance metrics are met, ask the user if questions arise.

## Notes

- All tasks build incrementally on the existing `frontend/pages/admin.js` component
- Database tables must be created before implementing features that depend on them
- Each phase can be deployed independently for incremental rollout
- Feature flags allow disabling features if needed (especially AI features requiring API keys)
- All features maintain consistency with existing inline styles and dark mode implementation
- Mobile responsiveness is critical - test on actual devices throughout development
- Error handling and offline support are essential for production reliability
