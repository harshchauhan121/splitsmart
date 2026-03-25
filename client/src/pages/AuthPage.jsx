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
                    backgroundColor: 'var(--bg-surface)',
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
                            className="flex items-center justify-center rounded-logo font-heading font-bold text-sm"
                            style={{ width: 40, height: 40, background: 'var(--accent-green)', color: '#0a0f0d', boxShadow: 'var(--shadow-green)' }}
                        >
                            S
                        </div>
                        <span className="font-heading font-bold text-xl text-white">SplitSmart</span>
                    </div>
                    <h1 className="font-heading font-extrabold text-5xl text-white leading-tight">
                        Split fairly.<br />
                        <span style={{ color: 'var(--accent-green)' }}>Settle simply.</span>
                    </h1>
                    <p className="text-sm mt-5 max-w-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        The modern way to track shared expenses and settle group debts.
                    </p>
                </div>
            </div>

            {/* Right auth panel */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
                <div className="card-flat w-full max-w-md">
                    {/* Tabs */}
                    <div className="flex mb-7" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {['signin', 'register'].map((t) => (
                            <button
                                key={t}
                                onClick={() => switchTab(t)}
                                className="flex-1 pb-3 text-sm font-heading transition-colors cursor-pointer"
                                style={{
                                    color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                                    borderBottom: tab === t ? '2px solid var(--accent-green)' : '2px solid transparent',
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
                            <div>
                                <p className="label mb-2">Full Name</p>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input"
                                />
                            </div>
                        )}
                        <div>
                            <p className="label mb-2">Email Address</p>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div>
                            <p className="label mb-2">Password</p>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-center" style={{ color: 'var(--accent-coral)' }}>{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full mt-2"
                            style={{ height: 52 }}
                        >
                            {loading ? <LoadingSpinner size="sm" /> : tab === 'signin' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
                        {tab === 'signin' ? (
                            <>Don&apos;t have an account?{' '}
                                <button onClick={() => switchTab('register')} className="font-medium hover:text-white cursor-pointer transition-colors" style={{ color: 'var(--accent-green)' }}>Sign up</button>
                            </>
                        ) : (
                            <>Already have an account?{' '}
                                <button onClick={() => switchTab('signin')} className="font-medium hover:text-white cursor-pointer transition-colors" style={{ color: 'var(--accent-green)' }}>Sign in</button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
