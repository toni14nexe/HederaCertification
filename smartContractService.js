// Import necessary Hedera Hashgraph SDK components and 'dotenv' package
const {
    Client,
    Hbar,
    ContractCreateFlow,
    ContractExecuteTransaction,
    ContractFunctionParameters,
} = require("@hashgraph/sdk");
require('dotenv').config();
  
// Parameters set up
// WARNING: values are in Hbars
const defaultMaxTransactionFee = 100
const gasValue = 100_000

// Accounts set up
const privateKey1 = process.env.ACCOUNT_1_PRIVATE_KEY;
const accountId1 = process.env.ACCOUNT_1_ID;

// Verify if environment variables are properly set
if (!privateKey1 || !accountId1) {
    throw new Error("Environment variables are missing!")
}

// Create a client instance for Hedera Testnet and set the default max transaction fee
const client = Client.forTestnet();
client.setOperator(accountId1, privateKey1);
client.setDefaultMaxTransactionFee(new Hbar(defaultMaxTransactionFee));

// Smart contract details
const contractJson = require("./CertificationC1.json");

// Deploy contract function
async function deployContract() {
    const contractTransaction = await new ContractCreateFlow()
        .setBytecode(contractJson.bytecode)
        .setGas(gasValue)
        .execute(client);

    const contractId = (await contractTransaction.getReceipt(client)).contractId;
    return contractId
}
  
// Interact with function 1
async function function1(contractId) {
    const transaction = await new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100_000)
      .setFunction("function1", new ContractFunctionParameters().addUint16(4).addUint16(3))
      .execute(client);
  
    let record = await transaction.getRecord(client);
  
    return Buffer.from((record).contractFunctionResult.bytes).toJSON().data.at(-1)
}
  
// Interact with function 2
async function function2(contractId, n) {
    const tx = await new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100_000)
      .setFunction("function2", new ContractFunctionParameters().addUint16(n))
      .execute(client);
  
    return Buffer.from((await tx.getRecord(client)).contractFunctionResult.bytes).toJSON().data.at(-1)
}
  
// Main function
async function main() {
    let contractId = await deployContract();
    let function1Result = await function1(contractId);
    let function2Result = await function2(contractId, function1Result);
    console.log(function2Result)
  
    process.exit()
}
  
// Call the main function and catch any errors
main().catch((error) => { 
    console.log(`Error: ${error}`) 
    process.exit()
})
  