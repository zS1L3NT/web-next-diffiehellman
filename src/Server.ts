import crypto from "crypto"
import sql from "mysql2"
import Emailer from "./Emailer"

/**
 * Class containing all server vairables. Since routes are in different
 * files, we need one easy way to have a reference to the same data
 * through the files. Hence this class is required
 */
export default class Server {
	public emailer: Emailer
	public db: sql.Connection
	public dh_keys: Map<string, string>
	public jwt_blacklist: string[]

	public config: any

	public constructor() {
		this.config = require("../config.json")
		this.emailer = new Emailer(this)
		this.db = sql.createConnection(this.config.sql)
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
	public async query(sql: string, values: any = undefined): Promise<any> {
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
	 * Expect clients to have already hit "/accounts/exchange-secret"
	 * to get the server key and made their copy of the secret, allowing the
	 * server to store the secret in {@link cache.dh_keys} as well. After this
	 * request, the secret will be removed from {@link cache.dh_keys} because we
	 * can't store them forever.
	 *
	 * With the secret, we will decrypt the password that is encrypted with AES
	 * and return the original password
	 * @param password_aes
	 * @param client_key
	 * @return {string} Decrypted password
	 */
	public decrypt_aes(password_aes: string, client_key: string) {
		const secret = this.dh_keys.get(client_key)
		if (!secret) {
			throw new Error("Failed to exchange encryption secrets")
		}
		this.dh_keys.delete(client_key)

		// We repeat and cut the key because AES-256 keys need to be 32 bytes long
		const key = secret.repeat(3).slice(0, 32)
		const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.alloc(16, 0))

		let decrypted = decipher.update(Buffer.from(password_aes, "hex"))
		decrypted = Buffer.concat([decrypted, decipher.final()])
		return decrypted.toString()
	}
}
