export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  function getClasses(type) {
    switch (type) {
      case "success":
        return "border-emerald-200 bg-emerald-50 text-emerald-900";
      case "error":
        return "border-red-200 bg-red-50 text-red-900";
      case "warning":
        return "border-amber-200 bg-amber-50 text-amber-900";
      default:
        return "border-slate-200 bg-white text-slate-900";
    }
  }

  return (
    <div className="pointer-events-none fixed left-4 right-4 top-4 z-[200] flex w-auto flex-col gap-2 sm:left-auto sm:w-full sm:max-w-sm">
      {toasts.map((toast) => {
        const isClickable = typeof toast.onClick === "function";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg ${getClasses(
              toast.type
            )}`}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  if (toast.onClick) toast.onClick();
                  onDismiss(toast.id);
                }}
                disabled={!isClickable}
                className={`min-w-0 flex-1 text-left ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <p className="text-sm font-semibold">
                  {toast.title || "Notice"}
                </p>

                {toast.message ? (
                  <p className="mt-1 text-sm leading-5">{toast.message}</p>
                ) : null}

                {toast.actionLabel ? (
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide">
                    {toast.actionLabel}
                  </p>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded-md px-2 py-1 text-xs font-medium hover:bg-black/5"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}