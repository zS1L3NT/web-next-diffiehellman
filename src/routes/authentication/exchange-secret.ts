import { Request, Response } from "express"
import { useTry } from "no-try"
import { LIST, NUMBER, OBJECT, STRING, validate_express } from "validate-any"
import Server from "../../Server"

/**
 * Generate a diffie hellman secret key for both server and client.
 * This key is meant to encrypt the password on the client with
 * AES-256 so that it can be sent to the server encrypted
 *
 * The Map {@link server.dh_keys} is meant to store the public key mapped
 * to the private key. Now when the encrypted password and the
 * public key is sent to the server, the server has access to the
 * secret key. With the secret key, the server will remove it from
 * the Map {@link server.dh_keys} and decrypt the password.
 */
export default (server: Server) => [
	"post",
	validate_express(
		OBJECT({
			client_key: OBJECT({
				type: STRING("Buffer"),
				data: LIST(NUMBER())
			})
		})
	),
	(req: Request, res: Response) => {
		const client_key = Buffer.from(req.body.client_key.data)

		// @ts-ignore
		const server_dh = crypto.createDiffieHellman("modp15")
		const server_key = server_dh.generateKeys()

		const [err, server_secret] = useTry(() => server_dh.computeSecret(client_key).toString("hex"))
		if (err) {
			return res.status(400).send(err.message)
		}

		server.dh_keys.set(client_key.toString("hex"), server_secret)
		res.status(200).send({ server_key })
	}
]
