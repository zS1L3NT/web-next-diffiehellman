import User from "../models/User"

export {}

declare module "next" {
	interface NextApiRequest {
		user?: User
	}
}
