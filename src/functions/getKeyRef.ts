import admin from "firebase-admin"
import config from "../config.json"
import { useTry } from "no-try"

useTry(() => {
	admin.initializeApp({
		credential: admin.credential.cert(config.firebase.service_account),
		databaseURL: config.firebase.database_url
	})
})

/**
 * !!! RUN ON SERVER
 */
export default (key: string) => {
	return admin.database().ref("web-next-diffiehellman/" + key)
}
