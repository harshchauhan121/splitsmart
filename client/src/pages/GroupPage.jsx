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
function fmtDate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

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
    const [expSplitType, setExpSplitType] = useState('equal'); // 'equal' or 'custom'
    const [expCustomSplits, setExpCustomSplits] = useState({}); // { userId: amount }
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

    // Set default payer once group loads
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

    const inputCls = 'w-full text-sm placeholder:text-[var(--text-muted)]';
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
    const btnPrimary = {
        background: 'var(--accent-green)',
        color: '#0a0f0d',
        fontFamily: 'Syne, sans-serif',
        fontWeight: 700,
        borderRadius: 12,
        boxShadow: 'var(--shadow-green)',
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
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-6" style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: 32 }}>
                    <div>
                        <h1 className="font-[Syne] text-white" style={{ fontWeight: 800, fontSize: 48, lineHeight: 1.1 }}>{group.name}</h1>
                        {group.description && (
                            <p className="text-[var(--text-muted)] text-sm mt-2">{group.description}</p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="uppercase" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>Total Spent</p>
                        <p className="font-[Syne] text-white" style={{ fontWeight: 800, fontSize: 48, lineHeight: 1.1 }}>{fmtCurrency(totalSpent)}</p>
                    </div>
                </div>

                {/* Members row */}
                <div className="flex items-center mt-5 gap-2">
                    <div className="flex items-center">
                        {members.map((m, i) => (
                            <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: members.length - i }}>
                                <Avatar name={m.name} size="md" />
                            </div>
                        ))}
                    </div>
                    <span className="text-sm text-[var(--text-muted)] ml-2">
                        {members.length} member{members.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={() => setAddMemberOpen(true)}
                        className="ml-3 px-3 py-1.5 text-xs cursor-pointer transition-colors hover:text-white"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}
                    >
                        + Add Member
                    </button>
                </div>

                {/* Two column layout */}
                <div className="flex flex-col lg:flex-row gap-8 mt-8">
                    {/* Left col — Expenses */}
                    <div className="flex-[2]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-[Syne] font-bold text-xl text-white">Expenses</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSettleOpen(true)}
                                    className="px-4 py-2 text-sm cursor-pointer hover:scale-[1.02] transition-transform bg-transparent font-bold"
                                    style={{ border: '1px solid var(--accent-green)', color: 'var(--accent-green)', borderRadius: 12 }}
                                >
                                    Settle Up
                                </button>
                                <button
                                    onClick={() => { setEditMode(false); setAddExpenseOpen(true); }}
                                    className="px-4 py-2 text-sm cursor-pointer hover:scale-[1.02] transition-transform"
                                    style={btnPrimary}
                                >
                                    + Add Expense
                                </button>
                            </div>
                        </div>

                        <div
                            className="rounded-[18px] p-7"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
                        >
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
                        <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] flex flex-col gap-3">
                            <button
                                onClick={handleLeaveGroup}
                                className="w-full py-3 text-sm font-bold text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer border border-[var(--border-subtle)] rounded-xl"
                            >
                                Leave Group
                            </button>
                            {group?.created_by === user?.id && (
                                <button
                                    onClick={handleDeleteGroup}
                                    className="w-full py-3 text-sm font-bold text-[var(--accent-coral)] hover:bg-[var(--accent-coral)] hover:text-white transition-all cursor-pointer border border-[var(--accent-coral)] rounded-xl opacity-80 hover:opacity-100"
                                >
                                    Delete Group
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right col — Balances */}
                    <div className="flex-[1]">
                        <h2 className="font-[Syne] font-bold text-xl text-white mb-4">Balances</h2>
                        {transactions.length === 0 ? (
                            <div
                                className="rounded-[18px] p-5"
                                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)' }}
                            >
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

            {/* Add/Edit Expense Modal */}
            <Modal isOpen={addExpenseOpen} onClose={() => { setAddExpenseOpen(false); setEditMode(false); }} title={editMode ? 'Edit Expense' : 'Add Expense'}>
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Description"
                        value={expDesc}
                        onChange={(e) => setExpDesc(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <select
                        value={expPayer}
                        onChange={(e) => setExpPayer(e.target.value)}
                        className={inputCls}
                        style={{ ...inputStyle, paddingRight: 16 }}
                    >
                        <option value="" disabled>Who paid?</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <div className="flex bg-[var(--bg-input)] rounded-xl p-1 gap-1">
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

                    {expSplitType === 'custom' && (
                        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Enter amounts for each member</p>
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
                        className="w-full h-12 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform disabled:opacity-50"
                        style={btnPrimary}
                    >
                        {expSubmitting ? <LoadingSpinner size="sm" /> : (editMode ? 'Update Expense' : 'Add Expense')}
                    </button>
                </div>
            </Modal>

            {/* Add Member Modal */}
            <Modal isOpen={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add Member">
                <div className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Member's email"
                        value={memEmail}
                        onChange={(e) => setMemEmail(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
                    />
                    {memError && <p className="text-sm" style={{ color: 'var(--accent-coral)' }}>{memError}</p>}
                    <button
                        onClick={handleAddMember}
                        disabled={memSubmitting}
                        className="w-full h-12 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform disabled:opacity-50"
                        style={btnPrimary}
                    >
                        {memSubmitting ? <LoadingSpinner size="sm" /> : 'Add Member'}
                    </button>
                </div>
            </Modal>

            {/* Settle Up Modal */}
            <Modal isOpen={settleOpen} onClose={() => setSettleOpen(false)} title="Settle Up">
                <div className="flex flex-col gap-4">
                    <select
                        value={settlePayee}
                        onChange={(e) => setSettlePayee(e.target.value)}
                        className={inputCls}
                        style={{ ...inputStyle, paddingRight: 16 }}
                    >
                        <option value="" disabled>Who are you paying?</option>
                        {members.filter(m => m.id !== user?.id).map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--accent-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,136,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
                    />
                    {settleError && <p className="text-sm" style={{ color: 'var(--accent-coral)' }}>{settleError}</p>}
                    <button
                        onClick={handleSettleUp}
                        disabled={settleSubmitting}
                        className="w-full h-12 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform disabled:opacity-50"
                        style={btnPrimary}
                    >
                        {settleSubmitting ? <LoadingSpinner size="sm" /> : 'Record Payment'}
                    </button>
                </div>
            </Modal>

            {/* Toast */}
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
