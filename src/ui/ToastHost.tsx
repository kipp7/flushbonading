export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  detail?: string;
};

type Props = {
  items: ToastItem[];
  onDismiss: (id: string) => void;
};

export const ToastHost = ({ items, onDismiss }: Props) => {
  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {items.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <div className="toast-content">
            <p className="toast-title">{toast.title}</p>
            {toast.detail && <p className="toast-detail">{toast.detail}</p>}
          </div>
          <button className="toast-dismiss" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

