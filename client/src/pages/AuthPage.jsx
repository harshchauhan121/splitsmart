import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, register as apiRegister } from '../api/auth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AuthPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const [tab, setTab] = useState('signin');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { document.title = 'SplitSmart — Sign In'; }, []);
    useEffect(() => { if (isAuthenticated) navigate('/dashboard'); }, [isAuthenticated, navigate]);

    const switchTab = (t) => { setTab(t); setError(null); };

    const handleSignIn = async (e) => {
        e.preventDefault();
        if (!email || !password) { setError('Please fill in all fields'); return; }
        setLoading(true); setError(null);
        try {
            const res = await apiLogin(email, password);
            const { user, token } = res.data.data;
            login(user, token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid email or password');
        } finally { setLoading(false); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!name || !email || !password) { setError('Please fill in all fields'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true); setError(null);
        try {
            const res = await apiRegister(name, email, password);
            const { user, token } = res.data.data;
            login(user, token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally { setLoading(false); }
    };

    const inputCls =
        'w-full h-12 px-4 rounded-[12px] text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none transition-all';

    const inputStyle = {
        background: 'var(--bg-input)',
        border: '1px solid var(--border-subtle)',
    };

    const inputFocusStyle = {
        borderColor: 'var(--accent-green)',
        boxShadow: '0 0 0 3px rgba(0,255,136,0.1)',
    };

    return (
        <div className="page-enter min-h-screen flex flex-col lg:flex-row">
            {/* Left branding panel */}
            <div
                className="hidden lg:flex w-5/12 flex-col justify-center px-16 py-12 relative overflow-hidden"
                style={{
                    backgroundImage: [
                        'radial-gradient(circle at 15% 25%, rgba(0,255,136,0.12) 0%, transparent 45%)',
                        'radial-gradient(circle at 85% 75%, rgba(0,255,136,0.07) 0%, transparent 45%)',
                        'radial-gradient(circle at 50% 50%, rgba(0,255,136,0.03) 0%, transparent 70%)',
                    ].join(', '),
                    backgroundColor: '#0d1f16',
                }}
            >
                {/* Blurred orbs */}
                <div
                    className="absolute top-1/4 -left-16 w-72 h-72 rounded-full pointer-events-none"
                    style={{ background: 'rgba(0,255,136,0.08)', filter: 'blur(60px)' }}
                />
                <div
                    className="absolute bottom-1/3 right-0 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'rgba(0,255,136,0.05)', filter: 'blur(80px)' }}
                />

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div
                            className="flex items-center justify-center rounded-[10px] font-[Syne] font-bold text-[#0a0f0d]"
                            style={{ width: 40, height: 40, background: 'var(--accent-green)', boxShadow: 'var(--shadow-green)' }}
                        >
                            S
                        </div>
                        <span className="font-[Syne] font-bold text-xl text-white">SplitSmart</span>
                    </div>
                    <h1 className="font-[Syne] font-extrabold text-5xl text-white leading-tight">
                        Split fairly.<br />
                        <span style={{ color: 'var(--accent-green)' }}>Settle simply.</span>
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg mt-5 max-w-sm leading-relaxed">
                        The smarter way to track shared expenses and settle group debts.
                    </p>
                </div>
            </div>

            {/* Right auth panel */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
                <div
                    className="w-full max-w-md"
                    style={{
                        background: 'rgba(255,255,255,0.02)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 24,
                        padding: 40,
                    }}
                >
                    {/* Tabs */}
                    <div style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: 28 }} className="flex">
                        {['signin', 'register'].map((t) => (
                            <button
                                key={t}
                                onClick={() => switchTab(t)}
                                className="flex-1 pb-3 text-sm font-medium transition-colors cursor-pointer"
                                style={{
                                    color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                                    borderBottom: tab === t ? '2px solid var(--accent-green)' : '2px solid transparent',
                                    fontFamily: 'Syne, sans-serif',
                                    fontWeight: tab === t ? 700 : 400,
                                }}
                            >
                                {t === 'signin' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form
                        key={tab}
                        onSubmit={tab === 'signin' ? handleSignIn : handleRegister}
                        className="flex flex-col gap-3"
                        style={{ animation: 'modalSlideUp 200ms ease' }}
                    >
                        {tab === 'register' && (
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={inputCls}
                                style={inputStyle}
                                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                                onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                            />
                        )}
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputCls}
                            style={inputStyle}
                            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                            onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputCls}
                            style={inputStyle}
                            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                            onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                        />

                        {error && (
                            <p className="text-sm text-center" style={{ color: 'var(--accent-coral)' }}>{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center font-[Syne] font-bold text-sm disabled:opacity-50 cursor-pointer transition-all"
                            style={{
                                height: 52,
                                background: 'var(--accent-green)',
                                color: '#0a0f0d',
                                borderRadius: 14,
                                boxShadow: 'var(--shadow-green)',
                                marginTop: 4,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = 'var(--shadow-green-strong)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'var(--shadow-green)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {loading ? <LoadingSpinner size="sm" /> : tab === 'signin' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
                        {tab === 'signin' ? (
                            <>Don&apos;t have an account?{' '}
                                <button onClick={() => switchTab('register')} className="font-medium hover:text-white cursor-pointer transition-colors" style={{ color: 'var(--text-primary)' }}>Sign up</button>
                            </>
                        ) : (
                            <>Already have an account?{' '}
                                <button onClick={() => switchTab('signin')} className="font-medium hover:text-white cursor-pointer transition-colors" style={{ color: 'var(--text-primary)' }}>Sign in</button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
