export default function BreastExamBadge({ encounter }) {
  const intake = encounter?.intakeData || encounter?.intake_data || {};
  const status = encounter?.mammogramStatus ?? encounter?.mammogramPapSmear ?? intake.mammogramStatus ?? intake.mammogramPapSmear ?? "";
  if (String(status).trim().toLowerCase() !== "interested") return null;
  return <span className="inline-flex max-w-full whitespace-normal rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">Breast Exam/Mammogram</span>;
}
