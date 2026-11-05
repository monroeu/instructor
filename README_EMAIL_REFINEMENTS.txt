Monroe University Instructor Control Center - Participation Email Safety Refinements

Files updated:
- index.html: Added section-specific delivery audit panel and a second explicit confirmation for the legacy bulk reminder workflow.
- participation-email.js: Recipients default to unchecked; 'Preview' now requests the exact personalized email HTML from the server, which includes recorded active-study time; sending remains behind confirm+typed SEND; read-only audit history is available for the selected section.
- participation-schedules.js: Clearer wording about the difference between saved enabled schedules and a commissioned automatic dispatch runner.

Supabase backend:
- participation-bulk-email Edge Function version 9 was deployed with a read-only, instructor-authorized 'audit' action; no real student messages were sent during deployment.
- The three existing schedule rows were marked enabled while retaining their configured weekdays/times (Eastern Time). The automatic dispatcher was subsequently commissioned using a secured Supabase Edge Function and a database cron job every five minutes. The dispatcher checks each schedule in America/New_York and sends only when the configured time/day matches; it uses unique per-section/day runs and server-side eligibility filters. An authenticated dry run returned all 3 enabled sections and zero sent emails. Actual scheduled dispatch has NOT yet occurred or been verified by a real scheduled run.

Deployment:
1. Back up existing instructor repository.
2. Replace the three files above, preserving other repo files.
3. Commit on a feature branch and publish via GitHub Pages.
4. Sign in as instructor, open Participation Emails, Load preview, confirm no students are prechecked; select a student and click Preview to inspect server-produced HTML; click Refresh section audit history.
5. Do NOT click 'Send selected student reports' in production until you intend to send. It sends real emails after confirmation.

Known limits:
- Resend API acceptance is not equivalent to inbox delivery.
- Browser authenticated functional testing is pending; syntax and structural tests passed.
- Automatic dispatch is now commissioned, but no first live scheduled run has been verified; monitor scheduled run records and Resend logs when the first scheduled time occurs.

FINAL ADDITION — ONE-TIME MASS EMAIL (NO SCHEDULING)
- Participation Emails now has a separate "Send a one-time mass email now" panel above the recurring schedules.
- Default recipient scope is the currently selected section, not all active sections.
- Filter by completion, load a current roster, preview an individual server-rendered message, explicitly select recipients, and click "Send one-time mass email now".
- A confirmation shows count and impacted section(s), followed by typing SEND NOW; no message sends just by selecting or previewing.
- A second one-time mailing requires loading a fresh recipient list, preventing accidental repeats after a partial send.
- Recipients are cleared whenever the roster scope or status filter changes.
- The manual send uses the existing participation-bulk-email endpoint in batches of at most 10 enrolled students; no schedule is created or altered. The report is the standard personalized participation-progress report, not an arbitrary broadcast announcement.
- Scheduled emails remain independently enabled for MG628-158W, MG628-159W, and CS650-F26.
- This upgrade is WEBSITE FILES only; no additional Supabase schema change or endpoint deployment is needed for the one-time send option.
- JavaScript syntax and page control uniqueness verified; a real authenticated manual send to student recipients has intentionally NOT been performed.
