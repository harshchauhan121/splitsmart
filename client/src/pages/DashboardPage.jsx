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

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
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

                const balanceResults = await Promise.all(
                    groupsData.map(g => getBalances(g.id))
                );

                balanceResults.forEach(r => {
                    const bMap = r.data.data.balances || {};
                    const b = bMap[user.id] || 0;
                    if (b > 0) owedToMe += b;
                    else if (b < 0) owed += Math.abs(b);
                });

                setSummary({ totalOwed: owed, totalOwedToMe: owedToMe });
                setSummaryLoading(false);
            }
        } catch {
            showToast('Failed to load dashboard data', 'error');
        } finally { setLoading(false); }
    }, [user]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

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

    const net = summary.totalOwedToMe - summary.totalOwed;

    return (
        <div className="page-enter min-h-screen">
            <Navbar />

            <main className="max-w-[1100px] mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-heading font-bold text-[32px] text-white">Dashboard</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Overview of your expenses and balances</p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="btn-primary"
                        disabled={creating}
                    >
                        + New Group
                    </button>
                </div>

                {/* Summary Card */}
                {!loading && groups.length > 0 && (
                    <div className="card-summary mb-8">
                        <div className="flex-1 text-center">
                            <p className="label mb-1">You are owed</p>
                            <h2 className="font-heading font-bold text-3xl" style={{ color: 'var(--accent-green)' }}>
                                {summaryLoading ? '...' : fmtCurrency(summary.totalOwedToMe)}
                            </h2>
                        </div>
                        <div className="w-[1px] h-12 hidden md:block" style={{ background: 'var(--border-subtle)' }} />
                        <div className="flex-1 text-center">
                            <p className="label mb-1">You owe</p>
                            <h2 className="font-heading font-bold text-3xl" style={{ color: 'var(--accent-coral)' }}>
                                {summaryLoading ? '...' : fmtCurrency(summary.totalOwed)}
                            </h2>
                        </div>
                        <div className="w-[1px] h-12 hidden md:block" style={{ background: 'var(--border-subtle)' }} />
                        <div className="flex-1 text-center">
                            <p className="label mb-1">Net balance</p>
                            <h2
                                className="font-heading font-bold text-3xl"
                                style={{ color: net >= 0 ? 'var(--accent-green)' : 'var(--accent-coral)' }}
                            >
                                {summaryLoading ? '...' : (net >= 0 ? '+' : '-') + fmtCurrency(Math.abs(net))}
                            </h2>
                        </div>
                    </div>
                )}

                {/* Group List */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-heading font-bold text-xl text-white">Your Groups</h2>
                </div>

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

            {/* Create Group Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Group">
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="label mb-2">Group Name</p>
                        <input
                            type="text"
                            placeholder="Weekend Trip"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <p className="label mb-2">Description (optional)</p>
                        <input
                            type="text"
                            placeholder="A short description"
                            value={groupDesc}
                            onChange={(e) => setGroupDesc(e.target.value)}
                            className="input"
                        />
                    </div>
                    {error && <p className="text-sm" style={{ color: 'var(--accent-coral)' }}>{error}</p>}
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="btn-primary w-full"
                        style={{ height: 48 }}
                    >
                        {creating ? <LoadingSpinner size="sm" /> : 'Create Group'}
                    </button>
                </div>
            </Modal>

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
