import express from "express"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { LIST, NUMBER, OBJECT, OR, STRING, UNDEFINED, validate_express } from "validate-any"
import { useTry, useTryAsync } from "no-try"
import { iQuery } from "../sql"
import User from "../models/User"
import authenticated from "../middleware/authenticated"
import { OAuth2Client } from "google-auth-library"

const config = require("../../config.json")
const dh_keys: Map<string, string> = new Map()
const jwt_blacklist: string[] = []

export default (query: iQuery): express.Router => {
	const router = express.Router()

	router.post(
		/**
		 * Login to an account
		 * @public
		 *
		 * If the email and passwords match, this will sign a jwt token to return to the
		 * users which expires in an hour
		 */
		"/login",
		validate_express(
			"body",
			OBJECT({
				email: STRING(),
				password: STRING(),
				client_key: STRING()
			})
		),
		async (req, res) => {
			const {
				email,
				password: password_aes,
				client_key
			} = req.body as {
				email: string
				password: string
				client_key: string
			}

			const [existing_user]: [User?] = await query("SELECT * FROM users WHERE email = ?", [email])
			if (!existing_user) {
				return res.status(401).send("User with that email doesn't exist")
			}

			// If user's account is deactivated
			if (existing_user.deactivated) {
				return res.status(403).send("Your account is deactivated")
			}

			const [err, password] = useTry(() => decrypt_aes(password_aes, client_key))
			if (err) {
				// Could not decrypt password
				return res.status(401).send("Could not decrypt password: " + err.message)
			}

			// Password doesn't exist, authenticated with Google
			if (!existing_user.password) {
				return res.status(403).send("Email account used another method to login")
			}

			const passwords_match = await bcrypt.compare(password, existing_user.password)
			if (!passwords_match) {
				return res.status(401).send("Password is not correct")
			}

			const omitted_user = existing_user as any
			delete omitted_user.password
			delete omitted_user.created_at
			delete omitted_user.updated_at

			res.status(200).send({
				token: jwt.sign({ user_id: existing_user.id }, config.jwt_secret, { expiresIn: "1h" }),
				user: omitted_user
			})
		}
	)

	router.post(
		/**
		 * Register for an account
		 * @public
		 *
		 * The account will be created in the database and then will
		 * sign a jwt token to return to the users which expires in an hour
		 */
		"/register",
		validate_express(
			"body",
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
				username: string
				first_name: string
				last_name: string
				mobile_number: number
				email: string
				password: string
				client_key: string
			}

			const [existing_user]: [User?] = await query("SELECT * FROM users WHERE email = ?", [email])
			if (existing_user) {
				return res.status(401).send("User with that email address exists")
			}

			const [err, password] = useTry(() => decrypt_aes(password_aes, client_key))
			if (err) {
				// Could not decrypt password
				return res.status(401).send("Could not decrypt password: " + err.message)
			}
			const password_bcrypt = await bcrypt.hash(password, 10)

			await query(
				"INSERT INTO users(email, username, first_name, last_name, mobile_number, password) VALUES(?, ?, ?, ?, ?, ?)",
				[email, username, first_name, last_name, mobile_number, password_bcrypt]
			)
			const [user]: [User] = await query("SELECT * FROM users WHERE email = ?", [email])

			const omitted_user = user as any
			delete omitted_user.password
			delete omitted_user.created_at
			delete omitted_user.updated_at

			res.status(200).send({
				token: jwt.sign({ user_id: user.id }, config.jwt_secret, { expiresIn: "1h" }),
				user: omitted_user
			})
		}
	)

	router.post(
		/**
		 * Authenticate a user with Google
		 * 
		 * Check's if the Google Authentication ID token is valid first.
		 * If the email is registered already, the user will be logged in to the account.
		 * If not, the user's accuont will be created with the details from the Google
		 * Authentication. Returns a JWT token for usage in the front end
		 */
		"/google-authenticate",
		validate_express(
			"body",
			OBJECT({
				id_token: STRING()
			})
		),
		async (req, res) => {
			const id_token = req.body.id_token as string

			// OAuth2Client to check if ID token of Google Authentication was valid
			const google = new OAuth2Client(config.google)
			const [err, ticket] = await useTryAsync(
				async () =>
					await google.verifyIdToken({
						idToken: id_token,
						audience: config.google
					})
			)
			if (err) {
				return res.status(401).send("Invalid ID Token")
			}

			const { given_name: first_name, family_name: last_name, email, picture } = ticket.getPayload()!

			const [existing_user]: [User?] = await query("SELECT * FROM users WHERE email = ?", [email])
			if (existing_user) {
				if (existing_user.deactivated) {
					return res.status(403).send("Your account is deactivated")
				}

				res.status(200).send({
					token: jwt.sign({ user_id: existing_user.id }, config.jwt_secret, { expiresIn: "1h" })
				})
			} else {
				await query(
					"INSERT INTO users(email, username, first_name, last_name, picture) VALUES(?, ?, ?, ?, ?)",
					[email, email?.split("@")[0], first_name, last_name, picture]
				)

				const [user]: [User] = await query("SELECT * FROM users WHERE email = ?", [email])
				res.status(200).send({
					token: jwt.sign({ user_id: user.id }, config.jwt_secret, { expiresIn: "1h" })
				})
			}
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
		validate_express(
			"body",
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
		async (req, res) => {
			const { password: password_aes, client_key } = req.body as {
				username?: string
				first_name?: string
				last_name?: string
				mobile_number?: number
				email?: string
				password?: string
				client_key?: string
			}

			// Lines to add to the SQL query in the form of a string[]
			const sets: string[] = []

			// Values to put in the query array of values
			const values: any[] = []

			for (const [key, value] of Object.entries(req.body)) {
				if (key === "client_key") continue
				sets.push(`${key} = ?`)

				if (key === "password") {
					const [err, password] = useTry(() => decrypt_aes(password_aes!, client_key!))
					if (err) {
						// Could not decrypt password
						return res.status(401).send("Could not decrypt password: " + err.message)
					}

					const password_bcrypt = await bcrypt.hash(password, 10)
					values.push(password_bcrypt)
				} else {
					values.push(value)
				}
			}

			if (sets.length === 0) {
				return res.status(400).send("Cannot update none of the user's properties")
			}

			await query("UPDATE users SET " + sets.join(", ") + " WHERE id = ?", values.concat(req.user!.id))
			const [user]: [User] = await query("SELECT * FROM users WHERE id = ?", [req.user!.id])

			const omitted_user = user as any
			delete omitted_user.password
			delete omitted_user.created_at
			delete omitted_user.updated_at

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
		 * AES-256 so that it can be sent to the server encrypted
		 *
		 * The Map {@link dh_keys} is meant to store the public key mapped
		 * to the private key. Now when the encrypted password and the
		 * public key is sent to the server, the server has access to the
		 * secret key. With the secret key, the server will remove it from
		 * the Map {@link dh_keys} and decrypt the password.
		 */
		"/exchange-secret",
		validate_express(
			"body",
			OBJECT({
				client_key: OBJECT({
					type: STRING("Buffer"),
					data: LIST(NUMBER())
				})
			})
		),
		(req, res) => {
			const client_key = Buffer.from(req.body.client_key.data)

			// @ts-ignore
			const server_dh = crypto.createDiffieHellman("modp15")
			const server_key = server_dh.generateKeys()

			const [err, server_secret] = useTry(() => server_dh.computeSecret(client_key).toString("hex"))
			if (err) {
				return res.status(400).send(err.message)
			}

			dh_keys.set(client_key.toString("hex"), server_secret)
			res.status(200).send({ server_key })
		}
	)

	return router
}

/**
 * Expect clients to have already hit "/accounts/exchange-secret"
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

	// We repeat and cut the key because AES-256 keys need to be 32 bytes long
	const key = secret.repeat(3).slice(0, 32)
	const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.alloc(16, 0))

	let decrypted = decipher.update(Buffer.from(password_aes, "hex"))
	decrypted = Buffer.concat([decrypted, decipher.final()])
	return decrypted.toString()
}