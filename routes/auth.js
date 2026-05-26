const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../db');

const router = express.Router();


// REGISTER
router.post('/register', async (req, res) => {

    try {

        const { username, password } = req.body;

        db.query(
            'SELECT * FROM users WHERE username = ?',
            [username],
            async (err, results) => {

                if (err) {
                    return res.status(500).json({
                        message: err.message
                    });
                }

                if (results.length > 0) {
                    return res.status(400).json({
                        message: 'User already exists'
                    });
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                db.query(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    [username, hashedPassword],
                    (err, result) => {

                        if (err) {
                            return res.status(500).json({
                                message: err.message
                            });
                        }

                        res.json({
                            message: 'Register success'
                        });

                    }
                );

            }
        );

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

});


// LOGIN
router.post('/login', (req, res) => {

    try {

        const { username, password } = req.body;

        db.query(
            'SELECT * FROM users WHERE username = ?',
            [username],
            async (err, results) => {

                if (err) {
                    return res.status(500).json({
                        message: err.message
                    });
                }

                if (results.length === 0) {
                    return res.status(400).json({
                        message: 'Invalid username'
                    });
                }

                const user = results[0];

                const validPassword = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!validPassword) {
                    return res.status(400).json({
                        message: 'Invalid password'
                    });
                }

                const token = jwt.sign(
                    {
                        id: user.id
                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn: '1d'
                    }
                );

                res.json({
                    message: 'Login success',
                    token
                });

            }
        );

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

});


// LOGOUT
router.post('/logout', (req, res) => {

    res.json({
        message: 'Logout success'
    });

});

module.exports = router;