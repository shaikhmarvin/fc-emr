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
  canRefillAccess,
}) {
  function handleViewChange(view) {
    setActiveView(view);
    setSidebarOpen(false);
  }

  function getNavItemClass(view) {
    const isActive = activeView === view;

    return [
      "w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition",
      isActive
        ? "bg-slate-900 text-white shadow-sm"
        : "text-slate-700 hover:bg-slate-100",
    ].join(" ");
  }

  function SectionLabel({ children }) {
    return (
      <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {children}
      </p>
    );
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 lg:overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <div className="border-b border-slate-200 px-6 py-6">
          <h1 className="text-2xl font-bold text-red-700">Free Clinic</h1>
          <p className="mt-1 text-sm text-slate-500">Wednesday Clinic Flow</p>
        </div>

        <nav className="space-y-4 p-4">
          {userRole === "pharmacy" ? (
            <div className="space-y-2">
              <SectionLabel>Clinical</SectionLabel>
              <button
                onClick={() => handleViewChange("formulary")}
                className={getNavItemClass("formulary")}
              >
                Formulary
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <SectionLabel>Workflow</SectionLabel>

                {(isLeadershipView || userRole === "undergraduate" || canRefillAccess) && (
                  <button
                    onClick={() => handleViewChange("dashboard")}
                    className={getNavItemClass("dashboard")}
                  >
                    Dashboard
                  </button>
                )}

                {userRole === "undergraduate" && (
                  <button
                    onClick={() => handleViewChange("undergrad-intake")}
                    className={getNavItemClass("undergrad-intake")}
                  >
                    Undergrad Intake
                  </button>
                )}

                {(userRole === "undergraduate" || isLeadershipView) && (
                  <button
                    onClick={() => handleViewChange("registration")}
                    className={getNavItemClass("registration")}
                  >
                    Registration
                  </button>
                )}

                {userRole !== "undergraduate" && (
                  <button
                    onClick={() => handleViewChange("queue")}
                    className={getNavItemClass("queue")}
                  >
                    Live Queue
                  </button>
                )}

                {userRole !== "undergraduate" && (
                  <button
                    onClick={() => handleViewChange("specialty-queue")}
                    className={getNavItemClass("specialty-queue")}
                  >
                    Specialty Patients
                  </button>
                )}

                {userRole !== "undergraduate" && (
                  <button
                    onClick={() => handleViewChange("board")}
                    className={getNavItemClass("board")}
                  >
                    Room Board
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <SectionLabel>Clinical</SectionLabel>

                {userRole !== "undergraduate" && (
                  <button
                    onClick={() => handleViewChange("formulary")}
                    className={getNavItemClass("formulary")}
                  >
                    Formulary
                  </button>
                )}

                {isLeadershipView && (
                  <button
                    onClick={() => handleViewChange("programs")}
                    className={getNavItemClass("programs")}
                  >
                    Specialty Programs
                  </button>
                )}

                {isLeadershipView && (
                  <button
                    onClick={() => handleViewChange("pap")}
                    className={getNavItemClass("pap")}
                  >
                    PAP
                  </button>
                )}
              </div>

              {isLeadershipView && (
                <div className="space-y-2">
                  <SectionLabel>Admin</SectionLabel>

                  <button
                    onClick={() => handleViewChange("users")}
                    className={getNavItemClass("users")}
                  >
                    User Management
                  </button>

                  <button
                    onClick={() => handleViewChange("summary")}
                    className={getNavItemClass("summary")}
                  >
                    Clinic Summary
                  </button>
                </div>
              )}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}