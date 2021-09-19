import express from "express"
import path from "path"
import accounts from "./routers/accounts"
import reset_password from "./routers/reset_password"
import sql_connect from "./sql"

const PORT = 8000
const app = express()

/**
 * {@link sql_connect} returned back a function which allows the server
 * to pass an sql query and data needed to be bound to the query into
 * the default connection.query(). Instead of doing the queries like how
 * it should be done by default, I made the query function awaitable so
 * that my code is easier to write, without needing to experience
 * callback hell.
 */
const query = sql_connect()

app.use(express.json())
app.use(express.static(path.join(__dirname, "../public")))
app.use("/bower", express.static(path.join(__dirname, "../bower_components")))
app.use("/accounts", accounts(query))
app.use("/reset-password", reset_password(query))

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`)
})