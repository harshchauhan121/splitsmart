const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
        }

        // Check if email already exists
        const checkUserStmt = db.prepare('SELECT id FROM users WHERE email = ?');
        const existingUser = checkUserStmt.get(email);

        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const insertUserStmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
        const info = insertUserStmt.run(name, email, passwordHash);

        const userId = info.lastInsertRowid;

        // Generate JWT
        const userPayload = { id: userId, email, name };
        const token = jwt.sign(userPayload, process.env.JWT_SECRET);

        res.json({
            success: true,
            data: {
                token,
                user: userPayload
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const getUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = getUserStmt.get(email);

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Generate JWT
        const userPayload = { id: user.id, email: user.email, name: user.name };
        const token = jwt.sign(userPayload, process.env.JWT_SECRET);

        res.json({
            success: true,
            data: {
                token,
                user: userPayload
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
