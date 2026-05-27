const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token) {
    window.location.href = 'index.html';
} else if (role === 'admin') {
    window.location.href = 'admin_dashboard.html';
}

function authHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'index.html';
}

function statusClass(status) {
    return `status-pill status-${status || 'pending'}`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderRequests(requests) {
    const list = document.getElementById('vpn-list');

    if (!requests.length) {
        list.innerHTML = '<div class="empty-state">No VPN request yet.</div>';
        return;
    }

    list.innerHTML = requests.map((request) => {
        const configBlock = request.config
            ? `<textarea class="config-output" readonly>${escapeHtml(request.config)}</textarea>`
            : '<p class="muted">Waiting for the VPN server agent to generate your config.</p>';

        const qrBlock = request.qr_code
            ? `
                <div class="qr-block">
                    <img src="${escapeHtml(request.qr_code)}" alt="WireGuard QR code for ${escapeHtml(request.client_name)}">
                    <p>Scan with the WireGuard mobile app.</p>
                </div>
            `
            : '';

        const errorBlock = request.error
            ? `<p class="error-text">${escapeHtml(request.error)}</p>`
            : '';

        return `
            <article class="vpn-item">
                <div class="vpn-item__header">
                    <div>
                        <h3>${escapeHtml(request.client_name)}</h3>
                        <p>${escapeHtml(request.address || request.assigned_ip || 'No IP assigned yet')}</p>
                    </div>
                    <span class="${statusClass(request.status)}">${escapeHtml(request.status)}</span>
                </div>
                ${qrBlock}
                ${configBlock}
                ${errorBlock}
            </article>
        `;
    }).join('');
}

async function loadVpnRequests() {
    try {
        const apiBaseUrl = await getVpnApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/me`, {
            headers: authHeaders()
        });
        const data = await readJsonResponse(response);

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load VPN requests');
        }

        renderRequests(data.requests || []);
    } catch (error) {
        document.getElementById('vpn-list').innerHTML = `<div class="empty-state">${error.message}</div>`;
    }
}

async function requestVpn(event) {
    event.preventDefault();

    const button = document.getElementById('request-button');
    const message = document.getElementById('request-message');
    const clientName = document.getElementById('client-name').value.trim();

    try {
        button.disabled = true;
        message.textContent = 'Creating VPN request...';

        const apiBaseUrl = await getVpnApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/request`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                client_name: clientName
            })
        });
        const data = await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create VPN request');
        }

        message.textContent = data.message || 'VPN request created';
        document.getElementById('client-name').value = '';
        await loadVpnRequests();
    } catch (error) {
        message.textContent = error.message;
    } finally {
        button.disabled = false;
    }
}

loadVpnRequests();
setInterval(loadVpnRequests, 10000);
