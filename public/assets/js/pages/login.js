var axios
var encrypt_aes

define(["axios", "encrypt-aes"], (axios_, encrypt_aes_) => {
	[axios, encrypt_aes] = [axios_, encrypt_aes_]
	if (sessionStorage.getItem("token")) {
		window.location.href = "/restaurants.html"
	}
})

var onGoogleSignIn = auth => {
	axios.post("http://localhost:8000/authentication/google-authenticate", { id_token: auth.getAuthResponse().id_token })
		.then(res => {
			gapi.auth2.getAuthInstance().disconnect()
			sessionStorage.setItem("token", res.data.token)
			window.location.href = "/restaurants.html"
		})
		.catch(err => {
			console.error("Authentication failed:", err.message)
		})
}

var login = async () => {
	const email = document.getElementById("email").value
	const password = document.getElementById("password").value

	if (email === "" || password === "") {
		return
	}

	const { password: password_aes, client_key } = await encrypt_password(password)
	axios.post("http://loclhost.com:8000/accounts/login", {
		email,
		password: password_aes,
		client_key
	})
		.then(res => {
			sessionStorage.setItem("token", res.data.token)
			window.location.href = "/restaurants.html"
		})
		.catch(err => {
			console.error("Authentication failed:", err.message)
		})
}