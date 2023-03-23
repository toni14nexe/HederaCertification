// Import necessary Hedera Hashgraph SDK components and 'dotenv' package
const { 
    Client, 
    PrivateKey, 
    TopicCreateTransaction, 
    TopicMessageSubmitTransaction, 
    Hbar 
} = require("@hashgraph/sdk");
require('dotenv').config();

// Set up max transaction fee
// WARNING: values are in Hbars
const maxTransactionFee = 10

// Accounts set up
const accountPrivateKey = PrivateKey.fromString(process.env.ACCOUNT_1_PRIVATE_KEY)
const accountId = process.env.ACCOUNT_1_ID

// Create a client instance for Hedera Testnet and set deafult max transaction fee
const client = Client.forTestnet()
    .setOperator(accountId, accountPrivateKey)
    .setDefaultMaxTransactionFee(new Hbar(maxTransactionFee))

// Create new topic
async function createTopic() {
    const transactionTopic = await new TopicCreateTransaction().execute(client)
    const receipt = await transactionTopic.getReceipt(client)
    return receipt.topicId.toString()
}

// Send a message to a topic
async function sendMessage(topicId) {

    // Create and submit a new message to topic
    const message = new Date().toISOString();
    const response = await new TopicMessageSubmitTransaction({
        topicId,
        message
    }).execute(client);
    const receipt = await response.getReceipt(client);

    // Print the message
    console.log(`Message: ${message}`);
    return receipt.status.toString()
}

// Main function to create a new topic, send a message to it and print the message to console
async function main() {
    let topicId = await createTopic()
    console.log(`New topic id: ${ topicId }`)

    // If topic link is necessarry
    console.log(`Topic messages: https://hashscan.io/testnet/topic/${ topicId }`)

    await new Promise((res) => setTimeout(res, 5000))
    await sendMessage(topicId)
    process.exit()
}

// Call the main function and catch any errors
main().catch((error) => { 
    console.log(`Error: ${ error }`) 
    process.exit()
})
