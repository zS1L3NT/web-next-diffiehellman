define(["axios"], axios => {
	const token = new URLSearchParams(window.location.search).get("token")
	
	axios.post("/verify-token", { token, action: "account-activate" })
		.then(res => {
			sessionStorage.setItem("token", res.data.token)
			axios.put("/account/reactivate", null, axios_auth())
				.then(() => {
					window.location.href = "/restaurants.html"
				})
				.catch(err => {
					console.error(err.response.data)
				})
		})
		.catch(err => {
			console.error(err.response.data)
		})
})