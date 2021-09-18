import express from "express"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { LIST, NUMBER, OBJECT, OR, STRING, UNDEFINED, validate_express } from "validate-any"
import { useTry, useTryAsync } from "no-try"
import { iQuery } from "../sql"
import User from "../models/User"
import authenticated from "../middleware/authenticated"

const config = require("../../config.json")
const dh_keys: Map<string, string> = new Map()

export default (query: iQuery) => {
	const router = express.Router()

	router.post(
		/**
		 * Login to an account
		 * @public
		 *
		 * If the username and passwords match, this will sign a jwt token to return to the
		 * users which expires in an hour
		 */
		"/login",
		validate_express("body", OBJECT({
			username: STRING(),
			password: STRING(),
			client_key: STRING()
		})),
		async (req, res) => {
			const {
				username,
				password: password_aes,
				client_key
			} = req.body as {
				username: string,
				password: string,
				client_key: string
			}

			const [existing_user]: [User?] = await query("SELECT * FROM users WHERE username = ?", [username])
			if (!existing_user) {
				return res.status(401).send("User with that username doesn't exist")
			}

			// If user's account is deactivated
			if (existing_user.deactivated) {
				return res.status(403).send("Your account is deactivated")
			}

			const [err, password] = useTry(() => decrypt_aes(password_aes, client_key))
			if (err) {
				return res.status(401).send(err.message)
			}

			const passwords_match = await bcrypt.compare(password, existing_user.password)
			if (!passwords_match) {
				return res.status(401).send("Password is not correct")
			}

			const token = jwt.sign({ user_id: existing_user.id }, config.jwt_secret)
			const {
				password: _,
				created_at,
				updated_at,
				...omitted_user
			} = existing_user

			res.status(200).send({
				token,
				user: omitted_user
			})
		})

	router.post(
		/**
		 * Register for an account
		 * @public
		 *
		 * The account will be created in the database and then will
		 * sign a jwt token to return to the users which expires in an hour
		 */
		"/register",
		validate_express("body", OBJECT({
			username: STRING(),
			first_name: STRING(),
			last_name: STRING(),
			mobile_number: NUMBER(),
			email: STRING(),
			password: STRING(),
			client_key: STRING()
		})),
		async (req, res) => {
			const {
				username,
				first_name,
				last_name,
				mobile_number,
				email,
				password: password_aes,
				client_key
			} = req.body as {
				username: string,
				first_name: string,
				last_name: string,
				mobile_number: number,
				email: string,
				password: string,
				client_key: string
			}

			const [existing_user]: [User?] = await query("SELECT * FROM users WHERE username = ?", [username])
			if (existing_user) {
				return res.status(401).send("User with that username exists")
			}

			const [err, password] = useTry(() => decrypt_aes(password_aes, client_key))
			if (err) {
				return res.status(401).send(err.message)
			}
			const password_bcrypt = await bcrypt.hash(password, 10)

			await query(
				"INSERT INTO users(username, first_name, last_name, mobile_number, email, password) VALUES(?, ?, ?, ?, ?, ?)",
				[username, first_name, last_name, mobile_number, email, password_bcrypt]
			)
			const [user]: [User] = await query("SELECT * FROM users WHERE username = ?", [username])

			const token = jwt.sign({ user_id: user.id }, config.jwt_secret)
			const {
				password: _,
				created_at,
				updated_at,
				...omitted_user
			} = user

			res.status(200).send({
				token,
				user: omitted_user
			})
		}
	)

	router.put(
		/**
		 * Update a user's credentials
		 * @private
		 *
		 * If the user wants to update the password, the client_key must
		 * also be provided after a key exchange has happened
		 */
		"/update",
		authenticated(query),
		validate_express("body", OBJECT({
			username: OR(STRING(), UNDEFINED()),
			first_name: OR(STRING(), UNDEFINED()),
			last_name: OR(STRING(), UNDEFINED()),
			mobile_number: OR(NUMBER(), UNDEFINED()),
			email: OR(STRING(), UNDEFINED()),
			password: OR(STRING(), UNDEFINED()),
			client_key: OR(STRING(), UNDEFINED()),
		})),
		async (req, res) => {
			const {
				password: password_aes,
				client_key
			} = req.body as {
				username?: string
				first_name?: string
				last_name?: string
				mobile_number?: number
				email?: string
				password?: string
				client_key?: string
			}

			const sets: string[] = []
			const values: any[] = []
			for (const [key, value] of Object.entries(req.body)) {
				if (key === "client_key") continue
				sets.push(`${key} = ?`)

				if (key === "password") {
					const [err, password] = useTry(() => decrypt_aes(password_aes!, client_key!))
					if (err) {
						return res.status(401).send(err.message)
					}

					const password_bcrypt = await bcrypt.hash(password, 10)
					values.push(password_bcrypt)
				} else {
					values.push(value)
				}
			}

			if (sets.length === 0) {
				return res.status(400).send("Cannot update nothing none of the user's properties")
			}

			await query("UPDATE users SET " + sets.join(", ") + " WHERE id = ?", values.concat(req.user!.id))
			const [user]: [User] = await query("SELECT * FROM users WHERE id = ?", [req.user!.id])

			const {
				password: _,
				created_at,
				updated_at,
				...omitted_user
			} = user

			res.status(200).send({
				user: omitted_user
			})
		}
	)

	router.put(
		/**
		 * Deactivate a user's account
		 * @private
		 */
		"/deactivate",
		authenticated(query),
		async (req, res) => {
			await query("UPDATE users SET deactivated = 1 WHERE id = ?", [req.user!.id])
			res.status(200).end()
		}
	)

	router.put(
		/**
		 * Reactivate a user's account
		 * @private
		 */
		"/reactivate",
		authenticated(query),
		async (req, res) => {
			await query("UPDATE users SET deactivated = 0 WHERE id = ?", [req.user!.id])
			res.status(200).end()
		}
	)

	router.put(
		/**
		 * Generate a diffie hellman secret key for both server and client.
		 * This key is meant to encrypt the password on the client with
		 * AES256 so that it can be sent to the server encrypted
		 *
		 * The Map {@link dh_keys} is meant to store the public key mapped
		 * to the private key. Now when the encrypted password and the
		 * public key is sent to the server, the server has access to the
		 * secret key. With the secret key, the server will remove it from
		 * the Map {@link dh_keys} and decrypt the password.
		 */
		"/exchange_secret",
		validate_express("body", OBJECT({
			client_key: OBJECT({
				type: STRING("Buffer"),
				data: LIST(NUMBER())
			})
		})),
		(req, res) => {
			const client_key = Buffer.from(req.body.client_key.data)

			// @ts-ignore
			const server_dh = crypto.createDiffieHellman("modp15")
			const server_key = server_dh.generateKeys()

			const [err, server_secret] = useTry(() => server_dh.computeSecret(client_key).toString("hex"))
			if (err) {
				return res.status(400).send(err.message)
			}

			console.log(server_secret)
			dh_keys.set(client_key.toString("hex"), server_secret)
			res.status(200).send({ server_key })
		}
	)

	return router
}

/**
 * Expect clients to have already hit "/accounts/exchange_secret"
 * to get the server key and made their copy of the secret, allowing the
 * server to store the secret in {@link dh_keys} as well. After this
 * request, the secret will be removed from {@link dh_keys} because we
 * can't store them forever.
 *
 * With the secret, we will decrypt the password that is encrypted with AES
 * and return the original password
 * @param password_aes
 * @param client_key
 */
const decrypt_aes = (password_aes: string, client_key: string): string => {
	const secret = dh_keys.get(client_key)
	if (!secret) {
		throw new Error("Failed to exchange encryption secrets")
	}
	dh_keys.delete(client_key)

	// We repeat and cut the key because AES256 keys need to be 32 bytes long
	const key = secret.repeat(3).slice(0, 32)
	const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.alloc(16, 0))

	let decrypted = decipher.update(Buffer.from(password_aes, "hex"))
	decrypted = Buffer.concat([decrypted, decipher.final()])
	return decrypted.toString()
}