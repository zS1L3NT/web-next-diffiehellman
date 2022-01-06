import Validator from "validate-any/build/classes/Validator"
import { Request, Response } from "express"
import { validate } from "validate-any"

export interface RequestWithBody<T extends {}> extends Omit<Request, "body"> {
	body: T
}

export default <T>(validator: Validator<T>, handler: (req: RequestWithBody<T>, res: Response) => void) => {
	return (req: Request, res: Response) => {
		const { success, errors, data } = validate(req.body, validator)

		if (success) {
			req.body = data!
			handler(req, res)
		} else {
			res.status(400).send({ errors })
		}
	}
}
