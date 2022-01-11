import crypto from "crypto"
import getKeyRef from "../../functions/getKeyRef"
import { LIST, NUMBER, OBJECT, withValidBody } from "validate-any"
import { NextApiRequest, NextApiResponse } from "next"
import { useTry } from "no-try"

export default (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === "POST") {
		withValidBody(OBJECT({ client_key_data: LIST(NUMBER()) }), async (req, res) => {
			const clientKey = Buffer.from(req.body.client_key_data)

			// @ts-ignore
			const serverDH = crypto.createDiffieHellman("modp15")
			const serverKeys = serverDH.generateKeys()

			const [err, serverSecret] = useTry(() => serverDH.computeSecret(clientKey).toString("hex"))
			if (err) {
				return res.status(400).send(err.message)
			}

			await getKeyRef(clientKey.toString("hex")).set(serverSecret)

			return res.status(200).send({ server_key_data: serverKeys.toJSON().data })
		})(req, res)
	}
}
