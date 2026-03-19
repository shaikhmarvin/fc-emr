function PatientSearch({ searchForm, setSearchForm }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow sm:p-4">
      <h3 className="mb-3 text-lg font-semibold">Patient Search</h3>

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className="w-full rounded-lg border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Patient ID / MRN"
          value={searchForm.mrn}
          onChange={(e) =>
            setSearchForm((prev) => ({ ...prev, mrn: e.target.value }))
          }
        />

        <input
          className="w-full rounded-lg border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="First Name"
          value={searchForm.firstName}
          onChange={(e) =>
            setSearchForm((prev) => ({ ...prev, firstName: e.target.value }))
          }
        />

        <input
          className="w-full rounded-lg border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Last Name"
          value={searchForm.lastName}
          onChange={(e) =>
            setSearchForm((prev) => ({ ...prev, lastName: e.target.value }))
          }
        />

        </div>
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
  <input
    type="date"
    className="w-full rounded-lg border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={searchForm.dob}
    onChange={(e) =>
      setSearchForm((prev) => ({ ...prev, dob: e.target.value }))
    }
  />

  <input
    className="w-full rounded-lg border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="Last 4 SSN"
    value={searchForm.last4ssn}
    onChange={(e) =>
      setSearchForm((prev) => ({ ...prev, last4ssn: e.target.value }))
    }
  />
</div>
      </div>
    </div>
  );
}

export default PatientSearch;