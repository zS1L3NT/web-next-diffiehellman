import express from "express"
import crypto from "crypto"
import nodemailer from "nodemailer"
import jwt from "jsonwebtoken"
import path from "path"
import fs from "fs"
import { OBJECT, STRING, validate_express } from "validate-any"
import PasswordReset from "../models/PasswordReset"
import User from "../models/User"
import { useTryAsync } from "no-try"
import ServerCache from "../ServerCache"

const config = require("../../config.json")

export default (cache: ServerCache): express.Router => {
	const router = express.Router()

	router.post(
		/**
		 * Send an email to the user's account for resetting the password
		 * @public
		 *
		 * Verifies if the email address is connected to an account, then sends
		 * the email to their inbox. Create a record for the password reset in the database
		 * with the expiry date
		 */
		"/send-email",
		validate_express(
			"body",
			OBJECT({
				email: STRING()
			})
		),
		async (req, res) => {
			const email = req.body.email as string

			const [existing_user]: [User?] = await cache.query("SELECT * FROM users WHERE email = ?", [email])
			if (!existing_user) {
				return res.status(400).send("No account registered with that email address")
			}

			const token = crypto.randomBytes(50).toString("base64").replaceAll(/[+/]/g, "")

			const HTML = fs.readFileSync(path.join(__dirname, "../../email/reset_password.html"), "utf8")
			const [err] = await useTryAsync(() =>
				nodemailer.createTransport(config.smtp).sendMail({
					from: config.smtp.auth.user,
					to: email,
					subject: "[WhatToEat] Password Reset",
					html: HTML.replaceAll("{{link}}", config.host + "/reset_password/" + token)
				})
			)
			if (err) {
				console.log(err)
				return res.status(400).send("Email address entered is invalid")
			}

			await cache.query(
				"INSERT INTO password_resets(user_id, token, expires) VALUES(?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE))",
				[existing_user.id, token]
			)
			res.status(200).end()
		}
	)

	router.post(
		/**
		 * Verify if a password reset token is valid and hasn't expired.
		 * @public
		 *
		 * Deletes the record if it exists to clean up space in the database.
		 * Then signs a JWT token for the user to reset their password. JWT Token
		 * will be valid for 5 minutes
		 */
		"/verify-token",
		validate_express(
			"body",
			OBJECT({
				token: STRING()
			})
		),
		async (req, res) => {
			const token = req.body.token as string

			const [password_reset]: [PasswordReset?] = await cache.query(
				"SELECT * FROM password_resets WHERE token = ?",
				[token]
			)
			if (!password_reset) {
				return res.status(401).send("No token found in database")
			}

			await cache.query("DELETE FROM password_resets WHERE token = ?", [token])

			const expires = new Date(password_reset.expires)
			if (expires.getTime() < Date.now()) {
				return res.status(401).send("Token expired!")
			}

			res.status(200).send({
				token: jwt.sign({ user_id: password_reset.user_id }, config.jwt_secret, { expiresIn: "5m" })
			})
		}
	)

	return router
}
