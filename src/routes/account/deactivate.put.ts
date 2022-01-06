import server from "../../app"
import withAuthentication from "../../middleware/withAuthentication"

/**
 * Deactivate a user's account
 * @private
 */
export default withAuthentication(async (req, res) => {
	await server.query("UPDATE users SET active = 0 WHERE id = ?", [req.user!.id])
	res.status(200).end()
})
