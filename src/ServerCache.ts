import sql from "mysql"

const config = require("../config.json")

/**
 * Class containing all server vairables. Since routes are in different
 * files, we need one easy way to have a reference to the same data
 * through the files. Hence this class is required
 */
export default class ServerCache {
	private db: sql.Connection
	public dh_keys: Map<string, string>
	public jwt_blacklist: string[]

	public constructor() {
		this.dh_keys = new Map<string, string>()
		this.jwt_blacklist = []
		this.db = sql.createConnection(config.sql)

		this.db.connect(err => {
			if (err) throw err
			console.log("Connected to MySQL Database")
		})
	}

	public async query(sql: string, values: any = undefined): Promise<any> {
		return new Promise((resolve, reject) => {
			this.db.query(sql, values, (error, result) => {
				if (error) {
					reject(error)
				} else {
					resolve(result)
				}
			})
		})
	}
}
