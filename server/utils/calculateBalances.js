/**
 * calculateBalances(groupId, db)
 *
 * Fetches all expenses and splits for a group and computes:
 *  - A net balance per user (positive = owed money, negative = owes money)
 *  - A simplified list of transactions to settle all debts
 */
function calculateBalances(groupId, db) {
    // Fetch all expenses for this group
    const expenses = db.prepare(`
        SELECT id, paid_by FROM expenses WHERE group_id = ?
    `).all(groupId);

    // Fetch all users in the group (for name lookups)
    const members = db.prepare(`
        SELECT u.id, u.name
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = ?
    `).all(groupId);

    const userNames = {};
    members.forEach(m => { userNames[m.id] = m.name; });

    // net balance map: userId -> net amount
    // positive means others owe that user; negative means user owes others
    const balanceMap = {};

    for (const expense of expenses) {
        const splits = db.prepare(`
            SELECT user_id, amount_owed FROM expense_splits WHERE expense_id = ?
        `).all(expense.id);

        for (const split of splits) {
            const debtor = split.user_id;
            const creditor = expense.paid_by;
            const amount = split.amount_owed;

            if (debtor === creditor) continue; // payer's own share — no net movement

            balanceMap[debtor] = (balanceMap[debtor] || 0) - amount;
            balanceMap[creditor] = (balanceMap[creditor] || 0) + amount;
        }
    }

    // Build the balances array with names
    const balances = Object.entries(balanceMap).map(([userId, amount]) => ({
        user_id: parseInt(userId),
        name: userNames[userId] || "Unknown",
        amount: Math.round(amount * 100) / 100
    }));

    // --- Greedy settlement algorithm ---
    // Work with mutable copies rounded to avoid float drift
    let creditors = balances
        .filter(b => b.amount > 0.001)
        .map(b => ({ ...b }))
        .sort((a, b) => b.amount - a.amount);

    let debtors = balances
        .filter(b => b.amount < -0.001)
        .map(b => ({ ...b }))
        .sort((a, b) => a.amount - b.amount); // most negative first

    const transactions = [];

    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];

        const settlement = Math.min(creditor.amount, Math.abs(debtor.amount));
        const rounded = Math.round(settlement * 100) / 100;

        if (rounded > 0) {
            transactions.push({
                from: { id: debtor.user_id, name: debtor.name },
                to: { id: creditor.user_id, name: creditor.name },
                amount: rounded
            });
        }

        creditor.amount -= settlement;
        debtor.amount += settlement;

        if (Math.abs(creditor.amount) < 0.001) ci++;
        if (Math.abs(debtor.amount) < 0.001) di++;
    }

    return { balances, transactions };
}

module.exports = calculateBalances;
