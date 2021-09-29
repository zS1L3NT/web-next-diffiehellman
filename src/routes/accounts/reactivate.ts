import { Request, Response } from "express"
import authenticated from "../../middleware/authenticated"
import Server from "../../Server"

/**
 * Reactivate a user's account
 * @private
 */
export default (server: Server) => [
	"put",
	authenticated(server),
	async (req: Request, res: Response) => {
		await server.query("UPDATE users SET active = 1 WHERE id = ?", [req.user!.id])
		res.status(200).end()
	}
]
