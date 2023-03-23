// Import necessary Hedera Hashgraph SDK components and 'dotenv' package
const {
    Client, 
    PrivateKey, 
    AccountCreateTransaction, 
    AccountBalanceQuery
} = require("@hashgraph/sdk")
require('dotenv').config();

// Initialize a constant for the number of accounts to be created
const createAccountsNum = 5
const initialBalance = 500

// Set up myAccountId and myPrivateKey using environment variables
const myAccountId = process.env.MY_ACCOUNT_ID
const myPrivateKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY)

// Verify if environment variables are properly set
if (!myAccountId || !myPrivateKey) {
    throw new Error("Environment variables are missing!")
}

// Create a client instance for Hedera Testnet and set the operator
const client = Client.forTestnet()
client.setOperator(myAccountId, myPrivateKey)

// Creating a new account and display relevant information
async function createAccount(accountNum) {

    // Generate new private and public keys for the account
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey

    // Create and execute a new AccountCreateTransaction with the generated public key and initial balance
    const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        // setInitialBalance(Hbar.fromTinybars(1000)) - for tinybars
        .setInitialBalance(initialBalance)
        .execute(client)

    // Retrieve the new account ID from the transaction receipt
    const getReceipt = await newAccount.getReceipt(client)
    const newAccountId = getReceipt.accountId

    // Verify the account balance
    const accountBalance = await new AccountBalanceQuery()
        .setAccountId(newAccountId)
        .execute(client)

    // Log the newly created account's ID, private key, public key, and balance
    console.log(`Account${ accountNum } ID: ${ newAccountId }`)
    console.log(`Account${ accountNum } private key: ${ newAccountPrivateKey }`)
    console.log(`Account${ accountNum } public key: ${ newAccountPublicKey }`)
    // accountBalance.hbars.toTinybars() - show in tinybars
    console.log(`Account${ accountNum } balance: ${ accountBalance.hbars.toString() } Hbar`)
}

// Loop through - create n accounts, passing the index to createAccount
async function main() {
    for(i = 1; i <= createAccountsNum; i++) {
        
        // Slows down the execution, but prints accounts in order
        await createAccount(i)
    }
    process.exit()
}

// Call the main function and catch any errors
main().catch((error) => { 
    console.log(`Error: ${error}`) 
    process.exit()
})