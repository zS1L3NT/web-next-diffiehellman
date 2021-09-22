import bcrypt from "bcryptjs"
import { Request, Response } from "express"
import jwt from "jsonwebtoken"
import { useTry } from "no-try"
import { NUMBER, OBJECT, STRING, validate_express } from "validate-any"
import User from "../../models/User"
import Server from "../../Server"

/**
 * Register for an account
 * @public
 *
 * The account will be created in the database and then will
 * sign a jwt token to return to the users which expires in an hour
 */
export default (server: Server) => [
	"post",
	validate_express(
		OBJECT({
			username: STRING(),
			first_name: STRING(),
			last_name: STRING(),
			mobile_number: NUMBER(),
			email: STRING(),
			password: STRING(),
			client_key: STRING()
		})
	),
	async (req: Request, res: Response) => {
		const {
			username,
			first_name,
			last_name,
			mobile_number,
			email,
			password: password_aes,
			client_key
		} = req.body as {
			username: string
			first_name: string
			last_name: string
			mobile_number: number
			email: string
			password: string
			client_key: string
		}

		const [existing_user]: [User?] = await server.query("SELECT * FROM users WHERE email = ?", [email])
		if (existing_user) {
			return res.status(401).send("User with that email address exists")
		}

		const [err, password] = useTry(() => server.decrypt_aes(password_aes, client_key))
		if (err) {
			// Could not decrypt password
			return res.status(401).send("Could not decrypt password: " + err.message)
		}
		const password_bcrypt = await bcrypt.hash(password, 10)

		await server.query(
			"INSERT INTO users(email, username, first_name, last_name, mobile_number, password) VALUES(?, ?, ?, ?, ?, ?)",
			[email, username, first_name, last_name, mobile_number, password_bcrypt]
		)
		const [user]: [User] = await server.query("SELECT * FROM users WHERE email = ?", [email])

		const omitted_user = user as any
		delete omitted_user.password
		delete omitted_user.created_at
		delete omitted_user.updated_at

		res.status(200).send({
			token: jwt.sign({ user_id: user.id }, server.config.jwt_secret, { expiresIn: "1h" }),
			user: omitted_user
		})
	}
]
