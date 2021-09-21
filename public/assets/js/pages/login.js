var onGoogleSignIn

define(["axios", "encrypt-aes"], (axios, encrypt_aes) => {
	console.log("Encrypt AES:", encrypt_aes)

	onGoogleSignIn = auth => {
		console.log(auth.getAuthResponse().id_token);
		axios.post("http://localhost:8000/accounts/google-authenticate", { id_token: auth.getAuthResponse().id_token })
			.then(res => {
				console.log("Authenticated:", res.data.token)
			})
			.catch(err => {
				console.error("Authentication failed:", err.message)
			})
	}
})

var googleSignOut = () => {
	gapi.auth2.getAuthInstance().signOut().then(() => {
		console.log("Signed out")
	})
}