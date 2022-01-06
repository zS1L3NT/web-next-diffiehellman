import config from "./config.json"
import crypto from "crypto"
import fs from "fs"
import nodemailer from "nodemailer"
import path from "path"
import server from "./app"

export default class Mailer {
	private transporter: nodemailer.Transporter

	public constructor() {
		this.transporter = nodemailer.createTransport(config.smtp)
	}

	public async sendAccountActivation(userId: number, email: string) {
		const token = crypto.randomBytes(50).toString("base64").replaceAll(/[+/]/g, "")
		const HTML = fs.readFileSync(path.join(__dirname, "../email/account-activate.html"), "utf8")
		await this.transporter.sendMail({
			from: config.smtp.auth.user,
			to: email,
			subject: "[WhatToEat] Activate your Account",
			html: HTML.replaceAll("{{link}}", config.host + "/account-activate.html?token=" + token)
		})
		await server.query(
			"INSERT INTO tokens(user_id, data, action, expires) VALUES(?, ?, 'account-activate', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE))",
			[userId, token]
		)
	}

	public async sendPasswordReset(userId: number, email: string) {
		const token = crypto.randomBytes(50).toString("base64").replaceAll(/[+/]/g, "")
		const HTML = fs.readFileSync(path.join(__dirname, "../email/password-reset.html"), "utf8")
		await this.transporter.sendMail({
			from: config.smtp.auth.user,
			to: email,
			subject: "[WhatToEat] Reset your Password",
			html: HTML.replaceAll("{{link}}", config.host + "/password-reset.html?token=" + token)
		})
		await server.query(
			"INSERT INTO tokens(user_id, data, action, expires) VALUES(?, ?, 'password-reset', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE))",
			[userId, token]
		)
	}
}
