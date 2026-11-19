// ToastAlert — dismissible inline alert with quick one-click actions
interface ToastAlertProps {
  error: string | null;
  onDismiss: () => void;
  onEnableMock: () => void;
  onRetry?: () => void;
}

export function ToastAlert({
  error,
  onDismiss,
  onEnableMock,
  onRetry,
}: ToastAlertProps) {
  if (!error) return null;

  const isNetworkError =
    error.toLowerCase().includes("failed to fetch") ||
    error.toLowerCase().includes("network") ||
    error.toLowerCase().includes("connect");

  return (
    <div className="toast-alert" role="alert">
      <div className="toast-alert__body">
        <span className="toast-alert__icon">⚠️</span>
        <div className="toast-alert__content">
          <span className="toast-alert__title">
            {isNetworkError ? "Backend Connection Failed" : "Agent Error"}
          </span>
          <span className="toast-alert__desc">{error}</span>
        </div>
      </div>

      <div className="toast-alert__actions">
        {isNetworkError && (
          <button
            type="button"
            className="toast-btn toast-btn--primary"
            onClick={onEnableMock}
          >
            ⚡ Enable Mock API
          </button>
        )}
        {onRetry && (
          <button
            type="button"
            className="toast-btn toast-btn--secondary"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
        <button
          type="button"
          className="toast-btn toast-btn--close"
          onClick={onDismiss}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
