import config from "./config.json"
import crypto from "crypto"
import fs from "fs"
import nodemailer from "nodemailer"
import path from "path"
import sql from "mysql2"

class Mailer {
	private transporter: nodemailer.Transporter

	public constructor(private server: Server) {
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
		await this.server.query(
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
		await this.server.query(
			"INSERT INTO tokens(user_id, data, action, expires) VALUES(?, ?, 'password-reset', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE))",
			[userId, token]
		)
	}
}

/**
 * Class containing all server vairables. Since routes are in different
 * files, we need one easy way to have a reference to the same data
 * through the files. Hence this class is required
 */
class Server {
	public mailer: Mailer
	public db: sql.Connection
	public dh_keys: Map<string, string>
	public jwt_blacklist: string[]

	public constructor() {
		this.mailer = new Mailer(this)
		this.db = sql.createConnection(config.sql)
		this.dh_keys = new Map<string, string>()
		this.jwt_blacklist = []

		this.db.connect(err => {
			if (err) throw err
			console.log("Connected to MySQL Database")
		})
	}

	/**
	 * Function which allows the server to pass an sql query and data needed
	 * to be bound to the query into the default connection.query(). Instead
	 * of doing the queries like how it should be done by default with callbacks,
	 * I made the query function awaitable so that my code is easier to write,
	 * without needing to experience callback hell.
	 *
	 * @param sql SQL query
	 * @param values Values to bind to the query
	 * @return {Promise<any>} Query promise
	 */
	public async query(sql: string, values: any[] = []): Promise<any> {
		return new Promise((resolve, reject) => {
			this.db.query(sql, values, (error, result) => {
				if (error) {
					reject(error)
				} else {
					resolve(result)
				}
			})
		})
	}

	/**
	 * Expect clients to have already hit "/account/exchange-secret"
	 * to get the server key and made their copy of the secret, allowing the
	 * server to store the secret in {@link cache.dh_keys} as well. After this
	 * request, the secret will be removed from {@link cache.dh_keys} because we
	 * can't store them forever.
	 *
	 * With the secret, we will decrypt the password that is encrypted with AES
	 * and return the original password
	 * @param aesPassword
	 * @param clientKey
	 * @return {string} Decrypted password
	 */
	public decryptAes(aesPassword: string, clientKey: string) {
		const secret = this.dh_keys.get(clientKey)
		if (!secret) {
			throw new Error("Failed to exchange encryption secrets")
		}
		this.dh_keys.delete(clientKey)

		// We repeat and cut the key because AES-256 keys need to be 32 bytes long
		const key = secret.repeat(3).slice(0, 32)
		const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.alloc(16, 0))

		let decrypted = decipher.update(Buffer.from(aesPassword, "hex"))
		decrypted = Buffer.concat([decrypted, decipher.final()])
		return decrypted.toString()
	}
}

export default new Server()
