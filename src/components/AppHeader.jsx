export default function AppHeader({
  activeView,
  selectedPatient,
  getFullPatientName,
  formatDate,
  user,
  userRole,
  handleResetSession,
  sidebarOpen,
  setSidebarOpen,
  onOpenStickyNotes,
  medicalSoapEnabled,
  chartingSettingsBusy,
  onToggleMedicalSoap,
  onManageSignature,
}) {
  return (
  <div className="sticky top-0 z-40 border-b bg-white shadow-sm">
    <div className="h-1 bg-red-500" />

    <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 xl:hidden"
        >
          ☰
        </button>

        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-slate-800 sm:text-3xl lg:text-2xl">
            {activeView === "dashboard" && "Clinic Dashboard"}
            {activeView === "queue" && "Live Waiting Queue"}
            {activeView === "board" && "Main Room Board"}
            {activeView === "formulary" && "Clinic Formulary"}
            {activeView === "chart" && "Patient Chart"}
            {activeView === "programs" && "Programs Tracker"}
            {activeView === "lab" && "Lab Queue"}
            {activeView === "lab-import" && "Lab Import Review"}
            {activeView === "specialty-queue" && "Specialty Queue"}
            {activeView === "pharmacy" && "Pharmacy Queue"}
            {activeView === "users" && "User Management"}
            {activeView === "undergrad-intake" && "Patient Intake"}
            {activeView === "analytics" && "Clinic Analytics"}
            {activeView === "roomboard" && "Room Board"}
            {activeView === "summary" && "Clinic Summary"}
            {activeView === "research" && "Clinic Tracker"}
            {activeView === "pap" && "Patient Assistance Program Tracker"}
            {activeView === "registration" && "Patient Registration"}
          </h2>

          <p className="text-sm text-slate-500">{formatDate(new Date())}</p>

          {activeView === "chart" && selectedPatient && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
              <span>{getFullPatientName(selectedPatient)}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                MRN {selectedPatient.mrn || "—"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-shrink-0">
        <div className="text-right text-sm">
          <p className="font-medium text-slate-800">
            {user?.user_metadata?.full_name || "User"}
          </p>
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
            {userRole?.replace("_", " ")}
          </span>
        </div>

        {userRole === "leadership" && (
          <>
          <button
            type="button"
            onClick={onToggleMedicalSoap}
            disabled={chartingSettingsBusy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${medicalSoapEnabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-600 hover:bg-slate-700"}`}
          >
            Medical SOAP: {medicalSoapEnabled ? "On" : "Off"}
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?display=board`;
              window.open(url, "_blank", "width=1600,height=900");
            }}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            🖥️ Open Display Board
          </button>
          </>
        )}

        {["attending", "physical_therapy"].includes(userRole) ? (
          <button type="button" onClick={onManageSignature} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            My Signature
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onOpenStickyNotes?.()}
          className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-yellow-300"
        >
          Sticky Notes
        </button>

        <button
          onClick={() => {
            if (!window.confirm("You will be signed out and need to log back in. Continue?")) return;
            handleResetSession();
          }}
          className="rounded-lg bg-red-500 px-3 py-2 text-xs text-white hover:bg-red-600"
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  </div>
);
}

