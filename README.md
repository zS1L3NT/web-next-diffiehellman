# web-next-diffiehellman

![License](https://img.shields.io/github/license/zS1L3NT/web-next-diffiehellman?style=for-the-badge) ![Languages](https://img.shields.io/github/languages/count/zS1L3NT/web-next-diffiehellman?style=for-the-badge) ![Top Language](https://img.shields.io/github/languages/top/zS1L3NT/web-next-diffiehellman?style=for-the-badge) ![Commit Activity](https://img.shields.io/github/commit-activity/y/zS1L3NT/web-next-diffiehellman?style=for-the-badge) ![Last commit](https://img.shields.io/github/last-commit/zS1L3NT/web-next-diffiehellman?style=for-the-badge)

Implementation of using the diffie hellman key exchange to send a password to a server encrypted.
Uses Diffie Hellman key exchange and AES-256 for data encryption

## Why Diffie Hellman and AES-256

DiffieHellman key exchange is used to allow the client and server to attain a matching key without sending them over the internet, encrypted or not.
This matching key can be used as a Secret for an encryption method, to allow the password to be sent over the internet to the server.
This example used AES-256 as an encryption method but other encryption methods can also be used

Using this method,

1. The Password is not sent in plaintext over the internet
2. The Password is encrypted
3. The Password's encryption secret is not sent in plaintext over the internet
4. The Password's secret is almost impossible to figure out with just DiffieHellman public keys

## How it works

### Step 1 - Client Creates Keys

The Client will first create their own set of private and public keys.

### Step 2 - Server Creates Keys

The Client will make a POST request to `/api/exchange-secrets` with the Client Public Key.
The Server will then create it's own set of private and public keys.

### Step 3 - Server Stores Private Key in RealtimeDB

Because we need a unique instance of the Final Key for each request,
the Server will store the Server Private Key on Firebase RealtimeDB.
The Key will be the Client Public Key and the Value will be the Server Private Key.
This way, the Server will know what the Server Secret Key is for every Client Public Key.
The Server should return back it's Server Public Key.

### Step 4 - Client Encrypts the Password

Using the Server Public Key, the Client will generate the Final Key.
The Client will then use the Final Key to encrypt the password.
The Client will make a POST request to `/api/log-password` with the AES Encrypted Password and the Client Public Key.

### Step 5 - Server Decrypts the Password

Using the Client Public Key, the Server will generate the Final Key.
The Server will then fetch the Server Secret Key from Firebase RealtimeDB with the Client Public Key.
The Server will then delete the record in Firebase RealtimeDB as a cleanup measure.
The Server will then use the Final Key to decrypt the password.

## Usage

Copy the `config.example.json` file to `config.json` then fill in the json file with the correct project credentials.

With `yarn`

```
$ yarn
$ yarn dev
```

With `npm`

```
$ npm i
$ npm run dev
```

## Built with

-   TypeScript
    -   [![@types/node](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/dev/@types/node?style=flat-square)](https://npmjs.com/package/@types/node)
    -   [![@types/react](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/dev/@types/react?style=flat-square)](https://npmjs.com/package/@types/react)
    -   [![typescript](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/dev/typescript?style=flat-square)](https://npmjs.com/package/typescript)
-   NextJS
    -   [![next](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/next?style=flat-square)](https://npmjs.com/package/next)
    -   [![react](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/react?style=flat-square)](https://npmjs.com/package/react)
    -   [![react-dom](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/react-dom?style=flat-square)](https://npmjs.com/package/react-dom)
-   Miscellaneous
    -   [![axios](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/axios?style=flat-square)](https://npmjs.com/package/axios)
    -   [![firebase-admin](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/firebase-admin?style=flat-square)](https://npmjs.com/package/firebase-admin)
    -   [![no-try](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/no-try?style=flat-square)](https://npmjs.com/package/no-try)
    -   [![validate-any](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/web-next-diffiehellman/validate-any?style=flat-square)](https://npmjs.com/package/validate-any)
