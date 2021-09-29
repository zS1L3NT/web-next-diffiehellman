import { Request, Response } from "express"
import { useTryAsync } from "no-try"
import { OBJECT, STRING, validate_express } from "validate-any"
import User from "../../models/User"
import Server from "../../Server"

/**
 * Send an email to the user's account for resetting the password
 * @public
 *
 * Verifies if the email address is connected to an account, then sends
 * the email to their inbox. Create a record for the password reset in the database
 * with the expiry date
 */
export default (server: Server) => [
	"post",
	validate_express(
		OBJECT({
			email: STRING()
		})
	),
	async (req: Request, res: Response) => {
		const email = req.body.email as string

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
]
