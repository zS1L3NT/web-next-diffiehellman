import server from "../../../server"
import withAuthentication from "../../../middleware/withAuthentication"

/**
 * Deactivate a user's account
 * @private
 */
export default withAuthentication(async (req, res) => {
	if (req.method === "PUT") {
		await server.query("UPDATE users SET active = 0 WHERE id = ?", [req.user!.id])
		res.status(200).end()
	}
})
