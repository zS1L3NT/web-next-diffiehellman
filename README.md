# web-next-diffiehellman

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
