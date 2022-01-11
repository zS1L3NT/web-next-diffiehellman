import axios from "axios"
import encryptAes from "../functions/encryptAes"
import { NextPage } from "next"
import { useEffect } from "react"

const Home: NextPage = () => {
	useEffect(() => {
		;(async () => {
			const password = "this_is_a_password"

			const { aesPassword: encryptedPassword, clientKey } = await encryptAes(password)
			console.log("Encrypted:", encryptedPassword)

			await axios.post("/api/log-password", { aes_password: encryptedPassword, client_key: clientKey })
		})()
	}, [])

	return <></>
}

export default Home
