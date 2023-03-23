// Import necessary Hedera Hashgraph SDK components and 'dotenv' package
const {
    TransferTransaction,
    Transaction,
    Client,
    ScheduleCreateTransaction,
    PrivateKey,
    Hbar
} = require("@hashgraph/sdk")
require('dotenv').config();

// Set transaction amount in tinybars
const transactionAmount = 10

// Accounts set up
const operatorId = process.env.MY_ACCOUNT_ID
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY)
const senderAccountId = process.env.ACCOUNT_1_ID;
const senderPrivateKey = PrivateKey.fromString(process.env.ACCOUNT_1_PRIVATE_KEY)
const recipientAccountId = process.env.ACCOUNT_2_ID;

// Verify if environment variables are properly set
if (!operatorId || !operatorKey || !senderAccountId || !senderPrivateKey || !recipientAccountId) {
        throw new Error("Environment variables error!")
}

// Create a client instance for Hedera Testnet and set the operator
const client = Client.forTestnet()
client.setOperator(operatorId, operatorKey)

// Create a scheduled transaction and return its base64 encoded version
async function createScheduleTransaction() {

    // Create a transaction to move Hbars between two accounts
    const transaction = new TransferTransaction()
        .addHbarTransfer(senderAccountId, Hbar.fromTinybars(transactionAmount))
        .addHbarTransfer(recipientAccountId, Hbar.fromTinybars(transactionAmount))

    // Create and freeze a scheduled transaction using the transfer transaction
    const scheduleTransaction = await new ScheduleCreateTransaction()
        .setScheduledTransaction(transaction)
        .setAdminKey(senderPrivateKey)
        .freezeWith(client)
        .toBytes()

    // Convert the scheduled transaction to base64 format and log the output
    const transaction64 = Buffer.from(scheduleTransaction).toString('base64');
    console.log(`64 base transaction encoded: ${ transaction64 }`) 
    return transaction64
}

// Deserialize the base64 encoded transaction using the account1 private key
async function deserializeTransaction(transaction64){
    const transaction = await Transaction.fromBytes(Buffer.from(transaction64, 'base64'))
    .sign(senderPrivateKey)
    await transaction.execute(client)

    // Log transaction ID
    console.log(`\nTransaction: ${transaction.transactionId}`)
}

// Main function to create and execute a scheduled transaction
async function main() {
    const transaction64 = await createScheduleTransaction();
    await deserializeTransaction(transaction64);
    process.exit()
}

// Call the main function and catch any errors
main().catch((error) => { 
    console.log(`Error: ${error}`) 
    process.exit()
})