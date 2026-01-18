

# SyncTime Verify

SyncTime Verify is a collaborative timesheet management and clash detection tool for teams. Users upload timesheets in multiple formats, and the system automatically detects scheduling conflicts between team members.

## Core Features

- **Multi-Format Upload**: Upload timesheets via CSV, PDF, or manual entry
- **Client-Side Processing**: Fast extraction without external APIs - uses papaparse for CSV and PDF.js for PDFs
- **Real-Time Clash Detection**: Automatically compares timesheets and shows overlapping shifts
- **Team Collaboration**: Admin users invite/remove team members, all users see clashes
- **Period-Based Sessions**: Organize shifts by year and working period (e.g., "Jan 26 - Feb 26, Year 2026")
- **Live Submission Tracking**: Real-time Firestore listeners show submissions as they arrive
- **Submission Management**: Users can view and delete their own submissions

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Firebase (Firestore + Authentication)
- **Data Processing**: 
  - papaparse - CSV parsing
  - PDF.js - Client-side PDF text extraction
- **UI Components**: Lucide React icons
- **Real-Time**: Firestore `onSnapshot` listeners for live updates

## Development Challenges & Solutions

### Challenge 1: Firestore Composite Index Requirement
**Problem**: Initial date range queries (`where('teamId', '==', x) and where('date', '>=', startDate)`) required a composite index, blocking the app.

**Solution**: Refactored to query only by `teamId`, then filter dates client-side in JavaScript. This avoids the index requirement and is more performant for typical team sizes.

### Challenge 2: Submission Latency Issues
**Problem**: Submissions weren't appearing in the ClashPanel immediately after upload due to Firestore replication delays.

**Solution**: Implemented optimistic state updates - the app immediately adds locally-saved shifts to state while Firestore syncs in background. Then added real-time listeners with `onSnapshot` to keep data in sync automatically.

### Challenge 3: PDF.js Worker Loading
**Problem**: PDF.js requires a separate worker thread, and external CDNs were blocked by CORS policies and availability issues (jsDelivr, unpkg, cdnjs all failed).

**Solution**: Copied `pdf.worker.min.mjs` to the public folder and serve it locally. This eliminates all CORS issues and ensures the worker is always available. Updated the worker source path to `/pdf.worker.min.mjs`.

### Challenge 4: PDF Text Extraction Format Variability
**Problem**: Different PDF formats have different text layouts, making regex pattern matching unreliable.

**Current State**: Uses regex to find date/time patterns (`MM/DD/YYYY HH:MM AM/PM`). Browser console logs show exactly what text was extracted and which patterns matched, making it easy to debug format issues.

**Future Improvement**: Consider implementing a more flexible parser that can handle multiple date/time formats or allow users to map CSV columns.

### Challenge 5: Non-Admin User Visibility
**Problem**: The ClashPanel wasn't visible to regular team members - only admin could see it.

**Solution**: Changed the visibility check from `activeClashes.length > 0` to `getSubmitters().length > 0`. Now all team members see the clash detection interface regardless of their role.

### Challenge 6: PDF Extraction Skips with Additional Columns
**Problem**: The PDF parser was skipping rows that contained additional text (like "OUT" and "IN" in a lunch column) between the arrival and departure times. This happened because the regex pattern was too strict, expecting only whitespace between consecutive time matches.

**Solution**: Updated the `dateTimePattern` regex in `documentParser.ts` to use non-greedy matching `(?:\s+[\s\S]*?)?` between the date and the times. This allows the parser to gracefully ignore any "noise" or additional columns (like Lunch) while still capturing the core arrival and departure data on each row.

### Challenge 7: Out-of-Order PDF Text Extraction
**Problem**: During the Admin Batch Portal implementation, extracting the "Worker Name" and "Position" was failing or returning incorrect labels (e.g., "DATE ARRIVAL"). This occurred because PDF text elements are often stored in the file stream out of their visual reading order.

**Solution**: Re-engineered the PDF extraction logic to sort all text items by their visual coordinates (`y` for top-to-bottom, then `x` for left-to-right) before joining them into a string. This visually reconstructs the page's layout in memory, ensuring that labels like "NAME OF STUDENT" are correctly followed by the actual worker data.

### Challenge 8: Admin Portal White-Screen Crash
**Problem**: Processing multiple timesheets in the Admin Batch Portal caused the application to crash (white screen). This was a "Rules of Hooks" violation where `useState` was being called inside a `.map()` loop while rendering clash cards.

**Solution**: Refactored the clash card into a standalone `BatchClashCard` component. This ensures that each card manages its own internal state (`expanded`) correctly within the React component lifecycle, maintaining application stability even with hundreds of detected conflicts.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Firebase project with Firestore and Authentication enabled
- Environment variables configured

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/synctime-verify.git
   cd synctime-verify
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create `.env.local` with your Firebase config:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Run the development server
   ```bash
   npm run dev
   ```

5. Build for production
   ```bash
   npm run build
   ```

## Upload Formats

### CSV Format
Expected columns: `DATE`, `ARRIVAL TIME`, `DEPARTURE TIME`, `HOURS WORKED`

Example:
```
DATE,ARRIVAL TIME,DEPARTURE TIME,HOURS WORKED
01/27/2026,09:00 AM,05:00 PM,8
01/28/2026,08:30 AM,04:30 PM,8
```

### PDF Format
Supports text-based PDFs with dates and times. Parser looks for patterns like `01/27/2026 09:00 AM 05:00 PM`.

### Manual Entry
Form-based entry for individual shifts with date, times, and optional description.

## Debugging

All operations log to the browser console with emoji prefixes:
- 📄 - PDF operations
- 📕 - PDF upload
- 🔍 - Pattern matching
- 💾 - Database saves
- 📤 - Callbacks
- ✅ - Success
- ❌ - Errors

Check the console (F12) when troubleshooting data extraction issues.
