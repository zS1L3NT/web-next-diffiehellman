import app from "../../../app"
import config from "../../../config.json"
import jwt from "jsonwebtoken"
import User from "../../../models/User"
import withValidBody from "../../../middleware/withValidBody"
import { OAuth2Client } from "google-auth-library"
import { OBJECT, STRING } from "validate-any"
import { useTryAsync } from "no-try"

/**
 * Authenticate a user with Google
 * @public
 *
 * Check's if the Google Authentication ID token is valid first.
 * If the email is registered already, the user will be logged in to the account.
 * If not, the user's accuont will be created with the details from the Google
 * Authentication. Returns a JWT token for usage in the front end
 */
export default withValidBody(
	OBJECT({
		id_token: STRING()
	}),
	async (req, res) => {
		const idToken = req.body.id_token as string

		// OAuth2Client to check if ID token of Google Authentication was valid
		const google = new OAuth2Client(config.google)
		const [err, ticket] = await useTryAsync(() =>
			google.verifyIdToken({
				idToken: idToken,
				audience: config.google
			})
		)
		if (err) {
			return res.status(401).send("Invalid ID Token")
		}

		const { given_name: firstName, family_name: lastName, email, picture } = ticket.getPayload()!

		const [existingUser]: [User?] = await app.query("SELECT * FROM users WHERE email = ?", [email])
		if (existingUser) {
			// If account not activated, activate it, since this email is garunteed to exist
			if (existingUser.active === null) {
				await app.query("UPDATE users SET active = 1 WHERE email = ?", [email])
			}

			return res.status(200).send({
				token: jwt.sign({ user_id: existingUser.id }, config.jwt_secret, { expiresIn: "1h" })
			})
		} else {
			await app.query(
				"INSERT INTO users(email, username, first_name, last_name, picture, active) VALUES(?, ?, ?, ?, ?, 1)",
				[email, email?.split("@")[0], firstName, lastName, picture]
			)

			const [user]: [User] = await app.query("SELECT * FROM users WHERE email = ?", [email])
			return res.status(200).send({
				token: jwt.sign({ user_id: user.id }, config.jwt_secret, { expiresIn: "1h" })
			})
		}
	}
)
