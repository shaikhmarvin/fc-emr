import { useState } from "react";
import { getRoleFromClassification } from "../utils/permissions";

const SPECIALTY_ACCESS_OPTIONS = [
  "Ophthalmology",
  "Physical Therapy",
  "Mental Health",
  "Addiction Medicine",
];

function normalizeSpecialtyAccess(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export default function UserManagementView({
  profiles,
  signatureProfiles = [],
  loadingProfiles,
  savingProfileId,
  onChangeRole,
  onRefresh,
  currentUserId,
  message,
  userSearch,
  setUserSearch,
  editingProfileNameId,
  setEditingProfileNameId,
  editingProfileNameValue,
  setEditingProfileNameValue,
  onSaveProfileName,
  showOnlyActiveToday,
  setShowOnlyActiveToday,
  onApproveUser,
  onDeleteUser,
  onResetPassword,
  onManageSignature,
}) {
  const [showSignatureManagement, setShowSignatureManagement] = useState(false);

  return (
    <div className="p-3 md:p-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              User Management
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Leadership can change roles here. Future teams should not need
              Supabase dashboard access for routine role changes.
            </p>
          </div>

          <button
            onClick={onRefresh}
            className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white md:w-auto"
            disabled={loadingProfiles}
          >
            {loadingProfiles ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {message ? (
          <div className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <button
            type="button"
            onClick={() => setShowSignatureManagement((current) => !current)}
            aria-expanded={showSignatureManagement}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="font-semibold text-slate-900">Clinical PDF Signatures</span>
            <span className="text-sm font-semibold text-blue-800">
              {showSignatureManagement ? "Collapse" : "Manage signatures"}
            </span>
          </button>
          {showSignatureManagement ? <>
            <p className="mt-2 text-sm text-slate-600">
              Leadership can capture a saved signature for attending and Physical Therapy accounts on any touch-enabled device.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
            {signatureProfiles.filter((profile) => ["attending", "physical_therapy"].includes(profile.role)).map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => onManageSignature?.(profile)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${profile.signature_data_url ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-blue-300 bg-white text-blue-800"}`}
              >
                {profile.full_name || profile.email || "Attending"} · {profile.signature_data_url ? "Signature saved" : "Add signature"}
              </button>
            ))}
            {signatureProfiles.every((profile) => !["attending", "physical_therapy"].includes(profile.role)) ? (
              <span className="text-sm text-slate-500">No attending or Physical Therapy accounts are available.</span>
            ) : null}
            </div>
          </> : null}
        </div>

        <div className="mb-4 space-y-3">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search by name, role, classification, or email"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showOnlyActiveToday}
              onChange={(e) => setShowOnlyActiveToday(e.target.checked)}
            />
            Show only active today
          </label>
        </div>

        {profiles.length === 0 && !loadingProfiles ? (
          <div className="text-sm text-slate-600">No users found.</div>
        ) : (
          <div>
            {loadingProfiles ? (
              <div className="mb-3 text-sm text-slate-500">
                Refreshing users...
              </div>
            ) : null}

            <div className="space-y-3 lg:hidden">
              {profiles.map((profile) => {
                const isCurrentUser = profile.id === currentUserId;
                const currentAccess = normalizeSpecialtyAccess(
                  profile.specialty_access
                );

                return (
                  <div
                    key={profile.id}
                    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                      isCurrentUser ? "border-blue-300 bg-blue-50" : ""
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {editingProfileNameId === profile.id ? (
                          <input
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={editingProfileNameValue}
                            onChange={(e) =>
                              setEditingProfileNameValue(e.target.value)
                            }
                            placeholder="Full name"
                          />
                        ) : (
                          <div className="font-semibold text-slate-900">
                            {profile.full_name || "Unnamed User"}
                          </div>
                        )}

                        <div className="break-all text-xs text-slate-500">
                          {profile.email || "—"}
                        </div>
                      </div>

                      {isCurrentUser ? (
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          You
                        </span>
                      ) : null}
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      {editingProfileNameId === profile.id ? (
                        <>
                          <button
                            onClick={() => onSaveProfileName(profile.id)}
                            disabled={savingProfileId === profile.id}
                            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                          >
                            Save Name
                          </button>
                          <button
                            onClick={() => {
                              setEditingProfileNameId(null);
                              setEditingProfileNameValue("");
                            }}
                            disabled={savingProfileId === profile.id}
                            className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingProfileNameId(profile.id);
                            setEditingProfileNameValue(profile.full_name || "");
                          }}
                          className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          Edit Name
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="space-y-1">
                        <div className="text-xs font-medium text-slate-500">
                          Classification
                        </div>
                        <select
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={profile.classification || ""}
                          onChange={(e) => {
                            const nextClassification = e.target.value;
                            const mappedRole =
                              getRoleFromClassification(nextClassification);

                            onChangeRole(
                              profile.id,
                              mappedRole || profile.role,
                              nextClassification
                            );
                          }}
                          disabled={
                            savingProfileId === profile.id ||
                            profile.role === "leadership" ||
                            profile.role === "attending" ||
                            profile.role === "pharmacy" ||
                            profile.role === "social_work" ||
                            profile.role === "physical_therapy" ||
                            profile.role === "undergraduate"
                          }
                        >
                          <option value="">—</option>
                          <option value="MS1">MS1</option>
                          <option value="MS2">MS2</option>
                          <option value="MS3">MS3</option>
                          <option value="MS4">MS4</option>
                        </select>

                        {!profile.classification &&
                        profile.role !== "leadership" &&
                        profile.role !== "attending" &&
                        profile.role !== "pharmacy" &&
                        profile.role !== "social_work" &&
                        profile.role !== "physical_therapy" &&
                        profile.role !== "lab" &&
                        profile.role !== "undergraduate" ? (
                          <div className="text-xs text-red-500">
                            Missing classification
                          </div>
                        ) : null}
                      </label>

                      <label className="space-y-1">
                        <div className="text-xs font-medium text-slate-500">
                          Role
                        </div>
                        <select
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={profile.role}
                          onChange={(e) =>
                            onChangeRole(profile.id, e.target.value)
                          }
                          disabled={
                            savingProfileId === profile.id ||
                            (profile.classification &&
                              profile.role !== "leadership" &&
                              profile.role !== "attending" &&
                              profile.role !== "pharmacy" &&
                              profile.role !== "social_work" &&
                              profile.role !== "physical_therapy" &&
                              profile.role !== "lab") ||
                            (isCurrentUser && profile.role === "leadership")
                          }
                        >
                          <option value="student">student</option>
                          <option value="upper_level">upper_level</option>
                          <option value="attending">attending</option>
                          <option value="leadership">leadership</option>
                          <option value="undergraduate">undergraduate</option>
                          <option value="pharmacy">pharmacy</option>
                          <option value="lab">lab</option>
                          <option value="social_work">social_work</option>
                          <option value="physical_therapy">physical_therapy</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-3 space-y-3 text-sm">
                      <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={profile.can_refill || false}
                          disabled={savingProfileId === profile.id}
                          onChange={(e) =>
                            onChangeRole(
                              profile.id,
                              profile.role,
                              profile.classification,
                              { can_refill: e.target.checked }
                            )
                          }
                        />
                        Refill Access
                      </label>

                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="mb-2 text-xs font-medium text-slate-500">
                          Specialty Access
                        </div>
                        <div className="space-y-2">
                          {SPECIALTY_ACCESS_OPTIONS.map((specialty) => {
                            const checked = currentAccess.includes(specialty);

                            return (
                              <label
                                key={specialty}
                                className="flex items-center gap-2 text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={savingProfileId === profile.id}
                                  onChange={(e) => {
                                    const nextAccess = e.target.checked
                                      ? [...new Set([...currentAccess, specialty])]
                                      : currentAccess.filter(
                                          (item) => item !== specialty
                                        );

                                    onChangeRole(
                                      profile.id,
                                      profile.role,
                                      profile.classification,
                                      { specialty_access: nextAccess }
                                    );
                                  }}
                                />
                                {specialty}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      {profile.approval_status === "approved" ? (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Approved
                        </span>
                      ) : (
                        <button
                          onClick={() => onApproveUser(profile.id)}
                          disabled={savingProfileId === profile.id}
                          className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white disabled:opacity-60"
                        >
                          Approve
                        </button>
                      )}

                      {profile.last_seen_at &&
                      new Date(profile.last_seen_at).toDateString() ===
                        new Date().toDateString() ? (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Active Today
                        </span>
                      ) : null}

                      <span className="text-xs text-slate-500">
                        {savingProfileId === profile.id ? "Saving..." : "Ready"}
                      </span>

                      {!isCurrentUser && profile.email && (
                        <button
                          onClick={() => onResetPassword(profile.email)}
                          className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                          Reset Password
                        </button>
                      )}

                      {!isCurrentUser && (
                        <button
                          onClick={() => onDeleteUser(profile.id)}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                        >
                          Delete User
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
              <table className="min-w-[960px] border-collapse text-sm xl:min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-3 font-semibold text-slate-700">
                      Name
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-700">
                      Email
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-700">
                      Classification
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-700">
                      Role
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-700">
                      Access
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-700">
                      Approval
                    </th>
                    <th className="hidden px-3 py-3 font-semibold text-slate-700 xl:table-cell">
                      Last Seen
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const isCurrentUser = profile.id === currentUserId;
                    const currentAccess = normalizeSpecialtyAccess(
                      profile.specialty_access
                    );

                    return (
                      <tr
                        key={profile.id}
                        className={`border-b border-slate-100 ${
                          isCurrentUser ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-slate-900">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {editingProfileNameId === profile.id ? (
                                <input
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                  value={editingProfileNameValue}
                                  onChange={(e) =>
                                    setEditingProfileNameValue(e.target.value)
                                  }
                                  placeholder="Full name"
                                />
                              ) : (
                                <span className="font-medium">
                                  {profile.full_name || "Unnamed User"}
                                </span>
                              )}

                              {isCurrentUser ? (
                                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                  You
                                </span>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {editingProfileNameId === profile.id ? (
                                <>
                                  <button
                                    onClick={() => onSaveProfileName(profile.id)}
                                    disabled={savingProfileId === profile.id}
                                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                                  >
                                    Save Name
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingProfileNameId(null);
                                      setEditingProfileNameValue("");
                                    }}
                                    disabled={savingProfileId === profile.id}
                                    className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingProfileNameId(profile.id);
                                    setEditingProfileNameValue(
                                      profile.full_name || ""
                                    );
                                  }}
                                  className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                                >
                                  Edit Name
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="max-w-[220px] truncate px-3 py-3 text-xs text-slate-600">
                          {profile.email || "—"}
                        </td>

                        <td className="px-3 py-3">
                          <select
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={profile.classification || ""}
                            onChange={(e) => {
                              const nextClassification = e.target.value;
                              const mappedRole =
                                getRoleFromClassification(nextClassification);

                              onChangeRole(
                                profile.id,
                                mappedRole || profile.role,
                                nextClassification
                              );
                            }}
                            disabled={
                              savingProfileId === profile.id ||
                              profile.role === "leadership" ||
                              profile.role === "attending" ||
                              profile.role === "pharmacy" ||
                              profile.role === "social_work" ||
                              profile.role === "physical_therapy" ||
                              profile.role === "undergraduate"
                            }
                          >
                            <option value="">—</option>
                            <option value="MS1">MS1</option>
                            <option value="MS2">MS2</option>
                            <option value="MS3">MS3</option>
                            <option value="MS4">MS4</option>
                          </select>
                          {!profile.classification &&
                          profile.role !== "leadership" &&
                          profile.role !== "attending" &&
                          profile.role !== "pharmacy" &&
                          profile.role !== "social_work" &&
                          profile.role !== "physical_therapy" &&
                          profile.role !== "lab" &&
                          profile.role !== "undergraduate" ? (
                            <div className="mt-1 text-xs text-red-500">
                              Missing classification
                            </div>
                          ) : null}
                        </td>

                        <td className="px-3 py-3">
                          <select
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={profile.role}
                            onChange={(e) =>
                              onChangeRole(profile.id, e.target.value)
                            }
                            disabled={
                              savingProfileId === profile.id ||
                              (profile.classification &&
                                profile.role !== "leadership" &&
                                profile.role !== "attending" &&
                                profile.role !== "pharmacy" &&
                                profile.role !== "social_work" &&
                                profile.role !== "physical_therapy" &&
                                profile.role !== "lab") ||
                              (isCurrentUser && profile.role === "leadership")
                            }
                          >
                            <option value="student">student</option>
                            <option value="upper_level">upper_level</option>
                            <option value="attending">attending</option>
                            <option value="leadership">leadership</option>
                            <option value="undergraduate">undergraduate</option>
                            <option value="pharmacy">pharmacy</option>
                            <option value="lab">lab</option>
                            <option value="social_work">social_work</option>
                            <option value="physical_therapy">physical_therapy</option>
                          </select>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={profile.can_refill || false}
                                disabled={savingProfileId === profile.id}
                                onChange={(e) =>
                                  onChangeRole(
                                    profile.id,
                                    profile.role,
                                    profile.classification,
                                    { can_refill: e.target.checked }
                                  )
                                }
                              />
                              Refill
                            </label>

                            <div className="grid gap-1">
                              {SPECIALTY_ACCESS_OPTIONS.map((specialty) => {
                                const checked = currentAccess.includes(specialty);

                                return (
                                  <label
                                    key={specialty}
                                    className="flex items-center gap-2 text-sm text-slate-700"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={savingProfileId === profile.id}
                                      onChange={(e) => {
                                        const nextAccess = e.target.checked
                                          ? [...new Set([...currentAccess, specialty])]
                                          : currentAccess.filter(
                                              (item) => item !== specialty
                                            );

                                        onChangeRole(
                                          profile.id,
                                          profile.role,
                                          profile.classification,
                                          { specialty_access: nextAccess }
                                        );
                                      }}
                                    />
                                    {specialty}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          {profile.approval_status === "approved" ? (
                            <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              Approved
                            </span>
                          ) : (
                            <button
                              onClick={() => onApproveUser(profile.id)}
                              disabled={savingProfileId === profile.id}
                              className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white disabled:opacity-60"
                            >
                              Approve
                            </button>
                          )}
                        </td>

                        <td className="hidden px-3 py-3 text-sm text-slate-600 xl:table-cell">
                          <div className="space-y-1">
                            <div>
                              {profile.last_seen_at
                                ? new Date(profile.last_seen_at).toLocaleString()
                                : "Never"}
                            </div>

                            {profile.last_seen_at &&
                            new Date(profile.last_seen_at).toDateString() ===
                              new Date().toDateString() ? (
                              <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                Active Today
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-slate-600">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs">
                              {savingProfileId === profile.id
                                ? "Saving..."
                                : "Ready"}
                            </span>

                            {!isCurrentUser && profile.email && (
                              <button
                                onClick={() => onResetPassword(profile.email)}
                                className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                              >
                                Reset Password
                              </button>
                            )}

                            {!isCurrentUser && (
                              <button
                                onClick={() => onDeleteUser(profile.id)}
                                className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                              >
                                Delete User
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
