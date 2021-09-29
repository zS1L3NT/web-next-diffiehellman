requirejs.config({
	baseUrl: "./assets/js",
	paths: {
		axios: "../../bower/axios/dist/axios.min",
		"encrypt-aes": "./encrypt-aes",
		jquery: "../../bower/jquery/dist/jquery.min",
	}
})

define(["axios"], axios => axios.defaults.baseurl = "http://localhost:8000")

/**
 * Calculate each axios request header at runtime to check if a session token 
 * exists, then returns the appropriate header for the request.
 * 
 * @returns Authentication object
 */
const axios_auth = (token = sessionStorage.getItem("token")) => {
	if (token) {
		return {
			headers: {
				Authorization: `Bearer ${token}`
			}
		}
	}
	return {}
}