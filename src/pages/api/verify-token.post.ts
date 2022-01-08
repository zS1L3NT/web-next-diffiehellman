import app from "../../app"
import config from "../../config.json"
import jwt from "jsonwebtoken"
import Token from "../../models/Token"
import withValidBody from "../../middleware/withValidBody"
import { OBJECT, STRING } from "validate-any"

/**
 * Verify if a token is valid and hasn't expired.
 * @public
 *
 * Deletes the record if it exists to clean up space in the database.
 * Then signs a JWT token for the user to reset their password. JWT Token
 * will be valid for 5 minutes
 */
export default withValidBody(
	OBJECT({
		token: STRING(),
		action: STRING("password-reset", "account-activate")
	}),
	async (req, res) => {
		const { token: data, action } = req.body

		const [token]: [Token?] = await app.query("SELECT * FROM tokens WHERE data = ? AND action = ?", [data, action])
		if (!token) {
			return res.status(401).send("No token found in database")
		}

		await app.query("DELETE FROM tokens WHERE data = ?", [data])

		if (token.expires.getTime() < Date.now()) {
			return res.status(401).send("Token expired!")
		}

		return res.status(200).send({
			token: jwt.sign({ user_id: token.user_id }, config.jwt_secret, { expiresIn: "5m" })
		})
	}
)
