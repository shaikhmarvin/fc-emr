import { getRoleFromClassification } from "../utils/permissions";
export default function UserManagementView({
  profiles,
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
}) {
  return (
    <div className="p-4 md:p-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
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
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
            disabled={loadingProfiles}
          >
            {loadingProfiles ? "Refreshing..." : "Refresh Users"}
          </button>
        </div>

        {message ? (
          <div className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

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
              <div className="mb-3 text-sm text-slate-500">Refreshing users...</div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-3 py-3 font-semibold text-slate-700">Name</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Email</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Classification</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Role</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Refill Access</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Approval</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Last Seen</th>
                    <th className="px-3 py-3 font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>

                  {profiles.map((profile) => {
                    const isCurrentUser = profile.id === currentUserId;

                    return (
                      <tr
                        key={profile.id}
                        className={`border-b border-slate-100 ${isCurrentUser ? "bg-blue-50" : ""
                          }`}
                      >
                        <td className="px-3 py-3 text-slate-900">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {editingProfileNameId === profile.id ? (
                                <input
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                  value={editingProfileNameValue}
                                  onChange={(e) => setEditingProfileNameValue(e.target.value)}
                                  placeholder="Full name"
                                />
                              ) : (
                                <span>{profile.full_name || "Unnamed User"}</span>
                              )}

                              {isCurrentUser ? (
                                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                  You
                                </span>
                              ) : null}
                            </div>

                            <div className="flex gap-2">
                              {editingProfileNameId === profile.id ? (
                                <>
                                  <button
                                    onClick={() => onSaveProfileName(profile.id)}
                                    disabled={savingProfileId === profile.id}
                                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white"
                                  >
                                    Save Name
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingProfileNameId(null);
                                      setEditingProfileNameValue("");
                                    }}
                                    disabled={savingProfileId === profile.id}
                                    className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
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
                          </div>
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {profile.email || "—"}
                        </td>

                        <td className="px-3 py-3">
                          <select
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={profile.classification || ""}
                            onChange={(e) => {
                              const nextClassification = e.target.value;
                              const mappedRole = getRoleFromClassification(nextClassification);

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
                              (
                                profile.classification &&
                                profile.role !== "leadership" &&
                                profile.role !== "attending" &&
                                profile.role !== "pharmacy" &&
                                profile.role !== "lab"
                              ) ||
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
                          </select>
                        </td>

                        <td className="px-3 py-3">
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={profile.can_refill || false}
      onChange={(e) =>
        onChangeRole(profile.id, profile.role, profile.classification, {
          can_refill: e.target.checked,
        })
      }
    />
    Refill Access
  </label>
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

                        <td className="px-3 py-3 text-sm text-slate-600">
                          <div className="space-y-1">
                            <div>
                              {profile.last_seen_at
                                ? new Date(profile.last_seen_at).toLocaleString()
                                : "Never"}
                            </div>

                            {profile.last_seen_at &&
                              new Date(profile.last_seen_at).toDateString() === new Date().toDateString() ? (
                              <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                Active Today
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-slate-600 space-x-2">
                          {savingProfileId === profile.id ? "Saving..." : "Ready"}

                          {!isCurrentUser && profile.email && (
                            <button
                              onClick={() => onResetPassword(profile.email)}
                              className="ml-2 text-blue-600 text-xs"
                            >
                              Reset Password
                            </button>
                          )}

                          {!isCurrentUser && (
                            <button
                              onClick={() => onDeleteUser(profile.id)}
                              className="ml-2 text-red-600 text-xs font-semibold"
                            >
                              Delete User
                            </button>
                          )}
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