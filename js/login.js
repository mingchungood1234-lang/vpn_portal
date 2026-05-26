const API_BASE_URL = 'http://localhost:3000/api/auth';

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

async function login(event) {
    event?.preventDefault();

    const submitButton = event?.submitter;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please enter your username and password');
        return;
    }

    try {
        if (submitButton) {
            submitButton.disabled = true;
        }

        const response = await fetch(
            `${API_BASE_URL}/login`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        const data = await readJsonResponse(response);

        if (response.ok && data.token) {
            const role = data.user?.role || 'user';

            // Save JWT token
            localStorage.setItem(
                'token',
                data.token
            );
            localStorage.setItem(
                'role',
                role
            );

            // Redirect by role
            if (role === 'admin') {
                window.location.href = 'admin_dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }

        } else {

            alert(data.message || 'Login failed');

        }

    } catch (error) {

        console.log(error);

        alert('Backend connection failed');

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }

    }

}
