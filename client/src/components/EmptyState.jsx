export default function EmptyState({ icon, title, message, actionLabel, onAction }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            {icon && <span className="text-4xl">{icon}</span>}
            {title && <h3 className="font-[Syne] font-bold text-lg text-[var(--text-primary)]">{title}</h3>}
            {message && <p className="text-[var(--text-muted)] text-sm max-w-xs">{message}</p>}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-2 px-5 py-2.5 bg-[var(--accent-green)] text-[#0a0e1a] font-bold rounded-[10px] text-sm hover:scale-[1.02] transition-transform cursor-pointer"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
