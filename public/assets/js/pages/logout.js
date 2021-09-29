define(["axios"], axios => {
	axios.post("/authentication/logout", null, axios_auth())
		.then(() => {
			console.log("Signed out")
		})
		.catch(err => {
			console.error(err.response.data)
		})
		.finally(() => {
			sessionStorage.removeItem("token")
			window.location.href = "/"
		})
})