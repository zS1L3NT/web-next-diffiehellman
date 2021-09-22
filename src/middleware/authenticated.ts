import { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { useTry } from "no-try"
import User from "../models/User"
import Server from "../Server"

/**
 * Middleware for checking if a client's request is authenticated
 * Must pass the Bearer token which is a JWT signature containing the id
 * of the signed in user
 * @param query
 */
export default (server: Server) =>
	async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
		const bearer = req.header("authorization")

		if (!bearer) {
			return res.status(403).send("Unauthorized user, no authorization token found")
		}

		const bearerMatch = bearer.match(/^Bearer (.*)$/)
		if (!bearerMatch) {
			return res.status(403).send("Unauthorized user, invalid authorization token")
		}

		const token = bearerMatch[1]
		// @ts-ignore
		const [err, user_id] = useTry(() => jwt.verify(token, server.config.jwt_secret).user_id as number)
		if (err) {
			return res.status(403).send("Unauthorized user, token was invalid")
		}

		if (server.jwt_blacklist.includes(token)) {
			return res.status(403).send("Unauthorized user, authorization token deauthenticated")
		}

		const [user]: [User?] = await server.query("SELECT * FROM users WHERE id = ?", [user_id])
		if (!user) {
			return res.status(403).send("Unauthorized user, token data was invalid")
		}

		req.user = user
		next()
	}
