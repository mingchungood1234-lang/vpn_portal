const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

if (!token) {
    window.location.href = 'index.html';
} else if (role !== 'admin') {
    window.location.href = 'dashboard.html';
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

function formatDate(value) {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleString();
}

function updateStats(clients) {
    const active = clients.filter((client) => client.status === 'active').length;
    const pending = clients.filter((client) => client.status === 'pending').length;
    const failed = clients.filter((client) => client.status === 'failed').length;

    document.getElementById('total-count').textContent = clients.length;
    document.getElementById('active-count').textContent = active;
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('failed-count').textContent = failed;
}

function renderClients(clients) {
    const table = document.getElementById('client-table');

    if (!clients.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table">No VPN clients yet.</td>
            </tr>
        `;
        return;
    }

    table.innerHTML = clients.map((client) => `
        <tr>
            <td>${escapeHtml(client.username || '-')}</td>
            <td>${escapeHtml(client.client_name || '-')}</td>
            <td><span class="${statusClass(client.status)}">${escapeHtml(client.status)}</span></td>
            <td>${escapeHtml(client.address || client.assigned_ip || '-')}</td>
            <td>${escapeHtml(formatDate(client.created_at))}</td>
            <td>${escapeHtml(formatDate(client.updated_at))}</td>
        </tr>
    `).join('');
}

async function loadClients() {
    try {
        const apiBaseUrl = await getVpnApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/admin/clients`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await readJsonResponse(response);

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || 'Failed to load VPN clients');
        }

        const clients = data.clients || [];
        updateStats(clients);
        renderClients(clients);
    } catch (error) {
        document.getElementById('client-table').innerHTML = `
            <tr>
                <td colspan="6" class="empty-table">${error.message}</td>
            </tr>
        `;
    }
}

loadClients();
setInterval(loadClients, 10000);
