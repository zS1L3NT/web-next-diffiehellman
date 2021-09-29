import { Request, Response } from "express"
import authenticated from "../../middleware/authenticated"
import Server from "../../Server"

/**
 * Deactivate a user's account
 * @private
 */
export default (server: Server) => [
	"put",
	authenticated(server),
	async (req: Request, res: Response) => {
		await server.query("UPDATE users SET active = 0 WHERE id = ?", [req.user!.id])
		res.status(200).end()
	}
]
