import { useEffect, useState } from "react";

const EMPTY_OPHTHO_NOTE = {
  hpi: "",
  ocularHistory: "",
  vaOd: "",
  vaOs: "",
  phOd: "",
  phOs: "",
  iopOd: "",
  iopOs: "",
  externalOd: "",
  externalOs: "",
  slitLampOd: "",
  slitLampOs: "",
  fundusOd: "",
  fundusOs: "",
  assessment: "",
  plan: "",
};

export default function OphthalmologySoapForm({
  soapDraft,
  updateSoapDraftField,
  isSoapLocked,
}) {
  const [ophthoForm, setOphthoForm] = useState(EMPTY_OPHTHO_NOTE);

  useEffect(() => {
    setOphthoForm({
      ...EMPTY_OPHTHO_NOTE,
      ...(soapDraft?.ophthalmologyNote || {}),
    });
  }, [soapDraft?.ophthalmologyNote]);

  function updateField(field, value) {
    const next = {
      ...ophthoForm,
      [field]: value,
    };

    setOphthoForm(next);
    updateSoapDraftField("ophthalmologyNote", next);
  }

  const inputClass =
    "min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100";

  const textareaClass =
    "min-h-[90px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100";

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Chief Complaint &amp; HPI
        </label>
        <textarea
          className="min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
          value={ophthoForm.hpi}
          onChange={(e) => updateField("hpi", e.target.value)}
          disabled={isSoapLocked}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Medical / Ocular History
        </label>
        <textarea
          className="min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
          value={ophthoForm.ocularHistory}
          onChange={(e) => updateField("ocularHistory", e.target.value)}
          disabled={isSoapLocked}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="bg-slate-50 px-4 py-3 font-semibold text-slate-800">
          Exam
        </div>

        <div className="grid grid-cols-3 gap-px bg-slate-200">
          <div className="bg-white px-3 py-2 text-sm font-semibold text-slate-700"></div>
          <div className="bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700">
            OD
          </div>
          <div className="bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700">
            OS
          </div>

          <div className="bg-white px-3 py-3 text-sm font-medium text-slate-700">
            VA Distant
          </div>
          <div className="bg-white p-2">
            <input
              className={inputClass}
              value={ophthoForm.vaOd}
              onChange={(e) => updateField("vaOd", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>
          <div className="bg-white p-2">
            <input
              className={inputClass}
              value={ophthoForm.vaOs}
              onChange={(e) => updateField("vaOs", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>

          <div className="bg-white px-3 py-3 text-sm font-medium text-slate-700">
            PH
          </div>
          <div className="bg-white p-2">
            <input
              className={inputClass}
              value={ophthoForm.phOd}
              onChange={(e) => updateField("phOd", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>
          <div className="bg-white p-2">
            <input
              className={inputClass}
              value={ophthoForm.phOs}
              onChange={(e) => updateField("phOs", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>

          <div className="bg-white px-3 py-3 text-sm font-medium text-slate-700">
            IOP
          </div>
          <div className="bg-white p-2">
            <input
              className={inputClass}
              value={ophthoForm.iopOd}
              onChange={(e) => updateField("iopOd", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>
          <div className="bg-white p-2">
            <input
              className={inputClass}
              value={ophthoForm.iopOs}
              onChange={(e) => updateField("iopOs", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>

          <div className="bg-white px-3 py-3 text-sm font-medium text-slate-700">
            External
          </div>
          <div className="bg-white p-2">
            <textarea
              className={textareaClass}
              value={ophthoForm.externalOd}
              onChange={(e) => updateField("externalOd", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>
          <div className="bg-white p-2">
            <textarea
              className={textareaClass}
              value={ophthoForm.externalOs}
              onChange={(e) => updateField("externalOs", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>

          <div className="bg-white px-3 py-3 text-sm font-medium text-slate-700">
            Slit Lamp
          </div>
          <div className="bg-white p-2">
            <textarea
              className={textareaClass}
              value={ophthoForm.slitLampOd}
              onChange={(e) => updateField("slitLampOd", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>
          <div className="bg-white p-2">
            <textarea
              className={textareaClass}
              value={ophthoForm.slitLampOs}
              onChange={(e) => updateField("slitLampOs", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>

          <div className="bg-white px-3 py-3 text-sm font-medium text-slate-700">
            Dilated Fundus Exam
          </div>
          <div className="bg-white p-2">
            <textarea
              className={textareaClass}
              value={ophthoForm.fundusOd}
              onChange={(e) => updateField("fundusOd", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>
          <div className="bg-white p-2">
            <textarea
              className={textareaClass}
              value={ophthoForm.fundusOs}
              onChange={(e) => updateField("fundusOs", e.target.value)}
              disabled={isSoapLocked}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Assessment
        </label>
        <textarea
          className="min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
          value={ophthoForm.assessment}
          onChange={(e) => updateField("assessment", e.target.value)}
          disabled={isSoapLocked}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Plan
        </label>
        <textarea
          className="min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm sm:text-base disabled:bg-slate-100"
          value={ophthoForm.plan}
          onChange={(e) => updateField("plan", e.target.value)}
          disabled={isSoapLocked}
        />
      </div>
    </div>
  );
}