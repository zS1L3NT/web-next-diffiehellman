import Validator from "validate-any/build/classes/Validator"
import { NextApiRequest, NextApiResponse } from "next"
import { validate } from "validate-any"

export interface NextApiRequestWithBody<T extends {}> extends Omit<NextApiRequest, "body"> {
	body: T
}

export default <T>(
	validator: Validator<T>,
	handler: (req: NextApiRequestWithBody<T>, res: NextApiResponse) => void
) => {
	return (req: NextApiRequest, res: NextApiResponse) => {
		const { success, errors, data } = validate(req.body, validator)

		if (success) {
			req.body = data!
			handler(req, res)
		} else {
			res.status(400).send({ errors })
		}
	}
}
