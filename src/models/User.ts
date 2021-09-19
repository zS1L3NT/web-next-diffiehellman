export default interface User {
	id: number
	email: string
	username: string
	first_name: string
	last_name: string
	mobile_number: number
	password: string
	deactivated: boolean

	address?: string
	gender?: "M" | "F"
	picture?: string

	created_at: string
	updated_at: string
}