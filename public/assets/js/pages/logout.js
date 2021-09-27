define(["axios"], axios => {
	axios.post("/authentication/logout", null, axios_auth())
		.then(() => {
			console.log("Signed out")
		})
		.catch(err => {
			console.log("Error signing out:", err.message)
		})
		.finally(() => {
			sessionStorage.removeItem("token")
			window.location.href = "/"
		})
})