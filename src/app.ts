import express from "express"
import path from "path"
import accounts from "./routers/accounts"
import reset_password from "./routers/reset_password"
import ServerCache from "./ServerCache"

const PORT = 8000
const app = express()

const cache = new ServerCache()

app.use(express.json())
app.use(express.static(path.join(__dirname, "../public")))
app.use("/bower", express.static(path.join(__dirname, "../bower_components")))
app.use("/accounts", accounts(cache))
app.use("/reset-password", reset_password(cache))

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`)
})
