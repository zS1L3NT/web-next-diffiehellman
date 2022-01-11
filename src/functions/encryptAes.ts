import axios from "axios"
import crypto from "crypto"

/**
 * !!! RUN ON CLIENT
 */
export default async (password: string) => {
	// @ts-ignore
	const clientDh = crypto.createDiffieHellman("modp15")
	const clientKey = clientDh.generateKeys()

	const res = await axios.post("/api/exchange-secret", {
		client_key_data: clientKey.toJSON().data
	})

	const serverKey = Buffer.from(res.data.server_key_data)
	const clientSecret = clientDh.computeSecret(serverKey).toString("hex")

	// We repeat and cut the key because AES-256 keys need to be 32 bytes long
	const key = clientSecret.repeat(3).slice(0, 32)

	const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), Buffer.alloc(16, 0))
	let encrypted = cipher.update(password)
	encrypted = Buffer.concat([encrypted, cipher.final()])
	const aesPassword = encrypted.toString("hex")

	return {
		aesPassword,
		clientKey: clientKey.toString("hex")
	}
}
