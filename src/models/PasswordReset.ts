export default interface PasswordReset {
	id: number
	user_id: number
	token: string
	expires: string
}