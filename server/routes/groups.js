const express = require('express');
const router = express.Router();

console.log("GROUPS ROUTER LOADED");
const db = require('../db/connection');
const authMiddleware = require('../middleware/auth');

// Protect all routes
router.use(authMiddleware);

// GET /api/groups
router.get('/', (req, res) => {
    try {
        const groups = db.prepare(`
            SELECT g.id, g.name, g.description, g.created_at
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = ?
        `).all(req.user.id);

        const groupsWithCounts = groups.map(group => {
            const memberCount = db.prepare(`
                SELECT COUNT(*) as count
                FROM group_members
                WHERE group_id = ?
            `).get(group.id).count;

            return {
                ...group,
                member_count: memberCount,
                current_user_balance: 0
            };
        });

        return res.json({
            success: true,
            data: groupsWithCounts
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch groups"
        });
    }
});


// POST /api/groups
router.post('/', (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            error: "Group name is required"
        });
    }

    try {
        // Insert group
        const insertGroup = db.prepare(`
      INSERT INTO groups (name, description, created_by)
      VALUES (?, ?, ?)
    `);

        const result = insertGroup.run(name, description || null, req.user.id);

        const groupId = result.lastInsertRowid;

        // Add creator as member
        const addMember = db.prepare(`
      INSERT INTO group_members (group_id, user_id)
      VALUES (?, ?)
    `);

        addMember.run(groupId, req.user.id);

        // Return created group
        const group = db.prepare(`
      SELECT id, name, description, created_by, created_at
      FROM groups
      WHERE id = ?
    `).get(groupId);

        return res.status(201).json({
            success: true,
            data: group
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Failed to create group"
        });
    }
});


// GET /api/groups/:id
router.get('/:id', (req, res) => {
    const groupId = req.params.id;

    try {
        // Check if group exists
        const group = db.prepare(`
            SELECT id, name, description, created_at
            FROM groups
            WHERE id = ?
        `).get(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: "Group not found"
            });
        }

        // Check membership
        const membership = db.prepare(`
            SELECT *
            FROM group_members
            WHERE group_id = ? AND user_id = ?
        `).get(groupId, req.user.id);

        if (!membership) {
            return res.status(403).json({
                success: false,
                error: "Access denied"
            });
        }

        // Get members list
        const members = db.prepare(`
            SELECT u.id, u.name, u.email
            FROM users u
            JOIN group_members gm ON u.id = gm.user_id
            WHERE gm.group_id = ?
        `).all(groupId);

        return res.json({
            success: true,
            data: {
                ...group,
                members
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch group"
        });
    }
});

// POST /api/groups/:id/members
// POST /api/groups/:id/members
router.post('/:id/members', (req, res) => {
    const groupId = req.params.id;
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            error: "Email is required"
        });
    }

    try {
        // Check if group exists
        const group = db.prepare(`
            SELECT id FROM groups WHERE id = ?
        `).get(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                error: "Group not found"
            });
        }

        // Check if requester is a member
        const membership = db.prepare(`
            SELECT * FROM group_members
            WHERE group_id = ? AND user_id = ?
        `).get(groupId, req.user.id);

        if (!membership) {
            return res.status(403).json({
                success: false,
                error: "Access denied"
            });
        }

        // Find user by email
        const user = db.prepare(`
            SELECT id, name, email FROM users
            WHERE email = ?
        `).get(email);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Check if already a member
        const existingMember = db.prepare(`
            SELECT * FROM group_members
            WHERE group_id = ? AND user_id = ?
        `).get(groupId, user.id);

        if (existingMember) {
            return res.status(400).json({
                success: false,
                error: "User already a member"
            });
        }

        // Add member
        db.prepare(`
            INSERT INTO group_members (group_id, user_id)
            VALUES (?, ?)
        `).run(groupId, user.id);

        // Return updated members list
        const members = db.prepare(`
            SELECT u.id, u.name, u.email
            FROM users u
            JOIN group_members gm ON u.id = gm.user_id
            WHERE gm.group_id = ?
        `).all(groupId);

        return res.status(201).json({
            success: true,
            data: members
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Failed to add member"
        });
    }
});

module.exports = router;