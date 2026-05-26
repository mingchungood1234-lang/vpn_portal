async function register() {
    const username =
        document.getElementById('username').value;

    const password =
        document.getElementById('password').value;

    const response = await fetch(
        'http://localhost:3000/api/auth/register',
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

    const data = await response.json();

    alert(data.message);

}

