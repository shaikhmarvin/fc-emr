import { useEffect, useRef, useState } from "react";

export default function SignaturePadModal({
  open,
  profile,
  onClose,
  onSave,
  saving = false,
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.5;
    context.strokeStyle = "#0f172a";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    hasInkRef.current = false;
  }, [open, profile?.id]);

  if (!open || !profile) return null;

  function pointFromEvent(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function beginDrawing(event) {
    const canvas = canvasRef.current;
    canvas.setPointerCapture?.(event.pointerId);
    const point = pointFromEvent(event);
    const context = canvas.getContext("2d");
    context.beginPath();
    context.moveTo(point.x, point.y);
    drawingRef.current = true;
  }

  function continueDrawing(event) {
    if (!drawingRef.current) return;
    const point = pointFromEvent(event);
    const context = canvasRef.current.getContext("2d");
    context.lineTo(point.x, point.y);
    context.stroke();
    hasInkRef.current = true;
  }

  function endDrawing() {
    drawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const scale = window.devicePixelRatio || 1;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    hasInkRef.current = false;
    setMessage("");
  }

  async function saveSignature() {
    if (!hasInkRef.current) {
      setMessage("Draw a signature before saving.");
      return;
    }
    await onSave(canvasRef.current.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="signature-title" className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <h2 id="signature-title" className="text-xl font-semibold text-slate-900">
          Electronic Signature
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Saving for <strong>{profile.full_name || profile.email || "Clinician"}</strong>. This signature will appear on signed PDF notes.
        </p>

        {profile.signature_data_url ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Current saved signature</p>
            <img src={profile.signature_data_url} alt={`Saved signature for ${profile.full_name || "clinician"}`} className="mt-2 h-20 max-w-full object-contain" />
          </div>
        ) : null}

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Sign inside the box</p>
          <canvas
            ref={canvasRef}
            className="h-48 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
            onPointerDown={beginDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            onPointerLeave={endDrawing}
          />
        </div>

        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={clearCanvas} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
            Clear
          </button>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-700 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={saveSignature} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save Signature"}
          </button>
        </div>
      </div>
    </div>
  );
}
