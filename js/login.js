async function login() {

    const username =
        document.getElementById('username').value;

    const password =
        document.getElementById('password').value;

    try {

        const response = await fetch(
            'http://localhost:3000/api/auth/login',
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

        console.log(data);

        if (data.token) {

            localStorage.setItem(
                'token',
                data.token
            );

            alert('Login success');
            // redirect user
            window.location.href =
                'dashboard.html';

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.log(error);

        alert('Backend connection failed');

    }

}