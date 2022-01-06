import bcrypt from "bcryptjs"
import config from "../../config.json"
import jwt from "jsonwebtoken"
import server from "../../app"
import User from "../../models/User"
import withValidBody from "../../middleware/withValidBody"
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
		aes_password: STRING(),
		client_key: STRING()
	}),
	async (req, res) => {
		const { email, aes_password, client_key } = req.body

		const [existingUser]: [User?] = await server.query("SELECT * FROM users WHERE email = ?", [email])
		if (!existingUser) {
			return res.status(401).send("User with that email doesn't exist")
		}

		// If user hasn't activated their account yet
		if (existingUser.active === null) {
			await server.mailer.sendAccountActivation(existingUser.id, existingUser.email)
			return res
				.status(403)
				.send(
					"Your account has not been activated yet, another email has been send to you for account activation"
				)
		}

		const [err, password] = useTry(() => server.decryptAes(aes_password, client_key))
		if (err) {
			// Could not decrypt password
			return res.status(401).send("Could not decrypt password: " + err.message)
		}

		// Password doesn't exist, authenticated with Google
		if (!existingUser.password) {
			return res.status(403).send("Email account used another method to login")
		}

		const passwordsMatch = await bcrypt.compare(password, existingUser.password)
		if (!passwordsMatch) {
			return res.status(401).send("Password is not correct")
		}

		return res.status(200).send({
			token: jwt.sign({ user_id: existingUser.id }, config.jwt_secret, { expiresIn: "1h" }),
			user: Object.fromEntries(
				Object.entries(existingUser).filter(entry =>
					["password", "created_at", "updated_at"].includes(entry[0]!)
				)
			)
		})
	}
)
