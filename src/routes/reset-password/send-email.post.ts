import crypto from "crypto"
import { Request, Response } from "express"
import fs from "fs"
import { useTryAsync } from "no-try"
import nodemailer from "nodemailer"
import path from "path"
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

		const token = crypto.randomBytes(50).toString("base64").replaceAll(/[+/]/g, "")

		const HTML = fs.readFileSync(path.join(__dirname, "../../email/reset_password.html"), "utf8")
		const [err] = await useTryAsync(() =>
			nodemailer.createTransport(server.config.smtp).sendMail({
				from: server.config.smtp.auth.user,
				to: email,
				subject: "[WhatToEat] Password Reset",
				html: HTML.replaceAll("{{link}}", server.config.host + "/reset_password/" + token)
			})
		)
		if (err) {
			console.log(err)
			return res.status(400).send("Email address entered is invalid")
		}

		await server.query(
			"INSERT INTO password_resets(user_id, token, expires) VALUES(?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE))",
			[existing_user.id, token]
		)
		res.status(200).end()
	}
]
