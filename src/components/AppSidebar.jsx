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
  userRole,
}) {
  function handleViewChange(view) {
    setActiveView(view);
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
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 md:translate-x-0 md:overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        <div className="border-b px-6 py-5">
          <h1 className="text-2xl font-bold text-red-700">Free Clinic</h1>
          <p className="text-sm text-slate-500">Wednesday Clinic Flow</p>
        </div>
        <nav className="space-y-2 p-4">

  {/* 🔥 PHARMACY ONLY VIEW */}
  {userRole === "pharmacy" && (
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
  )}

  {/* 🔥 EVERYONE ELSE */}
  {userRole !== "pharmacy" && (
    <>
      {isLeadershipView && (
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
      )}

      {userRole === "undergraduate" && (
        <button
          onClick={() => handleViewChange("undergrad-intake")}
          className={`w-full rounded-lg px-4 py-3 text-left ${
            activeView === "undergrad-intake"
              ? "bg-slate-200 font-medium text-slate-900"
              : "hover:bg-slate-100"
          }`}
        >
          Undergrad Intake
        </button>
      )}

      {(userRole === "undergraduate" || isLeadershipView) && (
        <button
          onClick={() => handleViewChange("registration")}
          className={`w-full rounded-lg px-4 py-3 text-left ${
            activeView === "registration"
              ? "bg-slate-200 font-medium text-slate-900"
              : "hover:bg-slate-100"
          }`}
        >
          Registration
        </button>
      )}

      {userRole !== "undergraduate" && (
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
      )}

      {userRole !== "undergraduate" && (
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
      )}

      {userRole !== "undergraduate" && (
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
      )}

      {isLeadershipView && (
        <button
          onClick={() => {
            setActiveView("users");
            setSidebarOpen(false);
          }}
          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${
            activeView === "users"
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          User Management
        </button>
      )}

      {isLeadershipView && (
        <button
          onClick={() => {
            setActiveView("summary");
            setSidebarOpen(false);
          }}
          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${
            activeView === "summary"
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Clinic Summary
        </button>
      )}

      {isLeadershipView && (
        <button
          onClick={() => {
            setActiveView("programs");
            setSidebarOpen(false);
          }}
          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${
            activeView === "programs"
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Programs
        </button>
      )}
    </>
  )}

</nav>
      </aside>
    </>
  );
}