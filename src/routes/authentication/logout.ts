import { Request, Response } from "express"
import authenticated from "../../middleware/authenticated";
import Server from "../../Server";

/**
 * Log the user out of their account
 * @private
 * 
 * Since deauthenticating a JWT token is not possible, we will
 * add the JWT token to a blacklist, so that the authenticated
 * middleware can reject those tokens if used again after logging
 * out.
 */
export default (server: Server) => [
	"post",
	authenticated(server),
	(req: Request, res: Response) => {
		const token = req.header("authorization")!
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
]