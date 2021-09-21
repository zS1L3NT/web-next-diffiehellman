import { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import User from "../models/User"
import { useTry } from "no-try"
import { iQuery } from "../sql"

const config = require("../../config.json")

/**
 * Middleware for checking if a client's request is authenticated
 * Must pass the Bearer token which is a JWT signature containing the id
 * of the signed in user
 * @param query
 */
export default (query: iQuery) =>
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
		const [err, user_id] = useTry(() => jwt.verify(token, config.jwt_secret).user_id as number)
		if (err) {
			return res.status(403).send("Unauthorized user, token was invalid")
		}

		const [user]: [User?] = await query("SELECT * FROM users WHERE id = ?", [user_id])
		if (!user) {
			return res.status(403).send("Unauthorized user, token data was invalid")
		}

		req.user = user
		next()
	}