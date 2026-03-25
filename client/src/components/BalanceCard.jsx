import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

function fmtCurrency(n) {
    return '$' + Number(n || 0).toFixed(2);
}

export default function BalanceCard({ transaction }) {
    const { user } = useAuth();
    const isOwed = transaction.to.id === user?.id;
    const isOwing = transaction.from.id === user?.id;

    return (
        <div
            className="flex items-center gap-4 px-5 py-4 rounded-[14px] mb-2 last:mb-0"
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: isOwing
                    ? '3px solid var(--accent-coral)'
                    : isOwed
                        ? '3px solid var(--accent-green)'
                        : '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Avatars with arrow */}
            <div className="flex items-center gap-2 shrink-0">
                <Avatar name={transaction.from.name} size="sm" />
                <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>→</span>
                <Avatar name={transaction.to.name} size="sm" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                    <strong className="font-medium">{transaction.from.name}</strong>
                    <span style={{ color: 'var(--text-muted)' }}> owes </span>
                    <strong className="font-medium">{transaction.to.name}</strong>
                </p>
            </div>

            {/* Amount */}
            <p
                className="font-heading font-bold shrink-0"
                style={{
                    fontSize: 16,
                    color: isOwing ? 'var(--accent-coral)' : 'var(--accent-green)',
                }}
            >
                {fmtCurrency(transaction.amount)}
            </p>
        </div>
    );
}
