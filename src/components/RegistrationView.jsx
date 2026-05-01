import { useMemo, useState } from "react";
function getRegistrationStatusBadge(status) {
  switch (status) {
    case "started":
      return (
        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
          Started
        </span>
      );

    case "undergrad_complete":
      return (
        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
          Undergrad Complete
        </span>
      );

    case "ready":
      return (
        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
          Ready
        </span>
      );

    case "cancelled":
      return (
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
          Cancelled
        </span>
      );

    default:
      return (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {status || "Unknown"}
        </span>
      );
  }
}


function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getDailyCardNumber(patient, encounter) {
  return (
    encounter?.dailyNumber ??
    encounter?.daily_number ??
    encounter?.cardNumber ??
    encounter?.card_number ??
    encounter?.queueNumber ??
    encounter?.queue_number ??
    patient?.dailyNumber ??
    patient?.daily_number ??
    patient?.cardNumber ??
    patient?.card_number ??
    patient?.queueNumber ??
    patient?.queue_number ??
    ""
  );
}


export default function RegistrationView({
  registrationRows,
  openUndergradRegistration,
  openLeadershipRegistration,
  getFullPatientName,
  formatDate,
  newReturningBadge,
  dualVisitBadge,
  userRole,
  isLeadershipView,
  onRemoveFromRegistration,
  clinicResourceSettings = [],
  onSaveClinicResourceSetting,
}) {
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [showIntakeSettings, setShowIntakeSettings] = useState(false);
  const MONTH_NAMES = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

  const filteredRegistrationRows = useMemo(() => {
    const query = normalizeSearchText(registrationSearch);
    if (!query) return registrationRows;

    return registrationRows.filter(({ patient, encounter }) => {
      const name = normalizeSearchText(getFullPatientName(patient));
      const dob = normalizeSearchText(formatDate(patient?.dob) || patient?.dob);
      const dailyCardNumber = normalizeSearchText(getDailyCardNumber(patient, encounter));

      return (
        name.includes(query) ||
        dob.includes(query) ||
        dailyCardNumber.includes(query)
      );
    });
  }, [registrationRows, registrationSearch, getFullPatientName, formatDate]);

  return (
    <div className="p-4 md:p-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h1 className="text-2xl font-bold text-slate-900">Registration</h1>
    <p className="mt-2 text-sm text-slate-600">
      {userRole === "undergraduate"
        ? "Complete initial registration details for arriving patients."
        : "Finish intake and prepare patients for assignment."}
    </p>
  </div>

  {isLeadershipView && (
    <button
      type="button"
      onClick={() => setShowIntakeSettings((prev) => !prev)}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      ⚙️ Intake Settings
    </button>
  )}
</div>

{isLeadershipView && showIntakeSettings && (
  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-slate-900">
        Intake Resource Settings
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Controls which leadership intake screening/service fields are shown.
      </p>
    </div>

    <div className="space-y-3">
      {clinicResourceSettings.map((setting) => (
        <div
          key={setting.resource_key}
          className="rounded-xl border border-slate-200 bg-white p-3"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-semibold text-slate-900">
                {setting.display_name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {setting.sex_restriction !== "any"
                  ? `Sex: ${setting.sex_restriction}`
                  : "Sex: any"}
                {setting.min_age ? ` • Min age: ${setting.min_age}` : ""}
                {setting.max_age ? ` • Max age: ${setting.max_age}` : ""}
                {setting.seasonal
  ? ` • Seasonal: ${MONTH_NAMES[setting.season_start_month] || setting.season_start_month} to ${MONTH_NAMES[setting.season_end_month] || setting.season_end_month}`
  : ""}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!setting.enabled}
                  onChange={(e) =>
                    onSaveClinicResourceSetting?.(setting.resource_key, {
                      enabled: e.target.checked,
                    })
                  }
                />
                Enabled
              </label>

              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={setting.sex_restriction || "any"}
                onChange={(e) =>
                  onSaveClinicResourceSetting?.(setting.resource_key, {
                    sex_restriction: e.target.value,
                  })
                }
              >
                <option value="any">Any sex</option>
                <option value="female">Female only</option>
                <option value="male">Male only</option>
              </select>

              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm lg:w-24"
                placeholder="Min age"
                value={setting.min_age ?? ""}
                onChange={(e) =>
                  onSaveClinicResourceSetting?.(setting.resource_key, {
                    min_age:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!setting.seasonal}
                  onChange={(e) =>
                    onSaveClinicResourceSetting?.(setting.resource_key, {
                      seasonal: e.target.checked,
                    })
                  }
                />
                Seasonal
              </label>

              {setting.seasonal && (
  <>
    <select
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm lg:w-36"
      value={setting.season_start_month ?? ""}
      onChange={(e) =>
        onSaveClinicResourceSetting?.(setting.resource_key, {
          season_start_month:
            e.target.value === "" ? null : Number(e.target.value),
        })
      }
    >
      <option value="">Start month</option>
      {Object.entries(MONTH_NAMES).map(([monthNumber, monthName]) => (
        <option key={monthNumber} value={monthNumber}>
          {monthName}
        </option>
      ))}
    </select>

    <select
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm lg:w-36"
      value={setting.season_end_month ?? ""}
      onChange={(e) =>
        onSaveClinicResourceSetting?.(setting.resource_key, {
          season_end_month:
            e.target.value === "" ? null : Number(e.target.value),
        })
      }
    >
      <option value="">End month</option>
      {Object.entries(MONTH_NAMES).map(([monthNumber, monthName]) => (
        <option key={monthNumber} value={monthNumber}>
          {monthName}
        </option>
      ))}
    </select>
  </>
)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

        <div className="mt-4">
          <input
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 md:max-w-md"
            placeholder="Search by name, DOB, or daily card #"
            value={registrationSearch}
            onChange={(e) => setRegistrationSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {filteredRegistrationRows.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
            No patients waiting in registration.
          </div>
        ) : (
          filteredRegistrationRows.map(({ patient, encounter }) => (
            <div
              key={encounter.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
  <div className="flex flex-wrap items-center gap-2">
    <h2 className="text-lg font-semibold text-slate-900">
      {getFullPatientName(patient)}
    </h2>
    {getRegistrationStatusBadge(encounter.status)}
    {newReturningBadge?.(encounter)}
    {dualVisitBadge?.(encounter)}
    {getDailyCardNumber(patient, encounter) && (
      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
        Daily #{getDailyCardNumber(patient, encounter)}
      </span>
    )}
  </div>

  <div className="mt-1 text-sm text-slate-600">
    DOB: {formatDate(patient.dob) || "—"}
  </div>

  <div className="mt-1 text-sm text-slate-600">
    Started: {encounter.createdAt ? new Date(encounter.createdAt).toLocaleString() : "—"}
  </div>
</div>

                <div className="flex flex-col gap-2 sm:flex-row">
  {userRole === "undergraduate" && (
    <button
      onClick={() => openUndergradRegistration(patient.id, encounter.id)}
      className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Complete Undergrad Intake
    </button>
  )}

  {isLeadershipView && (
    <button
      onClick={() => openLeadershipRegistration(patient.id, encounter.id)}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Leadership Intake
    </button>
  )}
  {isLeadershipView && (
  <button
    onClick={() => onRemoveFromRegistration(patient.id, encounter.id)}
    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
  >
    Remove
  </button>
)}
</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}