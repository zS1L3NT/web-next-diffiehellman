import jwt from "jsonwebtoken"
import server from "../app"
import User from "../models/User"
import { Request, Response } from "express"
import { useTry } from "no-try"

/**
 * Middleware for checking if a client's request is authenticated
 * Must pass the Bearer token which is a JWT signature containing the id
 * of the signed in user
 *
 * Does not care if the account is deactivated or not
 *
 * @param query
 */
export default (handler: (req: Request, res: Response) => void) => async (req: Request, res: Response) => {
	const bearer = req.headers.authorization

	if (!bearer) {
		return res.status(403).send("Unauthorized user, no authorization token found")
	}

	const bearerMatch = bearer.match(/^Bearer (.*)$/)
	if (!bearerMatch) {
		return res.status(403).send("Unauthorized user, invalid authorization token")
	}

	const token = bearerMatch[1]!
	// @ts-ignore
	const [err, userId] = useTry(() => jwt.verify(token, server.config.jwt_secret).user_id as number)
	if (err) {
		return res.status(403).send("Unauthorized user, token was invalid")
	}

	if (server.jwt_blacklist.includes(token)) {
		return res.status(403).send("Unauthorized user, authorization token deauthenticated")
	}

	const [user]: [User?] = await server.query("SELECT * FROM users WHERE id = ?", [userId])
	if (!user) {
		return res.status(403).send("Unauthorized user, token data was invalid")
	}

	if (user.active !== null && !user.active) {
		return res.status(403).send("Unauthorized user, account not activated")
	}

	req.user = user
	return handler(req, res)
}
