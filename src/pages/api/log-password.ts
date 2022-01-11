import decryptAes from "../../functions/decryptAes"
import { NextApiRequest, NextApiResponse } from "next"
import { OBJECT, STRING, withValidBody } from "validate-any"

export default (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "POST") {
		withValidBody(
			OBJECT({
				aes_password: STRING(),
				client_key: STRING()
			}),
			async (req, res) => {
				const { aes_password, client_key } = req.body

				const decryptedPassword = await decryptAes(aes_password, client_key)
				console.log("Decrypted:", decryptedPassword)
				res.send({})
			}
		)(req, res)
	}
}
