define(["axios"], axios => {
	axios.post("http://localhost:8000/authentication/logout", null, { Authorization: `Bearer ${sessionStorage.getItem("token")}` })
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