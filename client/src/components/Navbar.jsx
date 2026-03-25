import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    return (
        <nav
            className="sticky top-0 z-40 w-full h-16 px-8 flex items-center justify-between"
            style={{
                background: 'rgba(8,18,12,0.88)',
                backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Logo */}
            <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => navigate('/dashboard')}
            >
                <div
                    className="flex items-center justify-center rounded-[10px] text-[#0a0f0d] text-sm font-[Syne] font-bold"
                    style={{
                        width: 36,
                        height: 36,
                        background: 'var(--accent-green)',
                        boxShadow: 'var(--shadow-green)',
                    }}
                >
                    S
                </div>
                <span className="font-[Syne] font-bold text-[20px] text-white">
                    SplitSmart
                </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--text-muted)]">{user?.name}</span>
                <button
                    onClick={handleLogout}
                    className="text-sm text-[var(--text-muted)] hover:text-white transition-colors duration-150 cursor-pointer"
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}
