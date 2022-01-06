import cors from "cors"
import express from "express"
import fs from "fs"
import path from "path"
import Server from "./Server"

const PORT = 8000
const app = express()

app.use(cors())
app.use(express.json())

const readRouteFolder = (routeFolder: string) => {
	const folder = path.join(__dirname, "./routes", routeFolder)

	for (const entity of fs.readdirSync(folder)) {
		const [routeFile, method, extension, ...rest] = entity.split(".")
		const routePath = `${routeFolder}/${routeFile}`

		if (!routeFile || (method && !extension) || rest.length) {
			throw new Error(
				`Invalid filename: ${entity}, Must follow naming convention [route].[http method].[extension]`
			)
		}

		if (extension) {
			// Entity is a file
			const handler = require(path.join(folder, entity)).default
			app[method as "get" | "post" | "put" | "delete"](routePath, handler)
		} else {
			readRouteFolder(routePath)
		}
	}
}

readRouteFolder("")

app.listen(8000, () => console.log(`Server running on port ${PORT}`))

export default new Server()
