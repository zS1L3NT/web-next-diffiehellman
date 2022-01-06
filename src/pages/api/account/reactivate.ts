import server from "../../../server"
import withAuthentication from "../../../middleware/withAuthentication"

/**
 * Reactivate a user's account
 * @private
 */
export default withAuthentication(async (req, res) => {
	if (req.method === "POST") {
		await server.query("UPDATE users SET active = 1 WHERE id = ?", [req.user!.id])
		res.status(200).end()
	}
})
