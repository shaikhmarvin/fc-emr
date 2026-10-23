# Lab import

Lab Import is available in the sidebar to leadership and lab staff. It accepts
PDFs and images. It does not save results to a chart until a reviewer chooses a
patient and visit, verifies that target, checks every source page, and verifies
uncertain results.

## Extraction and review

- Digital PDFs use their embedded text and positions when available. Scans use
  the existing Google OCR function in groups of four pages, freeing rendered
  canvases between pages instead of holding the entire scanned file in memory.
- Google word positions and confidence are retained. Words are grouped by their
  baseline, then result, units, and reference columns are read separately.
  See [Google's document text response](https://docs.cloud.google.com/vision/docs/fulltext-annotations).
- Unknown tests remain editable results when an explicit result column is found.
  Text-only fallback results are flagged and must be checked against the source.
  They do not display catalog ranges as if those ranges came from the report.
- Every input page remains represented, including unreadable pages and pages
  without recognized tests. A page check is required so omitted rows can be
  entered manually. A page check alone is not a proof of extraction accuracy.
- Source links show the original page and highlight positioned result rows.
  Original files are retained in this browser's IndexedDB, scoped by signed-in
  user and file fingerprint. They are not uploaded to a new shared file store.
  Another device must reattach the exact original file; its SHA-256 is checked.
- Page merging requires consistent identifiers and compatible collection dates.
  Continuation pages may omit a date or part of the patient name. An undated
  page joins only one unambiguous patient/report group, and cannot bridge reports
  with different known dates. Existing batches are grouped when loaded, and
  corrections, patient selection, skipping, and saving update all member packets
  together without deleting their original records. Source result IDs prevent
  repeated rows after a combined packet is reloaded. Missing
  names/DOBs are never used as shared identity keys. Multiple MRNs on a page block
  chart saving; split the original into separate patient reports first.
- Exact name plus DOB can suggest a patient; ambiguous matches require selection.
  The reviewer still explicitly verifies the patient and visit. Visits are only
  suggested when exactly one clinic date matches the extracted collection date.
- Repeated rows are flagged. Repeat file uploads reopen the existing batch before
  OCR. Saved packets remain available for source history and duplicate detection.
- Chart saving preserves other imports and uses a conditional update to detect
  concurrent changes. Retrying a partially completed save replaces only the
  results carrying that same packet ID. Blank placeholders are not chart results.

## Deployment

The frontend and OCR function must both be updated for positioned scan extraction.
The frontend remains compatible with the old OCR response, but marks those results
as text-only fallback and requires manual source verification.

From `frontend`, sign in to the existing Supabase project, then deploy:

```powershell
supabase login
supabase functions deploy google-ocr --project-ref dqzmsetdjdimjrzqattf
```

Publish the frontend through the project's existing hosting workflow after a
successful build. No database schema migration or new API secret is required;
source metadata uses the existing `duplicate_summary_json` field.

## Validation

```powershell
node --test src/lib/labParser.test.js src/lib/labDocument.test.js src/lib/readLabDocument.test.js
npm run build
```

Tests include de-identified transcriptions from a supplied UMC report, positioned
rows, explicit qualifiers, qualitative results, high values, skew, identity/date
conflicts, repeated rows, blank values, unreadable pages, and incomplete responses.
These tests do not establish accuracy across every laboratory or scan format.
Full OCR and chart-saving verification in a test environment remains required.
Do not use real chart writes as an extraction test.
