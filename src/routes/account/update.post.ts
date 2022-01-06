import bcrypt from "bcryptjs"
import server from "../../app"
import User from "../../models/User"
import withAuthentication from "../../middleware/withAuthentication"
import withValidBody from "../../middleware/withValidBody"
import { NUMBER, OBJECT, OR, STRING, UNDEFINED } from "validate-any"
import { useTry } from "no-try"

/**
 * Update a user's credentials
 * @private
 *
 * If the user wants to update the password, the client_key must
 * also be provided after a key exchange has happened
 */
export default withAuthentication(
	withValidBody(
		OBJECT({
			username: OR(STRING(), UNDEFINED()),
			first_name: OR(STRING(), UNDEFINED()),
			last_name: OR(STRING(), UNDEFINED()),
			mobile_number: OR(NUMBER(), UNDEFINED()),
			email: OR(STRING(), UNDEFINED()),
			aes_password: OR(STRING(), UNDEFINED()),
			client_key: OR(STRING(), UNDEFINED())
		}),
		async (req, res) => {
			const { aes_password, client_key } = req.body

			let willSendEmail = false

			// Lines to add to the SQL query in the form of a string[]
			const sets: string[] = []

			// Values to put in the query array of values
			const values: any[] = []

			for (const [key, value] of Object.entries(req.body)) {
				if (key === "client_key") continue
				sets.push(`${key} = ?`)

				switch (key) {
					case "password":
						const [err, password] = useTry(() => server.decryptAes(aes_password!, client_key!))
						if (err) {
							// Could not decrypt password
							return res.status(401).send("Could not decrypt password: " + err.message)
						}

						const bcryptPassword = await bcrypt.hash(password, 10)
						values.push(bcryptPassword)
						break
					case "email":
						willSendEmail = true
						values.push(value)

						// Set user's account to not activated yet, since email changed
						sets.push(`active = ?`)
						values.push(0)

						const [existingUser]: [User?] = await server.query("SELECT * FROM users WHERE email = ?", [
							value
						])
						if (existingUser) {
							return res.status(400).send("User with that email address already exists!")
						}
						break
					default:
						values.push(value)
						break
				}
			}

			if (sets.length === 0) {
				return res.status(400).send("Cannot update none of the user's properties")
			}

			await server.query("UPDATE users SET " + sets.join(", ") + " WHERE id = ?", values.concat(req.user!.id))
			const [user]: [User] = await server.query("SELECT * FROM users WHERE id = ?", [req.user!.id])

			if (willSendEmail) {
				await server.mailer.sendAccountActivation(user.id, user.email)
			}

			return res.status(200).send({
				user: Object.fromEntries(
					Object.entries(user).filter(entry => ["password", "created_at", "updated_at"].includes(entry[0]!))
				)
			})
		}
	)
)
