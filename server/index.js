console.log("INDEX FILE LOADED");
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const createSchema = require('./db/schema');
const authRoutes = require('./routes/auth');
const groupsRouter = require('./routes/groups');
const expensesRouter = require('./routes/expenses');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS enabled for http://localhost:5173
app.use(cors({
    origin: 'http://localhost:5173'
}));

// JSON body parser
app.use(express.json());

// Initialize Database Schema on startup
createSchema();

// Mount auth routes
app.use('/api/auth', authRoutes);

// Mount groups routes
app.use('/api/groups', groupsRouter);

// Mount expenses routes (handles /api/groups/:id/expenses and /api/expenses/:id)
app.use('/api', expensesRouter);

app.listen(PORT, () => {
    console.log(`SplitSmart server running on port ${PORT}`);
});
