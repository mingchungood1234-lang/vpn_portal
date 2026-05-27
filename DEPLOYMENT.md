# Deployment Split

## GitHub Pages / Frontend

Upload these files and folders:

- `index.html`
- `register.html`
- `dashboard.html`
- `admin_dashboard.html`
- `assets/`
- `js/`

Before uploading, edit `js/config.js`:

```js
window.APP_CONFIG = {
    API_BASE_URL: 'https://vpn.mingchun.us.ci/api'
};
```

## Home Server / Backend

Run these files on the home server:

- `server.js`
- `db.js`
- `routes/`
- `package.json`
- `package-lock.json`
- `.env`

Example `.env` values:

```env
DB_HOST=localhost
DB_USER=vpnuser
DB_PASSWORD=your-db-password
DB_NAME=vpnportal
JWT_SECRET=replace-with-a-long-secret
PUBLIC_API_BASE_URL=https://vpn.mingchun.us.ci/api
CORS_ORIGIN=https://mingchungood1234-lang.github.io
WG_AGENT_TOKEN=replace-with-a-long-agent-secret
```

Run:

```bash
npm install
npm start
```

## VPS / VPN Server

Copy only this file to the VPS:

- `wg-automation.py`

The VPS needs WireGuard, Python 3, and `qrencode` installed.

On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install wireguard qrencode
```

Edit the constants near the top of `wg-automation.py`:

```python
DEFAULT_API_URL = "http://10.0.0.2:3000/api/vpn"
DEFAULT_AGENT_TOKEN = "replace-with-a-long-agent-secret"
DEFAULT_ENDPOINT = "your-vps-public-ip:51820"
DEFAULT_INTERFACE = "wg0"
DEFAULT_SUBNET = "10.0.0.0/24"
```

Then run:

```bash
sudo ./wg-automation.py
```

You can still override values from the command line when needed:

```bash
sudo WG_AGENT_TOKEN=replace-with-a-long-agent-secret ./wg-automation.py agent \
  --api-url http://10.0.0.2:3000/api/vpn \
  --endpoint your-vps-public-ip:51820
```

The `WG_AGENT_TOKEN` value must match the home server `.env`.
