export default interface User {
	id: string
	username: string
	first_name: string
	last_name: string
	mobile_number: number
	email: string
	password: string
	deactivated: boolean

	address?: string
	gender?: "M" | "F"
	picture?: string

	created_at: string
	updated_at: string
}