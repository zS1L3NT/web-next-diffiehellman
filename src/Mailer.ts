import nodemailer from "nodemailer"
import crypto from "crypto"
import path from "path"
import fs from "fs"
import server from "./server"

export default class Mailer {
	private transporter: nodemailer.Transporter

	public constructor() {
		this.transporter = nodemailer.createTransport(server.config.smtp)
	}

	public async send_account_activation(user_id: number, email: string) {
		const token = crypto.randomBytes(50).toString("base64").replaceAll(/[+/]/g, "")
		const HTML = fs.readFileSync(path.join(__dirname, "../email/account-activate.html"), "utf8")
		await this.transporter.sendMail({
			from: server.config.smtp.auth.user,
			to: email,
			subject: "[WhatToEat] Activate your Account",
			html: HTML.replaceAll("{{link}}", server.config.host + "/account-activate.html?token=" + token)
		})
		await server.query(
			"INSERT INTO tokens(user_id, data, action, expires) VALUES(?, ?, 'account-activate', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE))",
			[user_id, token]
		)
	}

	public async send_password_reset(user_id: number, email: string) {
		const token = crypto.randomBytes(50).toString("base64").replaceAll(/[+/]/g, "")
		const HTML = fs.readFileSync(path.join(__dirname, "../email/password-reset.html"), "utf8")
		await this.transporter.sendMail({
			from: server.config.smtp.auth.user,
			to: email,
			subject: "[WhatToEat] Reset your Password",
			html: HTML.replaceAll("{{link}}", server.config.host + "/password-reset.html?token=" + token)
		})
		await server.query(
			"INSERT INTO tokens(user_id, data, action, expires) VALUES(?, ?, 'password-reset', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE))",
			[user_id, token]
		)
	}
}
