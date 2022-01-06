import server from "../../app"
import User from "../../models/User"
import withValidBody from "../../middleware/withValidBody"
import { OBJECT, STRING } from "validate-any"
import { useTryAsync } from "no-try"

/**
 * Send an email to the user's account for resetting the password
 * @public
 *
 * Verifies if the email address is connected to an account, then sends
 * the email to their inbox. Create a record for the password reset in the database
 * with the expiry date
 */
export default withValidBody(
	OBJECT({
		email: STRING()
	}),
	async (req, res) => {
		const email = req.body.email

		const [existingUser]: [User?] = await server.query("SELECT * FROM users WHERE email = ?", [email])
		if (!existingUser) {
			return res.status(400).send("No account registered with that email address")
		}

		const [err] = await useTryAsync(() => server.mailer.sendPasswordReset(existingUser.id, email))
		if (err) {
			console.log(err)
			return res.status(400).send("Email address entered is invalid")
		}

		return res.status(200).end()
	}
)
