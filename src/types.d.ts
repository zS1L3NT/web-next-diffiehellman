import User from "./models/User"

declare module "next" {
	interface NextApiRequest {
		user?: User
	}
}
