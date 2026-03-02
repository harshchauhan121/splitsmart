const express = require('express');
const router = express.Router();

const db = require('../db/connection');
const authMiddleware = require('../middleware/auth');

// All routes require a valid JWT
router.use(authMiddleware);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGroup(groupId) {
    return db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId);
}

function getMembership(groupId, userId) {
    return db.prepare(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?'
    ).get(groupId, userId);
}

// ─── GET /api/groups/:id/expenses ───────────────────────────────────────────

router.get('/groups/:id/expenses', (req, res) => {
    const groupId = req.params.id;

    try {
        if (!getGroup(groupId)) {
            return res.status(404).json({ success: false, error: 'Group not found' });
        }

        if (!getMembership(groupId, req.user.id)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const expenses = db.prepare(`
            SELECT
                e.id,
                e.description,
                e.amount,
                e.date,
                e.paid_by,
                u.name  AS paid_by_name,
                (SELECT COUNT(*) FROM expense_splits es WHERE es.expense_id = e.id) AS split_count
            FROM expenses e
            JOIN users u ON u.id = e.paid_by
            WHERE e.group_id = ?
            ORDER BY e.created_at DESC
        `).all(groupId);

        return res.json({ success: true, data: expenses });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
    }
});

// ─── POST /api/groups/:id/expenses ──────────────────────────────────────────

router.post('/groups/:id/expenses', (req, res) => {
    const groupId = req.params.id;
    const { description, amount, paid_by, split_type, splits } = req.body;

    // Basic validation
    if (!description || amount == null || !paid_by || !split_type) {
        return res.status(400).json({
            success: false,
            error: 'description, amount, paid_by, and split_type are required'
        });
    }

    if (!['equal', 'custom'].includes(split_type)) {
        return res.status(400).json({ success: false, error: 'split_type must be "equal" or "custom"' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }

    try {
        if (!getGroup(groupId)) {
            return res.status(404).json({ success: false, error: 'Group not found' });
        }

        // Requester must be a member
        if (!getMembership(groupId, req.user.id)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // paid_by must also be a member
        if (!getMembership(groupId, paid_by)) {
            return res.status(400).json({ success: false, error: 'paid_by user is not a member of this group' });
        }

        // Build the splits array
        let resolvedSplits = [];

        if (split_type === 'equal') {
            const members = db.prepare(`
                SELECT user_id FROM group_members WHERE group_id = ?
            `).all(groupId);

            const share = Math.round((numAmount / members.length) * 100) / 100;
            resolvedSplits = members.map(m => ({ user_id: m.user_id, amount_owed: share }));

        } else {
            // custom — validate
            if (!Array.isArray(splits) || splits.length === 0) {
                return res.status(400).json({ success: false, error: 'splits array is required for custom split_type' });
            }

            const total = splits.reduce((sum, s) => sum + parseFloat(s.amount_owed || 0), 0);
            if (Math.abs(total - numAmount) > 0.01) {
                return res.status(400).json({
                    success: false,
                    error: `Custom split amounts (${total}) do not add up to the expense amount (${numAmount})`
                });
            }

            resolvedSplits = splits.map(s => ({
                user_id: s.user_id,
                amount_owed: parseFloat(s.amount_owed)
            }));
        }

        // Insert expense + splits in a single transaction
        const insertExpense = db.prepare(`
            INSERT INTO expenses (group_id, paid_by, amount, description, date)
            VALUES (?, ?, ?, ?, ?)
        `);

        const insertSplit = db.prepare(`
            INSERT INTO expense_splits (expense_id, user_id, amount_owed)
            VALUES (?, ?, ?)
        `);

        const today = new Date().toISOString().split('T')[0];

        const txn = db.transaction(() => {
            const result = insertExpense.run(groupId, paid_by, numAmount, description, today);
            const expenseId = result.lastInsertRowid;

            for (const s of resolvedSplits) {
                insertSplit.run(expenseId, s.user_id, s.amount_owed);
            }

            return expenseId;
        });

        const expenseId = txn();

        // Fetch and return the created expense with splits
        const expense = db.prepare(`
            SELECT e.id, e.description, e.amount, e.date, e.paid_by,
                   u.name AS paid_by_name
            FROM expenses e
            JOIN users u ON u.id = e.paid_by
            WHERE e.id = ?
        `).get(expenseId);

        const expenseSplits = db.prepare(`
            SELECT es.user_id, es.amount_owed, u.name
            FROM expense_splits es
            JOIN users u ON u.id = es.user_id
            WHERE es.expense_id = ?
        `).all(expenseId);

        return res.status(201).json({
            success: true,
            data: { ...expense, splits: expenseSplits }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Failed to create expense' });
    }
});

// ─── DELETE /api/expenses/:id ────────────────────────────────────────────────

router.delete('/expenses/:id', (req, res) => {
    const expenseId = req.params.id;

    try {
        const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);

        if (!expense) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }

        // Only the payer can delete
        if (expense.paid_by !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Only the payer can delete this expense' });
        }

        db.transaction(() => {
            db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(expenseId);
            db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);
        })();

        return res.json({ success: true, data: { message: 'Expense deleted successfully' } });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Failed to delete expense' });
    }
});

module.exports = router;
