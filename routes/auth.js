const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../db');

const router = express.Router();
const dbPromise = db.promise();

function createToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '1d'
        }
    );
}


// =========================
// REGISTER
// =========================
router.post('/register', async (req, res) => {

    try {

        // Get username and password from frontend
        const username = req.body.username?.trim();
        const { password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'Server configuration error'
            });
        }

        // Check if username already exists
        const [existingUsers] = await dbPromise.query(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            [username]
        );

        // Username already exists
        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: 'User already exists'
            });
        }

        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await dbPromise.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        const user = {
            id: result.insertId,
            username,
            role: 'user'
        };

        const token = createToken(user);

        res.status(201).json({
            message: 'Register success',
            token,
            user
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: 'Server error'
        });

    }

});


// =========================
// LOGIN
// =========================
router.post('/login', async (req, res) => {

    try {

        // Get login data
        const username = req.body.username?.trim();
        const { password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password required'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'Server configuration error'
            });
        }

        // Find user by username
        const [results] = await dbPromise.query(
            'SELECT id, username, password, role FROM users WHERE username = ? LIMIT 1',
            [username]
        );

        // User not found
        if (results.length === 0) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        // Get first user
        const user = results[0];

        // Compare password with hashed password
        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        // Wrong password
        if (!validPassword) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        const token = createToken(user);

        // Send token to frontend
        res.json({
            message: 'Login success',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: 'Server error'
        });

    }

});


// =========================
// LOGOUT
// =========================
router.post('/logout', (req, res) => {

    // JWT logout usually handled on frontend
    // Frontend deletes token

    res.json({
        message: 'Logout success'
    });

});


// Export router
module.exports = router;
