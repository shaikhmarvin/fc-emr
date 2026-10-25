# Lab import

Lab Import is available in the sidebar to leadership and lab staff. It accepts
PDFs and images. It does not save results to a chart until a reviewer chooses a
patient and visit, verifies that target, checks every source page, and verifies
uncertain results.

## Extraction and review

- Digital PDFs use their embedded text and positions when available. Scans use
  the existing Google OCR function in groups of four pages, freeing rendered
  canvases between pages instead of holding the entire scanned file in memory.
- Before scanned PDF pages reach OCR, a local text-line alignment pass estimates
  tilt up to 12 degrees in either direction. Confident corrections rotate a padded,
  white-background image without clipping the page; uncertain or nearly level
  pages stay unchanged. This handles uniform page tilt, not curved pages,
  perspective distortion, or sideways pages. The original PDF is retained, and
  OCR highlights are mapped back to its coordinates. Correction angles and
  confidence are recorded in import diagnostics.
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
  New uploads store the original in the private `lab-import-sources` bucket.
  Approved leadership and lab users can download it for side-by-side review.
  The shared file is deleted only after every packet in that upload is saved; server storage policies enforce the completion check. Cleanup retries
  when a batch is reopened. Extracted results and review metadata remain.
  Existing browser-only uploads require reattachment; old sources are not
  automatically migrated. Local browser copies may remain after shared cleanup.
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
- Chart saving is additive and uses a conditional update to detect concurrent
  changes to the selected visit. Repeated results from the same document are
  skipped, including results already saved under another visit in this patient's
  chart. Changed values and uncertain older source metadata block saving for
  review. Existing results, reviewer flags, and rows missed by a later OCR run
  remain intact. Blank placeholders are not chart results.
- "Re-run OCR into a new review" retains the original file fingerprint and
  creates a separate review batch. It does not write to the patient chart.

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
node --test src/lib/labParser.test.js src/lib/labDocument.test.js src/lib/readLabDocument.test.js src/lib/straightenScan.test.js
npm run build
```

Tests include de-identified transcriptions from a supplied UMC report, positioned
rows, explicit qualifiers, qualitative results, high values, skew, identity/date
conflicts, repeated rows, blank values, unreadable pages, and incomplete responses.
These tests do not establish accuracy across every laboratory or scan format.
Full OCR and chart-saving verification in a test environment remains required.
Do not use real chart writes as an extraction test.

## Debug export v3

Use **Export Debug JSON** in the review screen. It includes the currently edited
results immediately, even before the delayed shared save finishes. A failed
initial import also exposes **Export import diagnostics** above the empty review.

New imports capture a run ID and pipeline version, file fingerprint/type/size,
page text before and after row reconstruction, word boxes/confidence, native text
versus OCR decisions, render dimensions, OCR batch timings, page errors, parser
outputs before selection, and grouping assignments. No file image bytes or API
credentials are exported. Detailed traces are stored in this browser alongside
the original source; the shared packet keeps the run ID and a compact summary.

Per-lab original import and review baselines identify changes to test identity,
name, value, units, range and flags. Aggregate counts distinguish automatic
adjustments, reviewer modifications, manual additions, removals, verification-only
actions and reused ranges. `improvementTargets.byTest` summarizes which tests
needed corrections. It is a review workload metric, not an accuracy estimate.

Save events record duplicate skips, newly added counts, successful chart writes,
completed packet updates, and failures, including whether the chart write had
already succeeded. Persisted review audit rows are included when available.
Unknown older baselines or traces are labeled unavailable instead of reconstructed
as if they had been captured. Source text and matching identifiers may include
patient information; unrelated chart notes are excluded.

## Shared original report deployment

Apply `supabase/migrations/20261024130000_shared_lab_sources.sql` before publishing
the frontend. This creates a private bucket (100 MiB per file) and reviewer access
policies. Verify with two approved reviewer accounts: upload once, open the source
on the second account, confirm an unfinished packet prevents deletion, then finish
or skip every packet and confirm the shared object is removed. No chart writes
are needed for this storage check; use a synthetic report and skip test packets.

## Completed and deferred imports

Saved packets leave the active queue. Skipped packets appear under **Review later**
across batches and can be resumed. Their source remains available until all packets
in that upload are saved. On completion, shared originals, raw import text, parsed
review copies and source-page metadata are removed; chart results, audit records
and minimal fingerprint/patient/visit references remain. Browser copies and local
traces are cleared when that browser loads the completed batch. Other devices may
retain a cached copy until they revisit that batch. Migration
`20261024150000_completed_lab_cleanup.sql` enforces the skipped-source retention rule.
## Review recovery and lab destinations

The encounter picker includes general, refill-only, specialty and combined visits,
with explicit type labels. Refill-only visits can receive imported labs while their
vitals entry section remains hidden. A single matching clinic date may be suggested;
multiple same-day visits still require a selection.

Review edits are queued in order and backed up locally before transmission, scoped
by signed-in user and packet. Pending drafts are recovered and retried on reopening.
Checked source pages and the confirmed patient/encounter are shared through
`review_progress_json`; source verification flags stay with the saved review rows.
Changing the destination clears its verification. The browser remembers the last
active batch/packet, and validates that the batch is still active before reopening it.
An older write acknowledgment cannot clear a newer pending recovery copy.

Migration `20261025120000_persist_lab_review_progress.sql` adds the progress field.
The footer distinguishes pending review saves from saved review state. Patient chart
writes still require Save Imported Labs. Recovery assumes browser storage is available;
if storage is unavailable, the review shows a warning to wait for the shared save.
