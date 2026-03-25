import Avatar from './Avatar';

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtCurrency(n) {
    return '$' + Number(n || 0).toFixed(2);
}

export default function ExpenseItem({ expense, currentUserId, onDelete, onEdit }) {
    const isOwner = expense.paid_by === currentUserId;

    return (
        <div
            className="flex items-center gap-4 px-5 py-4 rounded-[12px] transition-colors mb-2 last:mb-0 group"
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        >
            <Avatar name={expense.paid_by_name || ''} size="md" />

            {/* Left: Description + metadata */}
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate" style={{ fontSize: 15 }}>
                    {expense.description}
                </p>
                <p className="mt-1 flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Paid by <strong className="text-white font-medium">{expense.paid_by_name}</strong></span>
                    <span>·</span>
                    <span>{fmtDate(expense.date)}</span>
                </p>
            </div>

            {/* Right: Amount + split info */}
            <div className="text-right shrink-0">
                <p className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--accent-green)' }}>
                    {fmtCurrency(expense.amount)}
                </p>
                <p className="mt-0.5 label">
                    {expense.split_count} {expense.split_count === 1 ? 'person' : 'people'}
                </p>
            </div>

            {/* Actions: hover-reveal, right side */}
            {isOwner && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 ml-1">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(expense)}
                            className="hover:text-white cursor-pointer text-base p-1 transition-colors rounded-lg"
                            style={{ color: 'var(--text-muted)' }}
                            title="Edit expense"
                        >
                            ✏️
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => onDelete(expense.id)}
                            className="hover:text-[var(--accent-coral)] cursor-pointer text-base p-1 transition-colors rounded-lg"
                            style={{ color: 'var(--text-muted)' }}
                            title="Delete expense"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
