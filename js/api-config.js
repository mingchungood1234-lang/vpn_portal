let apiConfigPromise;

async function readJsonResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        return {
            message: 'Server returned an invalid response'
        };
    }
}

async function getApiBaseUrl() {
    if (window.APP_CONFIG?.API_BASE_URL) {
        return window.APP_CONFIG.API_BASE_URL.replace(/\/$/, '');
    }

    if (!apiConfigPromise) {
        apiConfigPromise = fetch('/api/config')
            .then(readJsonResponse)
            .then((config) => (config.apiBaseUrl || '/api').replace(/\/$/, ''))
            .catch(() => '/api');
    }

    return apiConfigPromise;
}

async function getAuthApiBaseUrl() {
    return `${await getApiBaseUrl()}/auth`;
}

async function getVpnApiBaseUrl() {
    return `${await getApiBaseUrl()}/vpn`;
}
