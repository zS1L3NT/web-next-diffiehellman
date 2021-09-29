var axios
var encrypt_aes

define(["axios", "encrypt-aes"], (axios_, encrypt_aes_) => {
	[axios, encrypt_aes] = [axios_, encrypt_aes_]
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
 * Start the register process
 */
const register = async () => {
	const username = document.getElementById("username").value
	const first_name = document.getElementById("first-name").value
	const last_name = document.getElementById("last-name").value
	const mobile_number = document.getElementById("mobile-number").value
	const email = document.getElementById("email").value
	const password = document.getElementById("password").value
	const confirm_password = document.getElementById("confirm-password").value

	if (username === "" ||
		first_name === "" ||
		last_name === "" ||
		mobile_number === "" ||
		email === "" ||
		password === "" ||
		confirm_password === "") {
		throw new Error("Fill in all fields")
	}

	if (password !== confirm_password) {
		throw new Error("Passwords do not match!")
	}

	const { password: password_aes, client_key } = await encrypt_aes(password)
	axios.post("/account/register", {
		username,
		first_name,
		last_name,
		mobile_number: parseInt(mobile_number),
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