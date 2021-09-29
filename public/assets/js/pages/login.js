var axios
var encrypt_aes

define(["axios", "encrypt-aes"], (axios_, encrypt_aes_) => {
	[axios, encrypt_aes] = [axios_, encrypt_aes_]
	if (sessionStorage.getItem("token")) {
		window.location.href = "/restaurants.html"
	}
})

/**
 * Callback from a Google sign in
 */
var onGoogleSignIn = auth => {
	axios.post("/authentication/google-authenticate", { id_token: auth.getAuthResponse().id_token })
		.then(res => {
			gapi.auth2.getAuthInstance().disconnect()
			sessionStorage.setItem("token", res.data.token)
			window.location.href = "/restaurants.html"
		})
		.catch(err => {
			console.error(err.response.data)
		})
}

/**
 * Start the login process
 */
var login = async () => {
	const email = document.getElementById("email").value
	const password = document.getElementById("password").value

	if (email === "" || password === "") {
		throw new Error("Fill in all fields")
	}

	const { password: password_aes, client_key } = await encrypt_aes(password)
	axios.post("/account/login", {
		email,
		password: password_aes,
		client_key
	})
		.then(res => {
			sessionStorage.setItem("token", res.data.token)
			window.location.href = "/restaurants.html"
		})
		.catch(err => {
			console.error(err.response.data)
		})
}