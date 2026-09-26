import { useState } from 'react';

export function ConfirmButton({
  label,
  message,
  onConfirm,
  className
}: {
  label: string;
  message: string;
  onConfirm: () => Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog panel" role="dialog" aria-modal="true">
            <h2>確認</h2>
            <p>{message}</p>
            <div className="button-row">
              <button
                className="button-danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onConfirm();
                  setOpen(false);
                }}
              >
                {busy ? '処理中…' : label}
              </button>
              <button className="button-secondary" disabled={busy} onClick={() => setOpen(false)}>
                キャンセル
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
