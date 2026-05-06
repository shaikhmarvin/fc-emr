export default function AppHeader({
  activeView,
  selectedPatient,
  getFullPatientName,
  formatDate,
  user,
  userRole,
  handleResetSession,
  isLeadershipView,
  setIsEditingIntake,
  setEditingPatientId,
  setIntakeForm,
  setIntakeTab,
  setShowIntakeModal,
  EMPTY_FORM,
  sidebarOpen,
  setSidebarOpen,
}) {
  return (
    <div className="sticky top-0 z-40 border-b bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 xl:hidden"
            >
              ☰
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-800 sm:text-2xl">
                {activeView === "dashboard" && "Clinic Dashboard"}
                {activeView === "queue" && "Live Waiting Queue"}
                {activeView === "board" && "Main Room Board"}
                {activeView === "formulary" && "Clinic Formulary"}
                {activeView === "chart" ? "Patient Chart" : ""}
              </h2>

              <p className="text-sm text-slate-500">
                {new Date().toLocaleDateString()}
              </p>

              {activeView === "chart" && selectedPatient && (
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {getFullPatientName(selectedPatient)} • MRN {selectedPatient.mrn || "—"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">
            <div className="text-sm">
              <p className="font-medium text-slate-800">
                {user?.user_metadata?.full_name || "User"}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {userRole?.replace("_", " ")}
              </p>
            </div>

            <button
              onClick={() => {
                if (!window.confirm("You will be signed out and need to log back in. Continue?")) return;
                handleResetSession();
              }}
              className="rounded-lg bg-red-500 px-3 py-2 text-xs text-white hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>

          <div className="flex items-center gap-2">
            {userRole === "leadership" && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?display=board`;
                  window.open(url, "_blank", "width=1600,height=900");
                }}
                className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
              >
                Open Display Board
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}