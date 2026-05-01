import { useMemo, useState } from "react";

function isDualVisit(patient, encounter) {
    const intakeData = encounter?.intakeData || encounter?.intake_data || {};

    const visitType =
        encounter?.visitType ||
        encounter?.visit_type ||
        intakeData?.visitType ||
        intakeData?.visit_type ||
        "";

    if (
        visitType === "both" ||
        encounter?.dualVisit === true ||
        intakeData?.dualVisit === true
    ) {
        return true;
    }

    const encounterDate = encounter?.clinicDate || encounter?.clinic_date;

    return (patient?.encounters || []).some((otherEncounter) => {
        if (!otherEncounter || otherEncounter.id === encounter.id) return false;

        const otherDate = otherEncounter?.clinicDate || otherEncounter?.clinic_date;
        const otherVisitType =
            otherEncounter?.visitType ||
            otherEncounter?.visit_type ||
            otherEncounter?.intakeData?.visitType ||
            otherEncounter?.intake_data?.visitType ||
            "";

        return (
            otherDate === encounterDate &&
            (otherVisitType === "general" || otherVisitType === "both")
        );
    });
}

function getSpecialtyLabel(type) {
    switch (type) {
        case "pt":
            return "Physical Therapy";
        case "dermatology":
            return "Dermatology";
        case "ophthalmology":
            return "Ophthalmology";
        case "mental_health":
            return "Mental Health";
        case "addiction":
            return "Addiction Medicine";
        default:
            return "Other";
    }
}

function dualSpecialtyBadge(encounter) {
    return (
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            General + {getSpecialtyLabel(encounter?.specialtyType)}
        </span>
    );
}

function getVisitTypeLabel(visitType) {
    switch (visitType) {
        case "specialty_only":
            return "Specialty Only";
        case "both":
            return "General + Specialty";
        default:
            return "General Clinic";
    }
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

function matchesSearch(row, query, getFullPatientName) {
    if (!query.trim()) return true;

    const q = query.trim().toLowerCase();
    const patientName = getFullPatientName(row.patient).toLowerCase();
    const dob = (row.patient.dob || "").toLowerCase();
    const mrn = (row.patient.mrn || "").toLowerCase();
    const phone = (row.patient.phone || "").toLowerCase();
    const specialty = getSpecialtyLabel(row.encounter.specialtyType).toLowerCase();
    const visitType = getVisitTypeLabel(row.encounter.visitType).toLowerCase();
    const complaint = (row.encounter.chiefComplaint || "").toLowerCase();
    const dailyCardNumber = String(getDailyCardNumber(row.patient, row.encounter) || "").toLowerCase();

    return (
        patientName.includes(q) ||
        dob.includes(q) ||
        mrn.includes(q) ||
        phone.includes(q) ||
        specialty.includes(q) ||
        visitType.includes(q) ||
        complaint.includes(q) ||
        dailyCardNumber.includes(q)
    );
}

function SpecialtyTable({
    title,
    rows,
    search,
    openPatientChart,
    getFullPatientName,
    formatDate,
    dualVisitBadge,
}) {
    const filteredRows = useMemo(() => {
        return rows.filter((row) => matchesSearch(row, search, getFullPatientName));
    }, [rows, search, getFullPatientName]);

    return (
        <div className="rounded-2xl bg-white shadow">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {filteredRows.length}
                </span>
            </div>

            {filteredRows.length === 0 ? (
                <div className="px-4 py-8 text-sm text-slate-500 sm:px-5">
                    No matching patients.
                </div>
            ) : (
                <>
                    <div className="hidden lg:block">
                        <div className="grid grid-cols-[1.4fr_0.9fr_1fr_1.4fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                            <div>Patient</div>
                            <div>DOB</div>
                            <div>Visit Type</div>
                            <div>Chief Complaint</div>
                            <div></div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {filteredRows.map(({ patient, encounter }) => (
                                <div
                                    key={encounter.id}
                                    className="grid grid-cols-[1.5fr_0.9fr_1.1fr_1.4fr_auto] items-start gap-4 px-4 py-4 text-sm sm:px-5"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-semibold text-slate-900">
                                                {getFullPatientName(patient)}
                                            </div>

                                            {getDailyCardNumber(patient, encounter) && (
                                                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                                                    Daily #{getDailyCardNumber(patient, encounter)}
                                                </span>
                                            )}

                                        </div>

                                        <div className="mt-1 text-xs text-slate-500">
                                            MRN: {patient.mrn || "—"}{getDailyCardNumber(patient, encounter) ? ` • Daily #${getDailyCardNumber(patient, encounter)}` : ""}
                                        </div>
                                    </div>

                                    <div className="text-slate-700">
                                        {patient.dob ? formatDate(patient.dob) : "—"}
                                    </div>

                                    <div>
                                        {isDualVisit(patient, encounter) ? (
    dualSpecialtyBadge(encounter)
) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
        Specialty Only
    </span>
)}
                                    </div>

                                    <div className="text-slate-700">
                                        <div className="line-clamp-2">
                                            {encounter.chiefComplaint || "—"}
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => openPatientChart(patient.id, encounter.id)}
                                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                                        >
                                            Open Chart
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 lg:hidden">
                        {filteredRows.map(({ patient, encounter }) => (
                            <div key={encounter.id} className="space-y-2 px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-semibold text-slate-900">
                                                {getFullPatientName(patient)}
                                            </div>

                                            {getDailyCardNumber(patient, encounter) && (
                                                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                                                    Daily #{getDailyCardNumber(patient, encounter)}
                                                </span>
                                            )}

                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            MRN: {patient.mrn || "—"}{getDailyCardNumber(patient, encounter) ? ` • Daily #${getDailyCardNumber(patient, encounter)}` : ""}
                                        </div>
                                    </div>

                                    {isDualVisit(patient, encounter) ? (
    dualSpecialtyBadge(encounter)
) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
        Specialty Only
    </span>
)}
                                </div>

                                <div className="text-sm text-slate-600">
                                    DOB: {patient.dob ? formatDate(patient.dob) : "—"}
                                </div>

                                <div className="text-sm text-slate-600">
                                    Chief Complaint: {encounter.chiefComplaint || "—"}
                                </div>

                                <button
                                    onClick={() => openPatientChart(patient.id, encounter.id)}
                                    className="mt-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                    Open Chart
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}



export default function SpecialtyQueueView({
    specialtyEncounterRows,
    openPatientChart,
    getFullPatientName,
    formatDate,
    isLeadershipView,
    dualVisitBadge,
}) {

    const [selectedSpecialty, setSelectedSpecialty] = useState("");

    const [search, setSearch] = useState("");

    const ptRows = specialtyEncounterRows.filter(
        ({ encounter }) => encounter.specialtyType === "pt"
    );

    const dermRows = specialtyEncounterRows.filter(
        ({ encounter }) => encounter.specialtyType === "dermatology"
    );

    const ophthalmologyRows = specialtyEncounterRows.filter(
        ({ encounter }) => encounter.specialtyType === "ophthalmology"
    );

    const mentalHealthRows = specialtyEncounterRows.filter(
        ({ encounter }) => encounter.specialtyType === "mental_health"
    );

    const addictionRows = specialtyEncounterRows.filter(
        ({ encounter }) => encounter.specialtyType === "addiction"
    );

    const totalMatches = specialtyEncounterRows.filter((row) =>
        matchesSearch(row, search, getFullPatientName)
    ).length;

    return (
        <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
            <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Specialty Queue
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Specialty-only and general + specialty patients.
                        </p>
                    </div>

                    <div className="w-full lg:max-w-md">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Search patients
                        </label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, DOB, daily #, MRN, phone, specialty, complaint"
                            className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:text-base"
                        />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Total Matches: {totalMatches}
                    </span>
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                        Specialty Only
                    </span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                        General + Specialty
                    </span>
                </div>
            </div>

            {!isLeadershipView && !selectedSpecialty && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                        { key: "pt", label: "Physical Therapy" },
                        { key: "dermatology", label: "Dermatology" },
                        { key: "ophthalmology", label: "Ophthalmology" },
                        { key: "mental_health", label: "Mental Health" },
                        { key: "addiction", label: "Addiction Medicine" },
                    ].map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setSelectedSpecialty(item.key)}
                            className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow hover:bg-slate-50"
                        >
                            <div className="text-base font-semibold text-slate-900">
                                {item.label}
                            </div>
                        </button>
                    ))}
                </div>
            )}
            {!isLeadershipView && selectedSpecialty && (
                <div className="space-y-4">
                    <button
                        onClick={() => setSelectedSpecialty("")}
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        ← Back to Specialties
                    </button>

                    {selectedSpecialty === "pt" && (
                        <SpecialtyTable
                            title="Physical Therapy"
                            rows={ptRows}
                            search={search}
                            openPatientChart={openPatientChart}
                            getFullPatientName={getFullPatientName}
                            formatDate={formatDate}
                            dualVisitBadge={dualVisitBadge}
                        />
                    )}

                    {selectedSpecialty === "dermatology" && (
                        <SpecialtyTable
                            title="Dermatology"
                            rows={dermRows}
                            search={search}
                            openPatientChart={openPatientChart}
                            getFullPatientName={getFullPatientName}
                            formatDate={formatDate}
                            dualVisitBadge={dualVisitBadge}
                        />
                    )}

                    {selectedSpecialty === "ophthalmology" && (
                        <SpecialtyTable
                            title="Ophthalmology"
                            rows={ophthalmologyRows}
                            search={search}
                            openPatientChart={openPatientChart}
                            getFullPatientName={getFullPatientName}
                            formatDate={formatDate}
                            dualVisitBadge={dualVisitBadge}
                        />
                    )}

                    {selectedSpecialty === "mental_health" && (
                        <SpecialtyTable
                            title="Mental Health"
                            rows={mentalHealthRows}
                            search={search}
                            openPatientChart={openPatientChart}
                            getFullPatientName={getFullPatientName}
                            formatDate={formatDate}
                            dualVisitBadge={dualVisitBadge}
                        />
                    )}

                    {selectedSpecialty === "addiction" && (
                        <SpecialtyTable
                            title="Addiction Medicine"
                            rows={addictionRows}
                            search={search}
                            openPatientChart={openPatientChart}
                            getFullPatientName={getFullPatientName}
                            formatDate={formatDate}
                            dualVisitBadge={dualVisitBadge}
                        />
                    )}
                </div>
            )}

            {isLeadershipView && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
                    <SpecialtyTable
                        title="Physical Therapy"
                        rows={ptRows}
                        search={search}
                        openPatientChart={openPatientChart}
                        getFullPatientName={getFullPatientName}
                        formatDate={formatDate}
                        dualVisitBadge={dualVisitBadge}
                    />

                    <SpecialtyTable
                        title="Dermatology"
                        rows={dermRows}
                        search={search}
                        openPatientChart={openPatientChart}
                        getFullPatientName={getFullPatientName}
                        formatDate={formatDate}
                        dualVisitBadge={dualVisitBadge}
                    />

                    <SpecialtyTable
                        title="Ophthalmology"
                        rows={ophthalmologyRows}
                        search={search}
                        openPatientChart={openPatientChart}
                        getFullPatientName={getFullPatientName}
                        formatDate={formatDate}
                        dualVisitBadge={dualVisitBadge}
                    />


                    <SpecialtyTable
                        title="Mental Health"
                        rows={mentalHealthRows}
                        search={search}
                        openPatientChart={openPatientChart}
                        getFullPatientName={getFullPatientName}
                        formatDate={formatDate}
                        dualVisitBadge={dualVisitBadge}
                    />

                    <SpecialtyTable
                        title="Addiction Medicine"
                        rows={addictionRows}
                        search={search}
                        openPatientChart={openPatientChart}
                        getFullPatientName={getFullPatientName}
                        formatDate={formatDate}
                        dualVisitBadge={dualVisitBadge}
                    />
                </div>
            )}
        </div>
    );
}