import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="backdrop:bg-black/40 bg-transparent p-0 m-auto max-w-lg w-full open:flex"
    >
      <div className="bg-warm-surface border-2 border-warm-border rounded-xl p-6 w-full shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <h2
            className="text-xl font-bold text-warm-text"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            About RPG Elsewhere
          </h2>
          <button
            onClick={onClose}
            className="text-warm-muted hover:text-warm-text transition-colors text-lg leading-none p-1 -mt-1 -mr-1 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="text-warm-text text-sm leading-relaxed space-y-3">
          <p>
            I got tired of DndBeyond's search being slow and poorly-ordered. If
            I search "wizard", the first result should be the wizard class,
            damnit! So I built this: a fast search for DndBeyond.
          </p>
          <p>
            I am, to be clear, not at all affiliated with them — this is a 100%
            unofficial thing. Built by{" "}
            <a
              href="https://kevinhighwater.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-warm-muted underline hover:text-warm-text transition-colors"
            >
              Kevin Highwater, a very frustrated 6th-level Order of Scribes Wizard
            </a>
            .{" "}
            <a
              href="https://github.com/kkuchta/rpgelsewhere"
              target="_blank"
              rel="noopener noreferrer"
              className="text-warm-muted underline hover:text-warm-text transition-colors"
            >
              Source on GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </dialog>
  );
}
