var axios
var encrypt_aes

var session_token

define(["axios", "encrypt-aes"], (axios_, encrypt_aes_) => {
	axios = axios_
	encrypt_aes = encrypt_aes_

	const token = new URLSearchParams(window.location.search).get("token")
	if (!token) {
		document.getElementById("send-email").style.display = "block"
	} else {
		axios.post("/verify-token", { token, action: "password-reset" })
			.then(res => {
				document.getElementById("token-valid").style.display = "block"
				session_token = res.data.token
			})
			.catch(err => {
				console.error(err.response.data)
			})
	}
})

/**
 * Send the email to the user's email address
 */
const send_email = () => {
	const email = document.getElementById("email").value
	axios.post("/accounts/password-reset", { email })
		.then(() => {
			console.log("Sent email")
		})
		.catch(() => {
			console.error(err.response.data)
		})
}

/**
 * Start the password reset process
 */
const reset_password = async () => {
	const password = document.getElementById("password").value
	const confirm_password = document.getElementById("confirm-password").value

	if (password === "") {
		throw new Error("Please enter a password")
	}

	if (password !== confirm_password) {
		throw new Error("Passwords do not match!")
	}

	const { password: password_aes, client_key } = await encrypt_aes(password)
	axios.put("/accounts/update", {
		password: password_aes,
		client_key
	}, axios_auth(session_token))
		.then(() => {
			window.location.href = "/restaurants.html"
		})
		.catch(err => {
			console.error(err.response.data)
		})
}