async function register(event) {
    event?.preventDefault();

    const submitButton = event?.submitter;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!username || !password || !confirmPassword) {
        alert('Please complete all fields');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        if (submitButton) {
            submitButton.disabled = true;
        }

        const apiBaseUrl = await getAuthApiBaseUrl();
        const response = await fetch(
            `${apiBaseUrl}/register`,
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

        if (response.ok) {
            alert(data.message || 'Register success');
            window.location.href = 'index.html';
        } else {
            alert(data.message || 'Register failed');
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
