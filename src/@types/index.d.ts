import User from "../models/User"

export { }

declare global {
	namespace Express {
		interface Request {
			user?: User
		}
	}
}
