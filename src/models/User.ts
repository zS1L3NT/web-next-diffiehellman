export default interface User {
	id: number
	email: string
	username: string
	first_name: string
	last_name: string

	active?: boolean
	password?: string
	mobile_number?: number
	address?: string
	gender?: "M" | "F"
	picture?: string
}
