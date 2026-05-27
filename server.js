require('dotenv').config();

const express = require('express');
const cors = require('cors');

require('./db');

const authRoutes = require('./routes/auth');
const vpnRoutes = require('./routes/vpn');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((origin) => origin.trim())
}));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/config', (req, res) => {
    const apiBaseUrl = process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get('host')}/api`;

    res.json({
        apiBaseUrl
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/vpn', vpnRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
