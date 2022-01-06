import bcrypt from "bcryptjs"
import config from "../../../config.json"
import jwt from "jsonwebtoken"
import server from "../../../server"
import User from "../../../models/User"
import withValidBody from "../../../middleware/withValidBody"
import { OBJECT, STRING } from "validate-any"
import { useTry } from "no-try"

/**
 * Login to an account
 * @public
 *
 * If the email and passwords match, this will sign a jwt token to return to the
 * users which expires in an hour
 */
export default withValidBody(
	OBJECT({
		email: STRING(),
		password: STRING(),
		client_key: STRING()
	}),
	async (req, res) => {
		if (req.method === "POST") {
			const { email, password: password_aes, client_key } = req.body

			const [existing_user]: [User?] = await server.query("SELECT * FROM users WHERE email = ?", [email])
			if (!existing_user) {
				return res.status(401).send("User with that email doesn't exist")
			}

			// If user hasn't activated their account yet
			if (existing_user.active === null) {
				await server.emailer.send_account_activation(existing_user.id, existing_user.email)
				return res
					.status(403)
					.send(
						"Your account has not been activated yet, another email has been send to you for account activation"
					)
			}

			const [err, password] = useTry(() => server.decrypt_aes(password_aes, client_key))
			if (err) {
				// Could not decrypt password
				return res.status(401).send("Could not decrypt password: " + err.message)
			}

			// Password doesn't exist, authenticated with Google
			if (!existing_user.password) {
				return res.status(403).send("Email account used another method to login")
			}

			const passwords_match = await bcrypt.compare(password, existing_user.password)
			if (!passwords_match) {
				return res.status(401).send("Password is not correct")
			}

			const omitted_user = existing_user as any
			delete omitted_user.password
			delete omitted_user.created_at
			delete omitted_user.updated_at

			res.status(200).send({
				token: jwt.sign({ user_id: existing_user.id }, config.jwt_secret, { expiresIn: "1h" }),
				user: omitted_user
			})
		}
	}
)
