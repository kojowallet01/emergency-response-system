#!/usr/bin/env python3
"""Generate PDF code review document for Ghana Emergency Response System."""

from fpdf import FPDF
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "CODE_REVIEW.pdf"


class CodeReviewPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, "Ghana Emergency Response System - Code Review", align="C")
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def section_title(self, title):
        self.ln(4)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 64, 175)
        self.multi_cell(0, 8, title)
        self.ln(2)
        self.set_draw_color(30, 64, 175)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def subsection_title(self, title):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 7, title)
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 41, 59)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 41, 59)
        self.cell(6, 5.5, "-")
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def table_row(self, col1, col2, col3, header=False):
        if header:
            self.set_font("Helvetica", "B", 9)
            self.set_fill_color(241, 245, 249)
        else:
            self.set_font("Helvetica", "", 9)
            self.set_fill_color(255, 255, 255)
        self.set_text_color(30, 41, 59)
        w1, w2, w3 = 35, 55, 100
        h = 7
        y0 = self.get_y()
        x0 = self.get_x()
        self.cell(w1, h, col1, border=1, fill=header)
        self.cell(w2, h, col2, border=1, fill=header)
        self.cell(w3, h, col3, border=1, fill=header)
        self.ln(h)


def build_pdf():
    pdf = CodeReviewPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title page
    pdf.ln(30)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(30, 64, 175)
    pdf.multi_cell(0, 12, "Ghana Emergency Response System", align="C")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(0, 10, "Complete Code Review & Architecture Guide", align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, "Version 2.0 Enhanced | EBRS (Emergency Broadcast & Response System)", align="C")
    pdf.ln(20)
    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(0, 6, "Generated: June 29, 2026", align="C")

    # Overview
    pdf.add_page()
    pdf.section_title("1. Project Overview")
    pdf.body_text(
        "The Ghana Emergency Response System (EBRS) is a full-stack emergency reporting "
        "and coordination platform. Citizens report fires, medical, or crime emergencies "
        "with GPS location, voice recordings, and media attachments. Administrators manage "
        "incidents through a real-time dashboard. Field responders track their location via "
        "a mobile Progressive Web App (PWA)."
    )
    pdf.subsection_title("Technology Stack")
    pdf.bullet("Frontend: Next.js 13, React 18, Leaflet maps, Socket.IO client")
    pdf.bullet("Backend (Primary): Supabase (PostgreSQL, Auth, Storage, Realtime)")
    pdf.bullet("Backend (Legacy): Express.js + MongoDB + Socket.IO (port 4000)")
    pdf.bullet("Deployment: Netlify (HTTPS), optional Render for Express backend")
    pdf.bullet("SMS: Twilio integration via backend API")

    # Structure
    pdf.section_title("2. Project Structure")
    pdf.body_text(
        "emergency/\n"
        "  frontend/          Main Next.js app (port 3000)\n"
        "    pages/           Application routes\n"
        "    components/      Maps, chat components\n"
        "    lib/             Supabase, analytics, SMS, offline utilities\n"
        "    public/          PWA manifests, service workers, icons\n"
        "  backend/           Legacy Express API (port 4000)\n"
        "  database/          Supabase SQL migrations and fixes\n"
        "  scripts/           Utility scripts"
    )

    # Pages
    pdf.section_title("3. Frontend Pages & Routes")
    pdf.table_row("Route", "File", "Purpose", header=True)
    pdf.table_row("/", "index.js", "Public emergency reporting (Fire/Medical/Crime)")
    pdf.table_row("/login", "login.js", "Admin authentication via Supabase")
    pdf.table_row("/admin", "admin.js", "Full admin dashboard (~3,500 lines)")
    pdf.table_row("/responder", "responder.js", "Field responder PWA with GPS tracking")
    pdf.table_row("/reports", "reports.js", "Report archive and history")
    pdf.table_row("/manage-admins", "manage-admins.js", "Admin user management")
    pdf.table_row("/location-test", "location-test.js", "GPS debugging page")
    pdf.ln(3)
    pdf.body_text(
        "Legacy pages (old Express backend): index-old-backend.js, admin-old-backend.js, "
        "user.js, reports-old-backend.js. These are kept for reference but are not the "
        "active production path."
    )

    # Data flow
    pdf.section_title("4. Core Data Flow")
    pdf.body_text(
        "Step 1 - Victim Reporting (/):\n"
        "  User selects emergency type (Fire 192, Medical 193, Crime 191)\n"
        "  Browser Geolocation API captures GPS coordinates\n"
        "  Optional voice recording (MediaRecorder, 60s max)\n"
        "  Optional photo/video upload\n"
        "  Data inserted into Supabase 'reports' table\n"
        "  Media files uploaded to 'emergency media' storage bucket"
    )
    pdf.body_text(
        "Step 2 - Admin Dashboard (/admin):\n"
        "  Real-time subscription to report changes via Supabase Realtime\n"
        "  Interactive Leaflet map with emergency markers\n"
        "  Status management (pending, in_progress, resolved, etc.)\n"
        "  Admin notes, activity logging, group chat\n"
        "  Analytics, SMS alerts, nearby facilities lookup\n"
        "  Live responder location tracking on map"
    )
    pdf.body_text(
        "Step 3 - Responder App (/responder):\n"
        "  Login with responder ID (e.g., FIRE001)\n"
        "  View assigned emergency details\n"
        "  Start GPS tracking - streams position to responder_locations table\n"
        "  Status updates: Available, En Route, On Scene\n"
        "  Distance, ETA, and speed calculation\n"
        "  PWA installable on mobile devices"
    )

    # Libraries
    pdf.add_page()
    pdf.section_title("5. Key Libraries (frontend/lib/)")
    pdf.table_row("Module", "Purpose", "", header=True)
    pdf.table_row("supabase.js", "Client, file upload, CRUD, realtime subscriptions", "")
    pdf.table_row("analytics.js", "Response times, trends, CSV export", "")
    pdf.table_row("activityLogger.js", "Audit trail (login, status, notes)", "")
    pdf.table_row("notifications.js", "Browser push notifications", "")
    pdf.table_row("offline.js", "Service worker, offline queue", "")
    pdf.table_row("sms.js", "Twilio SMS alerts via backend", "")
    pdf.table_row("nearbyFacilities.js", "Hospitals, fire/police via Google Places", "")
    pdf.table_row("featureFlags.js", "Feature toggles (AI disabled by default)", "")
    pdf.ln(3)

    # Components
    pdf.section_title("6. React Components")
    pdf.bullet("EmergencyMap.js - Leaflet map for admin (report markers, responder tracking)")
    pdf.bullet("ResponderMap.js - Responder navigation map with ETA and distance")
    pdf.bullet("GroupChat.js - Real-time admin group chat via chat_messages table")
    pdf.bullet("MapView.js - Legacy map component for old Express backend")

    # Database
    pdf.section_title("7. Database Schema (Supabase)")
    pdf.body_text("Main PostgreSQL tables with Row Level Security (RLS) enabled:")
    pdf.bullet("reports - Emergency incident records with GPS, media URLs, status")
    pdf.bullet("admin_profiles - Role-based admin access control")
    pdf.bullet("chat_messages - Admin group chat messages")
    pdf.bullet("responder_locations - Live GPS coordinates from field responders")
    pdf.bullet("responders - Responder accounts (ID-based login)")
    pdf.bullet("evidence_files - Additional evidence attachments")
    pdf.bullet("activity_logs - Audit trail of admin actions")
    pdf.bullet("admin_notes - Notes attached to specific reports")
    pdf.body_text(
        "Realtime subscriptions are enabled on key tables. RLS policies restrict "
        "data access based on authenticated user roles."
    )

    # Backend
    pdf.section_title("8. Legacy Backend (backend/)")
    pdf.body_text(
        "Express + Socket.IO server providing:\n"
        "  MongoDB or in-memory fallback for report storage\n"
        "  Multer file uploads (images, video, audio up to 50MB)\n"
        "  Twilio SMS routes (/api/sms)\n"
        "  Google Directions API for route optimization\n\n"
        "IMPORTANT: Production currently uses Supabase directly from the frontend. "
        "The Express backend is legacy; pages like user.js still reference localhost:4000."
    )

    # PWA
    pdf.section_title("9. PWA & Mobile Support")
    pdf.bullet("Two manifests: manifest.json (public) and responder-manifest.json")
    pdf.bullet("Service workers: sw.js and responder-sw.js")
    pdf.bullet("_app.js selects manifest/SW based on current route")
    pdf.bullet("HTTPS required for iPhone GPS (Safari blocks geolocation on HTTP)")
    pdf.bullet("Clear cache functionality built into responder app")

    # Features complete
    pdf.add_page()
    pdf.section_title("10. Completed Features (Production Ready)")
    pdf.subsection_title("Public Emergency Reporting")
    pdf.bullet("Emergency type selection (Fire, Medical, Crime, Other)")
    pdf.bullet("GPS location capture with accuracy display")
    pdf.bullet("Voice recording (60 second maximum)")
    pdf.bullet("Photo and video upload with previews")
    pdf.bullet("Contact information and anonymous reporting")
    pdf.bullet("Real-time submission to Supabase")

    pdf.subsection_title("Admin Dashboard")
    pdf.bullet("Real-time emergency feed with auto-refresh")
    pdf.bullet("Interactive map with emergency markers")
    pdf.bullet("Status management and admin notes system")
    pdf.bullet("Activity logging and group chat")
    pdf.bullet("Dark mode, keyboard shortcuts, evidence gallery")
    pdf.bullet("Responder tracking on map, analytics dashboard")
    pdf.bullet("SMS alert configuration, nearby facilities lookup")

    pdf.subsection_title("Responder Mobile App")
    pdf.bullet("Responder login (ID-based authentication)")
    pdf.bullet("Emergency assignment display")
    pdf.bullet("Real-time GPS tracking with live navigation map")
    pdf.bullet("Status updates: Available, En Route, On Scene")
    pdf.bullet("Distance, ETA, speed, and battery indicators")
    pdf.bullet("PWA support (installable on home screen)")

    # Incomplete
    pdf.section_title("11. Optional / Incomplete Features")
    pdf.bullet("AI emergency classification - Not implemented (requires OpenAI API key)")
    pdf.bullet("Full mobile admin layout optimization - Partially done")
    pdf.bullet("Evidence annotation tools - Not implemented")
    pdf.bullet("Chat read receipts and delivery status - Not implemented")
    pdf.bullet("Full offline operation queuing - Partially implemented")

    # Known issues
    pdf.section_title("12. Known Issues")
    pdf.subsection_title("PWA Manifest Conflict (Low Impact)")
    pdf.body_text(
        "When installing the responder app, it sometimes opens the main app. "
        "Workaround: use the clear cache button or fresh install. Browser version "
        "works correctly."
    )
    pdf.subsection_title("Browser Cache Persistence (Low Impact)")
    pdf.body_text(
        "Old versions may be cached aggressively. Version badges and clear cache "
        "button are provided as workarounds."
    )

    # Code observations
    pdf.section_title("13. Code Observations")
    pdf.bullet("admin.js is very large (~3,500 lines) - consider splitting into hooks/components")
    pdf.bullet("Dual architecture: Supabase primary, Express/MongoDB legacy remains")
    pdf.bullet("Inline styles throughout - no CSS framework; uses globals.css and admin-mobile.css")
    pdf.bullet("Storage bucket name 'emergency media' contains a space - must match Supabase exactly")
    pdf.bullet("Feature flags in featureFlags.js centralize toggles; AI is off by default")

    # Completion status
    pdf.section_title("14. Completion Status")
    pdf.table_row("Category", "Status", "Notes", header=True)
    pdf.table_row("Core Features", "100%", "All essential features complete")
    pdf.table_row("Optional Enhancements", "40%", "Nice-to-have features remain")
    pdf.table_row("Bug Fixes", "95%", "Critical bugs resolved")
    pdf.table_row("Production Readiness", "Ready", "Deploy as-is recommended")
    pdf.ln(3)

    # How to run
    pdf.section_title("15. Local Development")
    pdf.body_text(
        "Frontend:\n"
        "  cd frontend\n"
        "  npm install\n"
        "  npm run dev          # http://0.0.0.0:3000\n\n"
        "Optional Legacy Backend:\n"
        "  cd backend\n"
        "  npm install\n"
        "  npm run dev          # http://localhost:4000\n\n"
        "Required Environment Variables:\n"
        "  NEXT_PUBLIC_SUPABASE_URL\n"
        "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )

    # Emergency numbers
    pdf.section_title("16. Ghana Emergency Numbers")
    pdf.table_row("Type", "Number", "Service", header=True)
    pdf.table_row("Fire", "192", "Ghana Fire Service", "")
    pdf.table_row("Medical", "193", "National Ambulance Service", "")
    pdf.table_row("Crime", "191", "Ghana Police Service", "")

    pdf.output(str(OUTPUT))
    return OUTPUT


if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF created: {path}")
