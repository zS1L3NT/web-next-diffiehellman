import axios from "axios"
import Head from "next/head"
import { NextPage } from "next"
import { useEffect, useState } from "react"
import Link from "next/link"

const Login: NextPage = () => {
	//#region Hooks
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	//#endregion

	//#region Effects
	useEffect(() => {}, [])
	//#endregion

	//#region Functions
	const handleLogin = async () => {
		if (email === "" || password === "") {
			throw new Error("Fill in all fields")
		}

		const { password: password_aes, client_key } = await encrypt_aes(password)
		axios
			.post("/account/login", {
				email,
				password: password_aes,
				client_key
			})
			.then(res => {
				sessionStorage.setItem("token", res.data.token)
				window.location.href = "/restaurants.html"
			})
			.catch(err => {
				console.error(err.response.data)
			})
	}
	//#endregion

	return (
		<>
			<Head>
				<title>Login</title>
				<meta
					name="google-signin-client_id"
					content="274289812310-8eh990gi61io8rlpftj76ne3o74egif8.apps.googleusercontent.com"
				/>
				<script defer src="https://apis.google.com/js/platform.js"></script>
			</Head>
			<div className="g-signin2" data-onsuccess="onGoogleSignIn"></div>
			<input type="email" onChange={e => setEmail(e.target.value)} />
			<input type="password" onChange={e => setPassword(e.target.value)} />
			<button type="button" onClick={handleLogin}>
				Login
			</button>
			<Link href="/password-reset">Forgot Password?</Link>
		</>
	)
}

export default Login
