var axios
var encrypt_aes

define(["axios", "encrypt-aes"], (axios_, encrypt_aes_) => {
	[axios, encrypt_aes] = [axios_, encrypt_aes_]
})