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
	async (req: Request, res: Response, next: NextFunction) => {
		const bearer = req.header("authorization")

		if (!bearer) {
			return res.status(403).send("Unauthorized user")
		}

		const bearerMatch = bearer.match(/^Bearer (.*)$/)
		if (!bearerMatch) {
			return res.status(403).send("Unauthorized user")
		}

		const token = bearerMatch[1]
		// @ts-ignore
		const [err, user_id] = useTry(() => jwt.verify(token, config.jwt_secret).user_id as number)
		if (err) {
			return res.status(403).send("Unauthorized user")
		}

		const [user]: [User?] = await query("SELECT * FROM users WHERE id = ?", [user_id])
		if (!user) {
			return res.status(403).send("Unauthorized user")
		}

		req.user = user
		next()
	}