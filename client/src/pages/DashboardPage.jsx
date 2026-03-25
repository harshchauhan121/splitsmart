import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGroups, createGroup, getBalances } from '../api/groups';
import Navbar from '../components/Navbar';
import GroupCard from '../components/GroupCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

function fmtCurrency(n) { return '$' + Number(n || 0).toFixed(2); }

export default function DashboardPage() {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ totalOwed: 0, totalOwedToMe: 0 });
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => { document.title = 'Dashboard — SplitSmart'; }, []);

    const inputStyle = {
        background: 'var(--bg-input)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        height: 48,
        color: 'white',
        paddingLeft: 16,
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getGroups();
            const groupsData = res.data.data;
            setGroups(groupsData);

            if (groupsData.length > 0 && user) {
                setSummaryLoading(true);
                let owed = 0;
                let owedToMe = 0;

                const balancePromises = groupsData.map(g => getBalances(g.id));
                const balanceResults = await Promise.all(balancePromises);

                balanceResults.forEach(r => {
                    const bMap = r.data.data.balances || {};
                    const b = bMap[user.id] || 0;
                    if (b > 0) owedToMe += b;
                    else if (b < 0) owed += Math.abs(b);
                });

                setSummary({ totalOwed: owed, totalOwedToMe: owedToMe });
                setSummaryLoading(false);
            }
        } catch (err) {
            showToast('Failed to load dashboard data', 'error');
        } finally { setLoading(false); }
    }, [user]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const btnPrimary = {
        background: 'var(--accent-green)',
        color: '#0a0f0d',
        fontFamily: 'Syne, sans-serif',
        fontWeight: 700,
        borderRadius: 12,
        boxShadow: 'var(--shadow-green)',
    };

    const handleCreate = async () => {
        if (!groupName.trim()) { setError('Group name is required'); return; }
        setCreating(true); setError(null);
        try {
            await createGroup(groupName.trim(), groupDesc.trim());
            setModalOpen(false);
            setGroupName(''); setGroupDesc('');
            showToast('Group created!');
            fetchAll();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create group');
        } finally { setCreating(false); }
    };

    const inputCls = 'w-full text-sm placeholder:text-[var(--text-muted)]';

    return (
        <div className="page-enter min-h-screen">
            <Navbar />

            <main className="max-w-[1100px] mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="font-[Syne] font-bold text-[32px] text-white">Your Groups</h1>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="px-5 py-2.5 text-sm cursor-pointer hover:scale-[1.02] transition-transform"
                        style={btnPrimary}
                        disabled={creating}
                    >
                        + New Group
                    </button>
                </div>

                {/* Summary Card */}
                {!loading && groups.length > 0 && (
                    <div
                        className="mb-8 p-6 rounded-[24px] flex flex-col md:flex-row gap-8 items-center justify-around overflow-hidden relative"
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-card)',
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div className="flex-1 text-center">
                            <p className="uppercase mb-1" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>You are owed</p>
                            <h2 className="font-[Syne] font-bold text-3xl" style={{ color: 'var(--accent-green)' }}>
                                {summaryLoading ? '...' : fmtCurrency(summary.totalOwedToMe)}
                            </h2>
                        </div>
                        <div className="w-[1px] h-12 bg-[var(--border-subtle)] hidden md:block" />
                        <div className="flex-1 text-center">
                            <p className="uppercase mb-1" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>You owe</p>
                            <h2 className="font-[Syne] font-bold text-3xl" style={{ color: 'var(--accent-coral)' }}>
                                {summaryLoading ? '...' : fmtCurrency(summary.totalOwed)}
                            </h2>
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="py-20"><LoadingSpinner size="lg" /></div>
                ) : groups.length === 0 ? (
                    <EmptyState
                        icon="🏠"
                        title="No groups yet"
                        message="Create your first group to start splitting expenses"
                        actionLabel="+ New Group"
                        onAction={() => setModalOpen(true)}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {groups.map((g) => (
                            <GroupCard key={g.id} group={g} />
                        ))}
                    </div>
                )}
            </main>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Group">
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Group Name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <input
                        type="text"
                        placeholder="Description (optional)"
                        value={groupDesc}
                        onChange={(e) => setGroupDesc(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
                    />
                    {error && <p className="text-sm" style={{ color: 'var(--accent-coral)' }}>{error}</p>}
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="w-full h-12 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform disabled:opacity-50"
                        style={btnPrimary}
                    >
                        {creating ? <LoadingSpinner size="sm" /> : 'Create Group'}
                    </button>
                </div>
            </Modal>

            {toast && (
                <div
                    className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-[Syne] font-bold shadow-xl toast-enter"
                    style={{
                        backgroundColor: toast.type === 'error' ? 'var(--accent-coral)' : 'var(--accent-green)',
                        color: '#0a0f0d',
                    }}
                >
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
