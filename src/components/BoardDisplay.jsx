import { useEffect, useState } from "react";
export default function BoardDisplay({
  ROOM_OPTIONS,
  roomMap,
  getPatientBoardName,
  getStudentBoardName,
  spanishBadge,
  priorityBadge,
  elevatorBadge,
  getStatusClasses,
}) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);
  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Free Clinic Room Board</h1>
          <p className="text-sm text-slate-300">
            Live Display
          </p>
        </div>

              <div className="text-right text-sm text-slate-300">
                  {now.toLocaleDateString()}<br />
                  {now.toLocaleTimeString()}
              </div>
      </div>

      <div className="grid h-[calc(100vh-96px)] grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {ROOM_OPTIONS.map((room) => {
          const slot = roomMap[room.number];
          const occupied = !!slot && slot.encounter.status !== "done";

          return (
            <div
              key={room.number}
              className={`min-h-[180px] rounded-2xl border p-3 shadow ${
                occupied
                  ? slot.encounter.status === "roomed"
  ? "border-green-300 bg-green-100 text-slate-900"
  : slot.encounter.status === "in_visit"
  ? "border-blue-300 bg-blue-100 text-slate-900"
  : "border-yellow-300 bg-yellow-100 text-slate-900"
                  : "border-slate-700 bg-slate-800 text-white"
              }`}
            >
              <div className="mb-3">
                <p className="text-xl font-bold">{room.label}</p>
                <p className="text-xs opacity-70">{room.area}</p>
              </div>

              {occupied ? (
                <div className="space-y-2">
                  <p className="text-xl font-semibold">
                    {getPatientBoardName(slot.patient)}
                  </p>

                  <p className="text-sm">
                    {getStudentBoardName(slot.encounter.assignedStudent)}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {spanishBadge(slot.encounter)}
                    {priorityBadge(slot.encounter)}
                    {elevatorBadge(slot.encounter)}
                  </div>

                  <span
                    className={`inline-block rounded-full border px-2 py-1 text-xs ${getStatusClasses(
                      slot.encounter.status
                    )}`}
                  >
                    {slot.encounter.status}
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold opacity-80">Available</p>
                  <p className="text-xs opacity-60">No patient assigned</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}