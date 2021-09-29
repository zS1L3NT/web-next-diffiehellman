import { Request, Response } from "express"
import { OAuth2Client } from "google-auth-library"
import jwt from "jsonwebtoken"
import { useTryAsync } from "no-try"
import { OBJECT, STRING, validate_express } from "validate-any"
import User from "../../models/User"
import Server from "../../Server"

/**
 * Authenticate a user with Google
 * @public
 *
 * Check's if the Google Authentication ID token is valid first.
 * If the email is registered already, the user will be logged in to the account.
 * If not, the user's accuont will be created with the details from the Google
 * Authentication. Returns a JWT token for usage in the front end
 */
export default (server: Server) => [
	"post",
	validate_express(
		OBJECT({
			id_token: STRING()
		})
	),
	async (req: Request, res: Response) => {
		const id_token = req.body.id_token as string

		// OAuth2Client to check if ID token of Google Authentication was valid
		const google = new OAuth2Client(server.config.google)
		const [err, ticket] = await useTryAsync(() =>
			google.verifyIdToken({
				idToken: id_token,
				audience: server.config.google
			})
		)
		if (err) {
			return res.status(401).send("Invalid ID Token")
		}

		const { given_name: first_name, family_name: last_name, email, picture } = ticket.getPayload()!

		const [existing_user]: [User?] = await server.query("SELECT * FROM users WHERE email = ?", [email])
		if (existing_user) {
			// If account not activated, activate it, since this email is garunteed to exist
			if (existing_user.active === null) {
				await server.query("UPDATE users SET active = 1 WHERE email = ?", [email])
			}

			res.status(200).send({
				token: jwt.sign({ user_id: existing_user.id }, server.config.jwt_secret, { expiresIn: "1h" })
			})
		} else {
			await server.query(
				"INSERT INTO users(email, username, first_name, last_name, picture, active) VALUES(?, ?, ?, ?, ?, 1)",
				[email, email?.split("@")[0], first_name, last_name, picture]
			)

			const [user]: [User] = await server.query("SELECT * FROM users WHERE email = ?", [email])
			res.status(200).send({
				token: jwt.sign({ user_id: user.id }, server.config.jwt_secret, { expiresIn: "1h" })
			})
		}
	}
]
