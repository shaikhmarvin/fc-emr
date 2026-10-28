const formulas = {
  patients: [
    ['Chronic return rate', 'Chronic general return visits ÷ all chronic general visits × 100. A return visit has an earlier saved, non-cancelled general-clinic visit on a different date; that earlier visit may be before the selected date range.'],
    ['Disease-group return rate', 'General return visits in the disease group ÷ all general visits in that group × 100. These are visit-based rates; one patient can contribute multiple visits.'],
    ['Average visit minutes', 'Sum of valid visit durations in the disease group ÷ number of visits with valid durations. Duration = visit-complete time (or done time if unavailable) − registration time, rounded to whole minutes per visit. Only 1–480 minutes qualify; the average is rounded to whole minutes.'],
    ['Average days between general visits', 'Sum of days between consecutive distinct general-clinic dates for each patient ÷ total number of those intervals, rounded to 1 decimal. Both dates must be within the selected dates and clinic event. Same-day visits count as one date; patients with fewer than two dates contribute no interval.'],
    ['Patient and visit counts', 'Patients are distinct patient IDs in each group; visits count qualifying encounters. Patients with refill-only visits count distinct patients with at least one qualifying refill visit, separately from general visits.'],
  ],
  followup: [
    ['30 / 60 / 90-day return share', 'Eligible index patients who have a later general visit within the selected number of days ÷ all eligible index patients × 100, calculated separately for each group.'],
    ['Eligibility and return interval', 'Index date = the patient’s earliest qualifying general visit in the selected period. Days observed = selected Through date − index date; eligibility requires at least the selected 30, 60, or 90 days. Return interval = next distinct general-visit date − index date; intervals from 1 through the selected number of days count as returned. Insufficient follow-up is excluded from the denominator.'],
  ],
  clinical: [
    ['Daily patient reading', 'Sum of distinct valid readings for a patient on a date ÷ number of distinct valid readings that day. Identical readings on the same date count once. BP components and A1C are calculated separately.'],
    ['Patients with data / missing', 'With data = patients with at least one valid dated reading; missing = total cohort patients − patients with data. With follow-up = patients with readings on at least two distinct dates.'],
    ['Follow-up latest value and range', 'Only patients with readings on at least two distinct dates contribute. Latest value = sum of their latest daily readings ÷ patients with follow-up. With one eligible patient, this is shown as their reading, not an average. Range is shown only with more than one eligible patient. Average and mean are the same calculation.'],
    ['Paired first → latest', 'For patients with at least two reading dates: first average = sum of their first daily readings ÷ paired patients; latest average = sum of their latest daily readings ÷ the same paired patients.'],
    ['Average change', 'Sum of (latest daily reading − first daily reading) for paired patients ÷ number of paired patients. BP change is in mmHg; A1C change is in percentage points.'],
    ['Lower / same / higher', 'Counts of paired patients whose latest − first reading is negative, zero, or positive (differences within 0.000000001 are treated as zero).'],
    ['Average follow-up', 'Sum of (latest reading date − first reading date) in days for paired patients ÷ number of paired patients.'],
    ['HTN follow-up comparison', 'Only patients with two or more reading dates contribute to first / latest values and change. Patients with one dated reading appear in a separate count and patient list; they have no first-to-latest comparison. Values are averages when more than one patient has follow-up. Median and range are shown only for more than one patient. Latest median is the middle latest reading after sorting, or the average of the two middle readings for an even count.'],
    ['Display precision', 'Clinical averages, ranges, medians, changes, and average follow-up days are displayed to 1 decimal; calculations use the underlying values before display rounding.'],
  ],
  access: [
    ['Language share', 'General visits in the language category ÷ all qualifying general visits × 100.'],
    ['Language average visit time', 'Sum of valid (completion time − undergrad-complete time) minutes in the language category ÷ visits in that category with valid timing. Intervals and averages are rounded to whole minutes; only intervals of 1–480 minutes qualify. Completion uses medication pickup, then visit-complete, then done time, in that order.'],
    ['Transportation visit share', 'General visits reporting the transportation mode ÷ all qualifying general visits × 100.'],
    ['Transportation return-visit counts', 'For each patient and mode, count distinct general-visit dates after their earliest visit reporting that mode within the selected period and clinic event. Patients with returns are split into exactly 1, 2, 3, or 4+ later dates. Later visits may use another mode. Same-day encounters count once; refill, specialty-only, and cancelled visits are excluded.'],
    ['Transportation average days between general visits', 'Average days from a general visit reporting the mode to the patient’s next distinct general-visit date within the selected dates and clinic event. The next visit may report a different mode. Same-day visits count once per mode; visits without a later general visit do not contribute. Refill, specialty-only, and cancelled visits are excluded. Displayed to 1 decimal.'],
    ['Transportation observed return share', 'Distinct patients reporting the mode who have a later general visit in the selected period ÷ distinct patients reporting that mode × 100. The later visit may report a different mode. A patient can appear in multiple transportation groups.'],
  ],
  times: [
    ['Each average time', 'For the interval named on the metric or column: sum of valid elapsed minutes ÷ encounters with a valid interval. Elapsed minutes = (end timestamp − start timestamp) ÷ 60,000 milliseconds, rounded to whole minutes. Only 1–480 minutes qualify; missing or invalid intervals are excluded separately for each average. Averages are rounded to whole minutes.'],
    ['Registration terms', 'Patient Checked In is the recorded check-in time. Leadership Registration Complete marks the end of leadership registration.'],
    ['General clinic average / total clinic', 'Measured from Undergrad Registration Complete to medication pickup, otherwise Visit Complete, otherwise done time.'],
    ['Refill patient average', 'Measured from Undergrad Registration Complete, otherwise Patient Checked In, to medication pickup. Only non-cancelled refill visits contribute.'],
    ['Student Start Time', 'Student Start Time is recorded when the first attending is saved on the room-board roster for the clinic date when students are allowed to begin seeing patients. Later roster changes do not reset it. Dates without recorded arrival use the saved student assignment timestamp. Original assignment timestamps are retained. Student Start Time → Complete uses this start and the general-clinic completion rule above.'],
    ['Other workflow averages', 'Patient Checked In → Leadership Registration Complete and Visit Complete → Pickup use the named timestamps. Leadership Registration Complete → Student Start Time and Student Start Time → Upper-Level Assigned use the attending-arrival-based student start. Negative or zero intervals are excluded.'],
    ['Ranges and clinic-date comparisons', 'Range = minimum to maximum valid interval. Each clinic-date average uses only encounters on that date, with its own valid-interval denominator. General flow summaries include general encounters, including cancelled encounters when they have valid timestamps; refill visits are calculated separately.'],
  ],
  workflow: [
    ['Workflow terms', 'Patient Checked In is the recorded check-in time. Leadership Registration Complete marks the end of registration. Student Start Time is recorded when the first attending is saved on the room-board roster for the clinic date when students are allowed to begin seeing patients; dates without arrival use the saved student assignment timestamp. Original assignment records are retained.'],
    ['Workflow median', 'Sort valid elapsed minutes for the named stage; use the middle value, or the mean of the two middle values for an even count. Each stage uses its own valid intervals of 1–480 whole minutes.'],
    ['90th percentile', 'Sort valid stage minutes from lowest to highest; select the value at position ceiling(0.90 × number of valid intervals), counting positions from 1.'],
    ['Usable / assessed', 'Usable = encounters with a valid interval for the stage; assessed = all qualifying encounters. Missing timestamps and invalid intervals are counted separately. Clinic-date comparisons apply the same formulas within each date.'],
  ],
  pharmacy: [
    ['Pickup rate / share', 'Encounters marked picked up ÷ (picked up + not picked up encounters) × 100. Pending, no-medication-needed, and unrecorded outcomes are excluded from this denominator. A saved pickup timestamp takes precedence over status.'],
    ['Patients with a refill visit', 'Distinct cohort patients with at least one refill-only visit ÷ distinct cohort patients with any general or refill visit × 100.'],
    ['Visit share within a cohort', 'Visits of the listed type ÷ all general and refill visits in that cohort × 100.'],
    ['Consecutive visit-pattern share', 'Eligible consecutive visit pairs with the listed pattern ÷ all eligible consecutive general/refill visit pairs × 100. Pairs touching a date with multiple encounters are excluded.'],
    ['Median days between visit pairs', 'For each pattern, sort (later visit date − previous visit date) in days; use the middle interval, or mean of the two middle intervals for an even count. Patients can contribute multiple pairs.'],
  ],
  screening: [
    ['Screening response share', 'Eligible general visits with the listed response ÷ all screening-eligible general visits × 100, including Not recorded responses in the denominator. PAP eligibility: female, age 21–65 at the visit. Mammogram eligibility: female, age 45 or older at the visit. Visits with missing age are excluded.'],
  ],
};

export default function ResearchCalculations({ section }) {
  return <details className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <summary className="cursor-pointer font-semibold text-slate-900">How these numbers are calculated</summary>
    <dl className="mt-3 space-y-3 text-sm text-slate-600">
      {formulas[section].map(([label, formula]) => <div key={label}><dt className="font-semibold text-slate-700">{label}</dt><dd className="mt-1">{formula}</dd></div>)}
    </dl>
    <p className="mt-3 text-xs text-slate-500">Uses the selected dates, clinic event, and the section’s eligibility rules. Percentages = numerator ÷ denominator × 100, displayed to 2 decimals. A dash (—) means no eligible denominator or no valid values; it does not mean zero.</p>
  </details>;
}
