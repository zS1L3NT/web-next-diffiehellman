import crypto from "crypto"
import getKeyRef from "./getKeyRef"

/**
 * !!! RUN ON SERVER
 */
export default async (aesPassword: string, clientKey: string) => {
	const secret = await getKeyRef(clientKey).get()
	if (!secret.exists()) {
		throw new Error("Failed to exchange encryption secrets")
	}

	await getKeyRef(clientKey).remove()

	// We repeat and cut the key because AES-256 keys need to be 32 bytes long
	const key = secret.val().repeat(3).slice(0, 32)
	const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.alloc(16, 0))

	let decrypted = decipher.update(Buffer.from(aesPassword, "hex"))
	decrypted = Buffer.concat([decrypted, decipher.final()])
	return decrypted.toString()
}
