import bcrypt from "bcryptjs"
import { Request, Response } from "express"
import { useTry } from "no-try"
import { NUMBER, OBJECT, OR, STRING, UNDEFINED, validate_express } from "validate-any"
import authenticated from "../../middleware/authenticated"
import User from "../../models/User"
import Server from "../../Server"

/**
 * Update a user's credentials
 * @private
 *
 * If the user wants to update the password, the client_key must
 * also be provided after a key exchange has happened
 */
export default (server: Server) => [
	"put",
	authenticated(server),
	validate_express(
		OBJECT({
			username: OR(STRING(), UNDEFINED()),
			first_name: OR(STRING(), UNDEFINED()),
			last_name: OR(STRING(), UNDEFINED()),
			mobile_number: OR(NUMBER(), UNDEFINED()),
			email: OR(STRING(), UNDEFINED()),
			password: OR(STRING(), UNDEFINED()),
			client_key: OR(STRING(), UNDEFINED())
		})
	),
	async (req: Request, res: Response) => {
		const { password: password_aes, client_key } = req.body as {
			username?: string
			first_name?: string
			last_name?: string
			mobile_number?: number
			email?: string
			password?: string
			client_key?: string
		}

		let send_email = false

		// Lines to add to the SQL query in the form of a string[]
		const sets: string[] = []

		// Values to put in the query array of values
		const values: any[] = []

		for (const [key, value] of Object.entries(req.body)) {
			if (key === "client_key") continue
			sets.push(`${key} = ?`)

			switch (key) {
				case "password":
					const [err, password] = useTry(() => server.decrypt_aes(password_aes!, client_key!))
					if (err) {
						// Could not decrypt password
						return res.status(401).send("Could not decrypt password: " + err.message)
					}

					const password_bcrypt = await bcrypt.hash(password, 10)
					values.push(password_bcrypt)
					break
				case "email":
					send_email = true
					values.push(value)

					// Set user's account to not activated yet, since email changed
					sets.push(`active = ?`)
					values.push(0)

					const [existing_user]: [User?] = await server.query("SELECT * FROM users WHERE email = ?", [value])
					if (existing_user) {
						return res.status(400).send("User with that email address already exists!")
					}
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

		if (send_email) {
			await server.emailer.send_account_activation(user.id, user.email)
		}

		const omitted_user = user as any
		delete omitted_user.password
		delete omitted_user.created_at
		delete omitted_user.updated_at

		res.status(200).send({
			user: omitted_user
		})
	}
]
