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
            placeholder="Search by name, role, classification, or user ID"
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

        {loadingProfiles ? (
          <div className="text-sm text-slate-600">Loading users...</div>
        ) : profiles.length === 0 ? (
          <div className="text-sm text-slate-600">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-3 font-semibold text-slate-700">Name</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">User ID</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">Classification</th>
                  <th className="px-3 py-3 font-semibold text-slate-700">Role</th>
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

                      <td className="px-3 py-3 font-mono text-xs text-slate-600">
                        {profile.id}
                      </td>

                      <td className="px-3 py-3">
                        <select
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={profile.classification || ""}
                          onChange={(e) =>
                            onChangeRole(
                              profile.id,
                              getRoleFromClassification(e.target.value),
                              e.target.value
                            )
                          }
                          disabled={
                            savingProfileId === profile.id ||
                            profile.role === "leadership" ||
                            profile.role === "attending"
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
                          profile.role !== "attending" ? (
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
                              profile.role !== "attending"
                            ) ||
                            (isCurrentUser && profile.role === "leadership")
                          }
                        >
                          <option value="student">student</option>
                          <option value="upper_level">upper_level</option>
                          <option value="attending">attending</option>
                          <option value="leadership">leadership</option>
                        </select>
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

                      <td className="px-3 py-3 text-slate-600">
                        {savingProfileId === profile.id ? "Saving..." : "Ready"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}