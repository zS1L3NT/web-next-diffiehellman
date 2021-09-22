var axios

define(["axios"], axios_ => {
	axios = axios_

	if (!sessionStorage.getItem("token")) {
		window.location.href = "/login.html"
	}
})