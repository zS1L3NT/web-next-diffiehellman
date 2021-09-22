import { Request, Response } from "express"
import jwt from "jsonwebtoken"
import { OBJECT, STRING, validate_express } from "validate-any"
import PasswordReset from "../../models/PasswordReset"
import Server from "../../Server"

/**
 * Verify if a password reset token is valid and hasn't expired.
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
			token: STRING()
		})
	),
	async (req: Request, res: Response) => {
		const token = req.body.token as string

		const [password_reset]: [PasswordReset?] = await server.query("SELECT * FROM password_resets WHERE token = ?", [
			token
		])
		if (!password_reset) {
			return res.status(401).send("No token found in database")
		}

		await server.query("DELETE FROM password_resets WHERE token = ?", [token])

		const expires = new Date(password_reset.expires)
		if (expires.getTime() < Date.now()) {
			return res.status(401).send("Token expired!")
		}

		res.status(200).send({
			token: jwt.sign({ user_id: password_reset.user_id }, server.config.jwt_secret, { expiresIn: "5m" })
		})
	}
]
