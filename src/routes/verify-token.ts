import { Request, Response } from "express"
import jwt from "jsonwebtoken"
import { OBJECT, STRING, validate_express } from "validate-any"
import Token from "../models/Token"
import Server from "../Server"

/**
 * Verify if a token is valid and hasn't expired.
 * @public
 *
 * Deletes the record if it exists to clean up space in the database.
 * Then signs a JWT token for the user to reset their password. JWT Token
 * will be valid for 5 minutes
 */
export default (server: Server) => [
	"post",
	validate_express(
		OBJECT({
			token: STRING(),
			action: STRING("password-reset", "account-activate")
		})
	),
	async (req: Request, res: Response) => {
		const { token: data, action } = req.body as {
			token: string
			action: "password-reset" | "account-activate"
		}

		const [token]: [Token?] = await server.query("SELECT * FROM tokens WHERE data = ? AND action = ?", [
			data,
			action
		])
		if (!token) {
			return res.status(401).send("No token found in database")
		}

		await server.query("DELETE FROM tokens WHERE data = ?", [data])

		if (token.expires.getTime() < Date.now()) {
			return res.status(401).send("Token expired!")
		}

		res.status(200).send({
			token: jwt.sign({ user_id: token.user_id }, server.config.jwt_secret, { expiresIn: "5m" })
		})
	}
]
