import sql from "mysql"

const config = require("../config.json")

export type iQuery = (sql: string, values?: any) => Promise<any>
export default (): iQuery => {
	const db = sql.createConnection(config.sql)

	db.connect(err => {
		if (err) throw err
		console.log("Connected to MySQL Database")
	})

	return (sql, values = []) =>
		new Promise((resolve, reject) => {
			db.query(sql, values, (error, result) => {
				if (error) {
					reject(error)
				}
				else {
					resolve(result)
				}
			})
		})
}