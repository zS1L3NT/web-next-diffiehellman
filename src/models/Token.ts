export default interface Token {
	id: number
	user_id: number
	data: string
	action: "password-reset" | "account-activate"
	expires: Date
}
