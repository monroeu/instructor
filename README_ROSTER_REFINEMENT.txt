MG628 / CS650 Instructor Control Center - Roster Management Refinement
2026-11-02

CHANGED: index.html only.
PRESERVED: participation-email.js and participation-schedules.js byte-for-byte.

Added:
- Add student dialog with name, ID, email, status, professor test classification
- CSV template download
- CSV parser supporting quoted commas and line breaks
- Preview: new/updated/invalid counts, duplicate detection, validation
- Explicit import confirmation, section consistency check, batches of 50
- Roster refresh after successful uploads

Existing Supabase Edge function instructor-api v19 supports:
- roster_upsert for individual records
- roster_bulk for CSV rows
No database schema/Edge function changes made.

Deploy to the shared instructor site by replacing the existing instructor/index.html;
keep both companion JavaScript files in the instructor directory.

IMPORTANT: Roster bulk operation in existing backend does not report individual database write errors.
Do not treat a successful response alone as proof of every row being saved; verify
roster counts and entries after uploading. Existing student accounts and participation
records are not deleted by these operations.

Static tests: Node syntax verification passed for all local inline scripts and companion JS.
Live signed-in import and RLS/permissions checks have not been performed.
