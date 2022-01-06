export default interface User {
	id: number
	email: string
	username: string
	first_name: string
	last_name: string

	active: boolean | null
	password: string | null
	mobile_number: number | null
	address: string | null
	gender: "M" | "F" | null
	picture: string | null
}
