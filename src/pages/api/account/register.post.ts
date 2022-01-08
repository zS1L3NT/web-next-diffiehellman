import app from "../../../app"
import bcrypt from "bcryptjs"
import config from "../../../config.json"
import jwt from "jsonwebtoken"
import User from "../../../models/User"
import withValidBody from "../../../middleware/withValidBody"
import { NUMBER, OBJECT, STRING } from "validate-any"
import { useTry } from "no-try"

/**
 * Register for an account
 * @public
 *
 * The account will be created in the database and then will
 * sign a jwt token to return to the users which expires in an hour
 */
export default withValidBody(
	OBJECT({
		username: STRING(),
		first_name: STRING(),
		last_name: STRING(),
		mobile_number: NUMBER(),
		email: STRING(),
		aes_password: STRING(),
		client_key: STRING()
	}),
	async (req, res) => {
		const { username, first_name, last_name, mobile_number, email, aes_password, client_key } = req.body

		const [existingUser]: [User?] = await app.query("SELECT * FROM users WHERE email = ?", [email])
		if (existingUser) {
			return res.status(401).send("User with that email address exists")
		}

		const [err, password] = useTry(() => app.decryptAes(aes_password, client_key))
		if (err) {
			// Could not decrypt password
			return res.status(401).send("Could not decrypt password: " + err.message)
		}
		const bcryptPassword = await bcrypt.hash(password, 10)

		await app.query(
			"INSERT INTO users(email, username, first_name, last_name, mobile_number, password) VALUES(?, ?, ?, ?, ?, ?)",
			[email, username, first_name, last_name, mobile_number, bcryptPassword]
		)
		const [user]: [User] = await app.query("SELECT * FROM users WHERE email = ?", [email])

		await app.mailer.sendAccountActivation(user.id, user.email)

		return res.status(200).send({
			token: jwt.sign({ user_id: user.id }, config.jwt_secret, { expiresIn: "1h" }),
			user: Object.fromEntries(
				Object.entries(user).filter(entry => ["password", "created_at", "updated_at"].includes(entry[0]!))
			)
		})
	}
)
