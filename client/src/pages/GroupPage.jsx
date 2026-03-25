import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroup, addMember, getBalances, settleUp, leaveGroup, deleteGroup } from '../api/groups';
import { getExpenses, getExpense, createExpense, updateExpense, deleteExpense } from '../api/expenses';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ExpenseItem from '../components/ExpenseItem';
import BalanceCard from '../components/BalanceCard';
import Modal from '../components/Modal';

function fmtCurrency(n) { return '$' + Number(n || 0).toFixed(2); }

export default function GroupPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [addExpenseOpen, setAddExpenseOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [settleOpen, setSettleOpen] = useState(false);

    // Settle form
    const [settlePayee, setSettlePayee] = useState('');
    const [settleAmount, setSettleAmount] = useState('');
    const [settleSubmitting, setSettleSubmitting] = useState(false);
    const [settleError, setSettleError] = useState(null);

    // Expense form
    const [expDesc, setExpDesc] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expPayer, setExpPayer] = useState('');
    const [expSplitType, setExpSplitType] = useState('equal');
    const [expCustomSplits, setExpCustomSplits] = useState({});
    const [expSubmitting, setExpSubmitting] = useState(false);
    const [expError, setExpError] = useState(null);

    // Member form
    const [memEmail, setMemEmail] = useState('');
    const [memSubmitting, setMemSubmitting] = useState(false);
    const [memError, setMemError] = useState(null);

    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [gRes, eRes, bRes] = await Promise.all([
                getGroup(id),
                getExpenses(id),
                getBalances(id),
            ]);
            setGroup(gRes.data.data);
            setExpenses(eRes.data.data);
            setTransactions(bRes.data.data.transactions || []);
        } catch {
            showToast('Failed to load group', 'error');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => {
        if (group) document.title = `${group.name} — SplitSmart`;
    }, [group]);

    useEffect(() => {
        if (group && user && !expPayer) setExpPayer(String(user.id));
    }, [group, user, expPayer]);

    const handleOpenEditModal = async (expense) => {
        setEditMode(true);
        setEditingExpenseId(expense.id);
        setExpDesc(expense.description);
        setExpAmount(String(expense.amount));
        setExpPayer(String(expense.paid_by));
        setExpError(null);

        try {
            const res = await getExpense(expense.id);
            const fullExp = res.data.data;
            const isEqual = fullExp.splits.length === group.members.length &&
                fullExp.splits.every(s => Math.abs(s.amount_owed - (fullExp.amount / group.members.length)) < 0.05);

            if (isEqual) {
                setExpSplitType('equal');
                setExpCustomSplits({});
            } else {
                setExpSplitType('custom');
                const splitMap = {};
                group.members.forEach(m => {
                    const found = fullExp.splits.find(s => s.user_id === m.id);
                    splitMap[m.id] = found ? String(found.amount_owed) : '0';
                });
                setExpCustomSplits(splitMap);
            }
            setAddExpenseOpen(true);
        } catch (err) {
            showToast('Failed to fetch expense details', 'error');
        }
    };

    const handleAddExpense = async () => {
        const amount = parseFloat(expAmount);
        if (!expDesc.trim() || isNaN(amount) || amount <= 0 || !expPayer) {
            setExpError('Please fill in all fields correctly');
            return;
        }

        let splits = [];
        if (expSplitType === 'custom') {
            const totalSplit = Object.values(expCustomSplits).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            if (Math.abs(totalSplit - amount) > 0.01) {
                setExpError(`Total splits ($${totalSplit.toFixed(2)}) must equal expense amount ($${amount.toFixed(2)})`);
                return;
            }
            splits = Object.entries(expCustomSplits).map(([uid, val]) => ({
                user_id: parseInt(uid),
                amount_owed: parseFloat(val) || 0
            }));
        }

        setExpSubmitting(true); setExpError(null);
        try {
            const payload = {
                description: expDesc.trim(),
                amount: amount,
                paid_by: parseInt(expPayer),
                split_type: expSplitType,
                splits: splits
            };

            if (editMode) {
                await updateExpense(editingExpenseId, payload);
                showToast('Expense updated!');
            } else {
                await createExpense(id, payload);
                showToast('Expense added!');
            }

            setAddExpenseOpen(false);
            setEditMode(false);
            setEditingExpenseId(null);
            setExpDesc(''); setExpAmount(''); setExpPayer(String(user.id));
            setExpSplitType('equal'); setExpCustomSplits({});
            fetchAll();
        } catch (err) {
            setExpError(err.response?.data?.error || 'Failed to process expense');
        } finally { setExpSubmitting(false); }
    };

    const handleAddMember = async () => {
        if (!memEmail.trim()) { setMemError('Enter an email'); return; }
        setMemSubmitting(true); setMemError(null);
        try {
            await addMember(id, memEmail.trim());
            setAddMemberOpen(false);
            setMemEmail('');
            showToast('Member added!');
            fetchAll();
        } catch (err) {
            setMemError(err.response?.data?.error || 'Failed to add member');
        } finally { setMemSubmitting(false); }
    };

    const handleSettleUp = async () => {
        if (!settlePayee || !settleAmount) {
            setSettleError('Select a user and enter an amount');
            return;
        }
        setSettleSubmitting(true); setSettleError(null);
        try {
            await settleUp(id, user.id, settlePayee, parseFloat(settleAmount));
            setSettleOpen(false);
            setSettlePayee(''); setSettleAmount('');
            showToast('Debt settled!');
            fetchAll();
        } catch (err) {
            setSettleError(err.response?.data?.error || 'Failed to record settlement');
        } finally { setSettleSubmitting(false); }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            await deleteExpense(expenseId);
            showToast('Expense deleted!');
            fetchAll();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete expense', 'error');
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm('Are you sure you want to leave this group?')) return;
        try {
            await leaveGroup(id);
            showToast('You left the group');
            navigate('/dashboard');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to leave group', 'error');
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm('WARNING: This will permanently delete the group and all its expenses. Continue?')) return;
        try {
            await deleteGroup(id);
            showToast('Group deleted');
            navigate('/dashboard');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete group', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="py-20"><LoadingSpinner size="lg" /></div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <EmptyState icon="⚠️" title="Group not found" actionLabel="Go to Dashboard" onAction={() => navigate('/dashboard')} />
            </div>
        );
    }

    const members = group.members || [];
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="page-enter min-h-screen">
            <Navbar />

            <main className="max-w-[1100px] mx-auto px-6 py-10">
                {/* ── Header ── */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-6 mb-8" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                        <h1 className="font-heading text-white" style={{ fontWeight: 800, fontSize: 48, lineHeight: 1.1 }}>{group.name}</h1>
                        {group.description && (
                            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{group.description}</p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="label">Total Spent</p>
                        <p className="font-heading text-white" style={{ fontWeight: 800, fontSize: 48, lineHeight: 1.1 }}>{fmtCurrency(totalSpent)}</p>
                    </div>
                </div>

                {/* ── Members Row ── */}
                <div className="flex items-center mt-5 gap-2">
                    <div className="flex items-center">
                        {members.map((m, i) => (
                            <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: members.length - i }}>
                                <Avatar name={m.name} size="md" />
                            </div>
                        ))}
                    </div>
                    <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                        {members.length} member{members.length !== 1 ? 's' : ''}
                    </span>
                    <button onClick={() => setAddMemberOpen(true)} className="btn-ghost ml-3">
                        + Add Member
                    </button>
                </div>

                {/* ── Two Column Layout ── */}
                <div className="flex flex-col lg:flex-row gap-8 mt-8">
                    {/* Left — Expenses */}
                    <div className="flex-[2]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-heading font-bold text-xl text-white">Expenses</h2>
                            <div className="flex gap-3">
                                <button onClick={() => setSettleOpen(true)} className="btn-secondary">
                                    Settle Up
                                </button>
                                <button onClick={() => { setEditMode(false); setAddExpenseOpen(true); }} className="btn-primary">
                                    + Add Expense
                                </button>
                            </div>
                        </div>

                        <div className="card-flat">
                            {expenses.length === 0 ? (
                                <EmptyState icon="💸" title="No expenses yet" message="Add the first expense for this group" />
                            ) : (
                                expenses.map((e) => (
                                    <ExpenseItem
                                        key={e.id}
                                        expense={e}
                                        currentUserId={user?.id}
                                        onDelete={handleDeleteExpense}
                                        onEdit={handleOpenEditModal}
                                    />
                                ))
                            )}
                        </div>

                        {/* Group Controls */}
                        <div className="mt-8 pt-6 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <button onClick={handleLeaveGroup} className="btn-ghost w-full py-3">
                                Leave Group
                            </button>
                            {group?.created_by === user?.id && (
                                <button onClick={handleDeleteGroup} className="btn-danger w-full py-3">
                                    Delete Group
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right — Balances */}
                    <div className="flex-[1]">
                        <h2 className="font-heading font-bold text-xl text-white mb-4">Balances</h2>
                        {transactions.length === 0 ? (
                            <div className="card-flat">
                                <EmptyState icon="✅" title="All settled up!" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {transactions.map((t, i) => <BalanceCard key={i} transaction={t} />)}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ══════ Add/Edit Expense Modal ══════ */}
            <Modal isOpen={addExpenseOpen} onClose={() => { setAddExpenseOpen(false); setEditMode(false); }} title={editMode ? 'Edit Expense' : 'Add Expense'}>
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="label mb-2">Description</p>
                        <input
                            type="text"
                            placeholder="e.g. Dinner at Mario's"
                            value={expDesc}
                            onChange={(e) => setExpDesc(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <p className="label mb-2">Amount</p>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={expAmount}
                            onChange={(e) => setExpAmount(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <p className="label mb-2">Who paid?</p>
                        <select
                            value={expPayer}
                            onChange={(e) => setExpPayer(e.target.value)}
                            className="input"
                            style={{ paddingRight: 16 }}
                        >
                            <option value="" disabled>Select payer</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Split Toggle */}
                    <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--bg-input)' }}>
                        <button
                            type="button"
                            onClick={() => setExpSplitType('equal')}
                            className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            style={{
                                background: expSplitType === 'equal' ? 'var(--accent-green)' : 'transparent',
                                color: expSplitType === 'equal' ? '#0a0f0d' : 'var(--text-muted)'
                            }}
                        >
                            Equal Split
                        </button>
                        <button
                            type="button"
                            onClick={() => setExpSplitType('custom')}
                            className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            style={{
                                background: expSplitType === 'custom' ? 'var(--accent-green)' : 'transparent',
                                color: expSplitType === 'custom' ? '#0a0f0d' : 'var(--text-muted)'
                            }}
                        >
                            Custom Split
                        </button>
                    </div>

                    {/* Custom Splits */}
                    {expSplitType === 'custom' && (
                        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            <p className="label mb-1">Enter amounts for each member</p>
                            {members.map(m => (
                                <div key={m.id} className="flex items-center gap-2">
                                    <Avatar name={m.name} size="sm" />
                                    <span className="text-sm flex-1 truncate">{m.name}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={expCustomSplits[m.id] || ''}
                                        onChange={(e) => setExpCustomSplits({ ...expCustomSplits, [m.id]: e.target.value })}
                                        className="w-20 rounded-lg text-xs p-2 outline-none text-right"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {expError && <p className="text-sm" style={{ color: 'var(--accent-coral)' }}>{expError}</p>}
                    <button
                        onClick={handleAddExpense}
                        disabled={expSubmitting}
                        className="btn-primary w-full"
                        style={{ height: 48 }}
                    >
                        {expSubmitting ? <LoadingSpinner size="sm" /> : (editMode ? 'Update Expense' : 'Add Expense')}
                    </button>
                </div>
            </Modal>

            {/* ══════ Add Member Modal ══════ */}
            <Modal isOpen={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add Member">
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="label mb-2">Email Address</p>
                        <input
                            type="email"
                            placeholder="member@example.com"
                            value={memEmail}
                            onChange={(e) => setMemEmail(e.target.value)}
                            className="input"
                        />
                    </div>
                    {memError && <p className="text-sm" style={{ color: 'var(--accent-coral)' }}>{memError}</p>}
                    <button
                        onClick={handleAddMember}
                        disabled={memSubmitting}
                        className="btn-primary w-full"
                        style={{ height: 48 }}
                    >
                        {memSubmitting ? <LoadingSpinner size="sm" /> : 'Add Member'}
                    </button>
                </div>
            </Modal>

            {/* ══════ Settle Up Modal ══════ */}
            <Modal isOpen={settleOpen} onClose={() => setSettleOpen(false)} title="Settle Up">
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="label mb-2">Who are you paying?</p>
                        <select
                            value={settlePayee}
                            onChange={(e) => setSettlePayee(e.target.value)}
                            className="input"
                            style={{ paddingRight: 16 }}
                        >
                            <option value="" disabled>Select member</option>
                            {members.filter(m => m.id !== user?.id).map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <p className="label mb-2">Amount</p>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            className="input"
                        />
                    </div>
                    {settleError && <p className="text-sm" style={{ color: 'var(--accent-coral)' }}>{settleError}</p>}
                    <button
                        onClick={handleSettleUp}
                        disabled={settleSubmitting}
                        className="btn-primary w-full"
                        style={{ height: 48 }}
                    >
                        {settleSubmitting ? <LoadingSpinner size="sm" /> : 'Record Payment'}
                    </button>
                </div>
            </Modal>

            {/* ══════ Toast ══════ */}
            {toast && (
                <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
