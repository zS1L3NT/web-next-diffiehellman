import server from "../../../server"
import User from "../../../models/User"
import withValidBody from "../../../middleware/withValidBody"
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
		if (req.method === "POST") {
			const email = req.body.email

			const [existing_user]: [User?] = await server.query("SELECT * FROM users WHERE email = ?", [email])
			if (!existing_user) {
				return res.status(400).send("No account registered with that email address")
			}

			const [err] = await useTryAsync(() => server.emailer.send_password_reset(existing_user.id, email))
			if (err) {
				console.log(err)
				return res.status(400).send("Email address entered is invalid")
			}

			res.status(200).end()
		}
	}
)
