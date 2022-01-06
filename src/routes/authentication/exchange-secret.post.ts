import crypto from "crypto"
import server from "../../app"
import withValidBody from "../../middleware/withValidBody"
import { LIST, NUMBER, OBJECT, STRING } from "validate-any"
import { useTry } from "no-try"

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
export default withValidBody(
	OBJECT({
		client_key: OBJECT({
			type: STRING("Buffer"),
			data: LIST(NUMBER())
		})
	}),
	async (req, res) => {
		const clientKey = Buffer.from(req.body.client_key.data)

		// @ts-ignore
		const serverDH = crypto.createDiffieHellman("modp15")
		const serverKeys = serverDH.generateKeys()

		const [err, serverSecret] = useTry(() => serverDH.computeSecret(clientKey).toString("hex"))
		if (err) {
			return res.status(400).send(err.message)
		}

		server.dh_keys.set(clientKey.toString("hex"), serverSecret)
		return res.status(200).send({ server_key: serverKeys })
	}
)
