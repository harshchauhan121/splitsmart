import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

function fmtCurrency(n) {
    return '$' + Number(n || 0).toFixed(2);
}

export default function BalanceCard({ transaction }) {
    const { user } = useAuth();
    const isOwed = transaction.to.id === user?.id;   // current user is owed
    const isOwing = transaction.from.id === user?.id; // current user owes
    const isInvolved = isOwed || isOwing;

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 rounded-[10px] mb-2 last:mb-0"
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid rgba(255,255,255,0.05)`,
                borderLeft: isOwing
                    ? '3px solid var(--accent-coral)'
                    : isOwed
                        ? '3px solid var(--accent-green)'
                        : '1px solid rgba(255,255,255,0.05)',
            }}
        >
            <Avatar name={transaction.from.name} size="sm" />
            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>
            <Avatar name={transaction.to.name} size="sm" />
            <div className="flex-1 min-w-0 ml-1">
                <p className="text-sm text-white truncate">
                    {transaction.from.name} owes {transaction.to.name}
                </p>
                <p
                    className="font-[Syne] font-bold mt-0.5"
                    style={{ fontSize: 14, color: isOwing ? 'var(--accent-coral)' : 'var(--accent-green)' }}
                >
                    {fmtCurrency(transaction.amount)}
                </p>
            </div>
        </div>
    );
}
