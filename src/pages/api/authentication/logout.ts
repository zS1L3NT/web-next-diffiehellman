import server from "../../../server"
import withAuthentication from "../../../middleware/withAuthentication"

/**
 * Log the user out of their account
 * @private
 *
 * Since deauthenticating a JWT token is not possible, we will
 * add the JWT token to a blacklist, so that the authenticated
 * middleware can reject those tokens if used again after logging
 * out.
 */
export default withAuthentication(async (req, res) => {
	if (req.method === "POST") {
		const token = req.headers.authorization!
		server.jwt_blacklist.push(token)

		/**
		 * Remove token after it is garunteed to expire (1h) to ensure that
		 * the blacklist values don't stay forever and take up useless space
		 */
		setTimeout(() => {
			server.jwt_blacklist.splice(server.jwt_blacklist.indexOf(token), 1)
		}, 3600000)
		res.status(200).end()
	}
})
