import { useEffect } from "react";
import logo from "../assets/free-clinic-logo.png";

function SectionLabel({ children }) {
  return (
    <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

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
  canLabQueueAccess,
  canProgramsAccess,
  canAccessResearch = false,
}) {
  function handleViewChange(view) {
    setActiveView(view);
    if (!window.matchMedia("(min-width: 1280px)").matches) setSidebarOpen(false);
  }

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = event => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        document.getElementById("sidebar-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  function getNavItemClass(view) {
    const isActive = activeView === view;

    return [
      "w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition",
      isActive
        ? "bg-slate-900 text-white shadow-sm"
        : "text-slate-700 hover:bg-slate-100",
    ].join(" ");
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        inert={!sidebarOpen}
        className={`fixed inset-y-0 left-0 z-50 w-64 transform overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-300 motion-reduce:transition-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4">
          <img
            src={logo}
            alt="Free Clinic"
            className="h-10 w-auto max-w-[180px] object-contain object-left"
          />
          <button type="button" aria-label="Collapse sidebar" onClick={() => {
            setSidebarOpen(false);
            document.getElementById("sidebar-toggle")?.focus();
          }} className="rounded-lg px-2 py-2 text-slate-600 hover:bg-slate-100">
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav className="space-y-4 p-4">

          {userRole === "lab" ? (
  <div className="space-y-2">
    <SectionLabel>Workflow</SectionLabel>

    <button
      onClick={() => handleViewChange("lab-queue")}
      className={getNavItemClass("lab-queue")}
    >
      Lab Queue
    </button>

    <button
      onClick={() => handleViewChange("board")}
      className={getNavItemClass("board")}
    >
      Room Board
    </button>
    <SectionLabel>Clinical</SectionLabel>
    <button onClick={() => handleViewChange("lab-import")} className={getNavItemClass("lab-import")}>
      Lab Import
    </button>
  </div>
) : userRole === "social_work" ? (
            <div className="space-y-2">
              <SectionLabel>Workflow</SectionLabel>

              <button
                onClick={() => handleViewChange("queue")}
                className={getNavItemClass("queue")}
              >
                Social Work Queue
              </button>
            </div>
          ) : userRole === "physical_therapy" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <SectionLabel>Workflow</SectionLabel>
                <button
                  onClick={() => handleViewChange("specialty-queue")}
                  className={getNavItemClass("specialty-queue")}
                >
                  Physical Therapy Queue
                </button>
              </div>

              <div className="space-y-2">
                <SectionLabel>Clinical</SectionLabel>
                <button
                  onClick={() => handleViewChange("programs")}
                  className={getNavItemClass("programs")}
                >
                  Physical Therapy Tracker
                </button>
              </div>
            </div>
          ) : userRole === "pharmacy" ? (
            <div className="space-y-2">
              <SectionLabel>Workflow</SectionLabel>

              <button
                onClick={() => handleViewChange("pharmacy-queue")}
                className={getNavItemClass("pharmacy-queue")}
              >
                Pharmacy Queue
              </button>

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

                {(isLeadershipView ||
                  userRole === "undergraduate" ||
                  userRole === "upper_level" ||
                  userRole === "attending" ||
                  canRefillAccess) && (
                    <button
                      onClick={() => handleViewChange("dashboard")}
                      className={getNavItemClass("dashboard")}
                    >
                      Dashboard
                    </button>
                  )}

                {(userRole === "undergraduate" || isLeadershipView) && (
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

                  <button
                    onClick={() => handleViewChange("queue")}
                    className={getNavItemClass("queue")}
                  >
                    General Clinic
                  </button>

                {(isLeadershipView || userRole === "undergraduate" || canRefillAccess) && (
                  <button
                    onClick={() => handleViewChange("pharmacy-queue")}
                    className={getNavItemClass("pharmacy-queue")}
                  >
                    Pharmacy Queue
                  </button>
                )}

                {userRole !== "undergraduate" && (
                  <button
                    onClick={() => handleViewChange("specialty-queue")}
                    className={getNavItemClass("specialty-queue")}
                  >
                    Specialty Clinic
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

          {(isLeadershipView || userRole === "lab") && (
            <button onClick={() => handleViewChange("lab-import")} className={getNavItemClass("lab-import")}>
              Lab Import
            </button>
          )}

                {canProgramsAccess && (
                  <button
                    onClick={() => handleViewChange("programs")}
                    className={getNavItemClass("programs")}
                  >
                    Specialty Programs Tracker
                  </button>
                )}

                {userRole === "lab" && (
  <button
    onClick={() => handleViewChange("lab-queue")}
    className={getNavItemClass("lab-queue")}
  >
    Lab Queue
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

                  {canAccessResearch && (
                    <button
                      onClick={() => handleViewChange("research")}
                      className={getNavItemClass("research")}
                    >
                      Clinic Tracker
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

