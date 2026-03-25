export default function EmptyState({ icon, title, message, actionLabel, onAction }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            {icon && <span className="text-4xl">{icon}</span>}
            {title && <h3 className="font-heading font-bold text-lg text-white">{title}</h3>}
            {message && <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>{message}</p>}
            {actionLabel && onAction && (
                <button onClick={onAction} className="btn-primary mt-2">
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
