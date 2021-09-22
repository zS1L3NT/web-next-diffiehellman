import express from "express"
import fs from "fs"
import path from "path"
import Server from "./Server"

const PORT = 8000
const app = express()

const server = new Server()

app.use(express.json())
app.use(express.static(path.join(__dirname, "../public")))
app.use("/bower", express.static(path.join(__dirname, "../bower_components")))

/**
 * Read files from the /routes route dynamically. The route path is determined
 * by the folder path to each file. This function is recursive and will read all
 * files in the /routes path no matter how deeply nested it is
 * 
 * @param route_folder Folder to start from
 */
const read_router_folder = (route_folder: string) => {
	const folder = path.join(__dirname, "./routes", route_folder)
	
	for (const entity of fs.readdirSync(folder)) {
		const [route_file, file_extension] = entity.split(".")
		const route_path = `${route_folder}/${route_file}`

		if (file_extension) {
			// Entity is a file
			const file = require(path.join(folder, entity)).default
			const [method, ...handlers] = file(server) as ["get" | "post" | "put", ...any[]]
			app[method](route_path, ...handlers)
		} else {
			read_router_folder(route_path)
		}
	}
}

read_router_folder("")

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`)
})
