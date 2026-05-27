const express = require('express');
const jwt = require('jsonwebtoken');

const db = require('../db');

const router = express.Router();
const dbPromise = db.promise();

async function ensureVpnRequestsTable() {
    await dbPromise.query(`
        CREATE TABLE IF NOT EXISTS vpn_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            client_name VARCHAR(80) NOT NULL,
            status ENUM('pending', 'active', 'failed') NOT NULL DEFAULT 'pending',
            assigned_ip VARCHAR(45),
            address VARCHAR(64),
            client_public_key TEXT,
            config MEDIUMTEXT,
            config_file VARCHAR(255),
            qr_file VARCHAR(255),
            qr_code MEDIUMTEXT,
            error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_vpn_requests_user_id (user_id),
            INDEX idx_vpn_requests_status (status)
        )
    `);

    try {
        await dbPromise.query('ALTER TABLE vpn_requests ADD COLUMN qr_file VARCHAR(255) AFTER config_file');
    } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
            throw error;
        }
    }

    try {
        await dbPromise.query('ALTER TABLE vpn_requests ADD COLUMN qr_code MEDIUMTEXT AFTER qr_file');
    } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
            throw error;
        }
    }
}

ensureVpnRequestsTable().catch((error) => {
    console.log('Failed to prepare vpn_requests table');
    console.log(error);
});

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({
            message: 'Authentication required'
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            message: 'Server configuration error'
        });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
}

function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            message: 'Admin access required'
        });
    }

    next();
}

function authenticateAgent(req, res, next) {
    const expectedToken = process.env.WG_AGENT_TOKEN;

    if (!expectedToken) {
        return next();
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token !== expectedToken) {
        return res.status(401).json({
            message: 'Invalid agent token'
        });
    }

    next();
}

function safeClientName(name) {
    return String(name || '')
        .trim()
        .replace(/[^A-Za-z0-9_.-]/g, '-')
        .slice(0, 80);
}

function mapVpnRequest(row) {
    return {
        id: row.id,
        user_id: row.user_id,
        username: row.username,
        client_name: row.client_name,
        status: row.status,
        assigned_ip: row.assigned_ip,
        address: row.address,
        client_public_key: row.client_public_key,
        config: row.config,
        config_file: row.config_file,
        qr_file: row.qr_file,
        qr_code: row.qr_code,
        error: row.error,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

router.get('/me', authenticate, async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT vpn_requests.*, users.username
             FROM vpn_requests
             JOIN users ON users.id = vpn_requests.user_id
             WHERE vpn_requests.user_id = ?
             ORDER BY vpn_requests.created_at DESC`,
            [req.user.id]
        );

        res.json({
            requests: rows.map(mapVpnRequest)
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

router.post('/request', authenticate, async (req, res) => {
    try {
        const requestedName = safeClientName(req.body.client_name);
        const fallbackName = safeClientName(`${req.user.username || 'client'}-${req.user.id}`);
        const clientName = requestedName || fallbackName;

        const [openRequests] = await dbPromise.query(
            `SELECT id, status FROM vpn_requests
             WHERE user_id = ? AND status IN ('pending', 'active')
             ORDER BY created_at DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (openRequests.length > 0) {
            return res.status(409).json({
                message: 'You already have a VPN request or active VPN config',
                request: openRequests[0]
            });
        }

        const [result] = await dbPromise.query(
            'INSERT INTO vpn_requests (user_id, client_name) VALUES (?, ?)',
            [req.user.id, clientName]
        );

        res.status(201).json({
            message: 'VPN request created',
            request: {
                id: result.insertId,
                client_name: clientName,
                status: 'pending'
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

router.get('/admin/clients', authenticate, requireAdmin, async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT vpn_requests.*, users.username
             FROM vpn_requests
             JOIN users ON users.id = vpn_requests.user_id
             ORDER BY vpn_requests.created_at DESC`
        );

        res.json({
            clients: rows.map(mapVpnRequest)
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

router.get('/pending', authenticateAgent, async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT vpn_requests.*, users.username
             FROM vpn_requests
             JOIN users ON users.id = vpn_requests.user_id
             WHERE vpn_requests.status = 'pending'
             ORDER BY vpn_requests.created_at ASC
             LIMIT 10`
        );

        res.json({
            requests: rows.map((row) => ({
                id: row.id,
                user_id: row.user_id,
                username: row.username,
                client_name: row.client_name
            }))
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

router.post('/:id/complete', authenticateAgent, async (req, res) => {
    try {
        const requestId = Number(req.params.id);

        if (!Number.isInteger(requestId)) {
            return res.status(400).json({
                message: 'Invalid request id'
            });
        }

        await dbPromise.query(
            `UPDATE vpn_requests
             SET status = 'active',
                 assigned_ip = ?,
                 address = ?,
                 client_public_key = ?,
                 config = ?,
                 config_file = ?,
                 qr_file = ?,
                 qr_code = ?,
                 error = NULL
             WHERE id = ?`,
            [
                req.body.assigned_ip || null,
                req.body.address || null,
                req.body.client_public_key || null,
                req.body.config || null,
                req.body.config_file || null,
                req.body.qr_file || null,
                req.body.qr_code || null,
                requestId
            ]
        );

        res.json({
            message: 'VPN request completed'
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

router.post('/:id/fail', authenticateAgent, async (req, res) => {
    try {
        const requestId = Number(req.params.id);

        if (!Number.isInteger(requestId)) {
            return res.status(400).json({
                message: 'Invalid request id'
            });
        }

        await dbPromise.query(
            `UPDATE vpn_requests
             SET status = 'failed',
                 error = ?
             WHERE id = ?`,
            [req.body.error || 'WireGuard agent failed', requestId]
        );

        res.json({
            message: 'VPN request marked failed'
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: 'Server error'
        });
    }
});

module.exports = router;
