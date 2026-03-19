export default function AppSidebar({
  activeView,
  setActiveView,
  setIsEditingIntake,
  setEditingPatientId,
  setIntakeForm,
  setIntakeTab,
  setShowIntakeModal,
  EMPTY_FORM,
  sidebarOpen,
  setSidebarOpen,
  isLeadershipView,
}) {
  function handleViewChange(view) {
    setActiveView(view);
    setSidebarOpen(false);
  }

  function handleNewIntake() {
    setIsEditingIntake(false);
    setEditingPatientId(null);
    setIntakeForm(EMPTY_FORM);
    setIntakeTab(0);
    setShowIntakeModal(true);
    setSidebarOpen(false);
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 md:translate-x-0 md:overflow-y-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
    >  
        <div className="border-b px-6 py-5">
          <h1 className="text-2xl font-bold text-red-700">Free Clinic</h1>
          <p className="text-sm text-slate-500">Wednesday Clinic Flow</p>
        </div>

        <nav className="space-y-2 p-4">
          <button
            onClick={() => handleViewChange("dashboard")}
            className={`w-full rounded-lg px-4 py-3 text-left ${
              activeView === "dashboard"
                ? "bg-slate-200 font-medium text-slate-900"
                : "hover:bg-slate-100"
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => handleViewChange("queue")}
            className={`w-full rounded-lg px-4 py-3 text-left ${
              activeView === "queue"
                ? "bg-slate-200 font-medium text-slate-900"
                : "hover:bg-slate-100"
            }`}
          >
            Live Queue
          </button>

          <button
            onClick={() => handleViewChange("board")}
            className={`w-full rounded-lg px-4 py-3 text-left ${
              activeView === "board"
                ? "bg-slate-200 font-medium text-slate-900"
                : "hover:bg-slate-100"
            }`}
          >
            Room Board
          </button>

          <button
            onClick={() => handleViewChange("formulary")}
            className={`w-full rounded-lg px-4 py-3 text-left ${
              activeView === "formulary"
                ? "bg-slate-200 font-medium text-slate-900"
                : "hover:bg-slate-100"
            }`}
          >
            Formulary
          </button>

          {isLeadershipView && (
            <button
              onClick={() => {
                setActiveView("users");
                setSidebarOpen(false);
              }}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${activeView === "users"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
                }`}
            >
              User Management
            </button>
          )}

          {isLeadershipView && (
            <button
              onClick={handleNewIntake}
              className="w-full rounded-lg bg-red-700 px-4 py-3 text-left text-white hover:bg-red-800"
            >
              + New Intake
            </button>
          )}
        </nav>
      </aside>
    </>
  );
}