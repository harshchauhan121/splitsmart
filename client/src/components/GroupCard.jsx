import { useNavigate } from 'react-router-dom';

function fmt(n) {
    return '$' + Math.abs(Number(n || 0)).toFixed(2);
}

export default function GroupCard({ group }) {
    const navigate = useNavigate();
    const bal = group.user_balance ?? 0;

    return (
        <div
            onClick={() => navigate(`/groups/${group.id}`)}
            className="flex flex-col cursor-pointer transition-all duration-200"
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 18,
                padding: 24,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-card)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Card body */}
            <h3
                className="font-[Syne] font-bold text-white"
                style={{ fontSize: 18, marginTop: 16 }}
            >
                {group.name}
            </h3>
            {group.description && (
                <p
                    className="text-[var(--text-muted)] overflow-hidden"
                    style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        marginTop: 4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}
                >
                    {group.description}
                </p>
            )}

            {/* Bottom row */}
            <div
                className="flex items-end justify-between mt-auto"
                style={{
                    paddingTop: 20,
                    marginTop: 20,
                    borderTop: '1px solid var(--border-subtle)',
                }}
            >
                <p className="text-[var(--text-muted)] text-xs">
                    {group.member_count || 0} member{(group.member_count || 0) !== 1 ? 's' : ''}
                </p>
                <div className="text-right">
                    <p
                        className="uppercase"
                        style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}
                    >
                        {bal > 0 ? 'you are owed' : bal < 0 ? 'you owe' : 'settled up'}
                    </p>
                    <p
                        className="font-[Syne] font-bold"
                        style={{
                            fontSize: 22,
                            color: bal > 0 ? 'var(--accent-green)' : bal < 0 ? 'var(--accent-coral)' : 'var(--text-muted)',
                        }}
                    >
                        {bal === 0 ? '$0.00' : fmt(bal)}
                    </p>
                </div>
            </div>
        </div>
    );
}
