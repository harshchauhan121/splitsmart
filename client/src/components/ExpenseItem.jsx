import Avatar from './Avatar';

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString();
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
            <div className="flex-1 min-w-0">
                <p className="text-white truncate" style={{ fontWeight: 600, fontSize: 15 }}>
                    {expense.description}
                </p>
                <p className="mt-0.5" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Paid by {expense.paid_by_name} · {fmtDate(expense.date)}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className="font-[Syne] font-bold text-white" style={{ fontSize: 16 }}>
                    {fmtCurrency(expense.amount)}
                </p>
                <p className="mt-0.5" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {expense.split_count} {expense.split_count === 1 ? 'person' : 'people'}
                </p>
            </div>
            {isOwner && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex gap-1">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(expense)}
                            className="text-[var(--text-muted)] hover:text-white cursor-pointer text-lg p-1 transition-colors"
                            title="Edit expense"
                        >
                            ✏️
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => onDelete(expense.id)}
                            className="text-[var(--text-muted)] hover:text-[var(--accent-coral)] cursor-pointer text-lg p-1 transition-colors"
                            title="Delete expense"
                        >
                            🗑
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
