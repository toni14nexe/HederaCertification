// Import necessary Hedera Hashgraph SDK components and 'dotenv' package
const {
    Client,
    CustomFixedFee,
    CustomRoyaltyFee,
    Hbar,
    PrivateKey,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenSupplyType,
    TokenType,
    TransferTransaction,
    AccountBalanceQuery,
} = require('@hashgraph/sdk');
require('dotenv').config();

/**
 * Creates a new NFT token on the Hedera Hashgraph network with the specified parameters.
 * @param {Object} options - Options object for creating a new NFT.
 * @param {string} options.name - The name of the new NFT.
 * @param {string} options.symbol - The symbol of the new NFT.
 * @param {number} [options.decimals=0] - The number of decimal places to use.
 * @param {number} [options.supply=0] - The initial supply of the new NFT.
 * @param {number} [options.maxSupply=5] - The maximum supply of the new NFT.
 * @param {string} options.treasuryId - The account ID that will serve as the token treasury.
 * @param {PrivateKey} options.treasuryPk - The private key for the account that will serve as the token treasury.
 * @param {PrivateKey} options.supplyKey - The private key for the account that will be used to supply new NFTs.
 * @param {string} options.feeCollectorAccountId - The account ID that will collect custom fees for the token.
 * @param {number} [options.fallbackFee=200] - The fallback fee to use if no other fee is specified.
 * @param {Client} client - The Hedera Hashgraph client to use for executing the transaction.
 * @returns {string} The token ID of the newly created NFT.
 */

async function createNewNft({
        name,
        symbol,
        decimals = 0,
        supply = 0,
        maxSupply = 5,
        treasuryId,
        treasuryPk,
        supplyKey,
        feeCollectorAccountId,
        fallbackFee = 200
    }, client) {
        
    const customFee = new CustomRoyaltyFee({
        numerator: 10,
        denominator: 100,
        feeCollectorAccountId,
        fallbackFee: new CustomFixedFee().setHbarAmount(new Hbar(fallbackFee))
    });

    const createNFTTransaction = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(decimals)
        .setInitialSupply(supply)
        .setTreasuryAccountId(treasuryId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(maxSupply)
        .setSupplyKey(supplyKey)
        .setCustomFees([customFee])
        .setMaxTransactionFee(200)
        .freezeWith(client);
  
    // Sign and execute the transaction to create the NFT token
    const createNFTTransactonSign = await createNFTTransaction.sign(treasuryPk);
    const createNftSubmit = await createNFTTransactonSign.execute(client);
    const tokenId = (await createNftSubmit.getReceipt(client)).tokenId;
    console.log(`Created NFT with Token ID: ${tokenId} \n`);
    return tokenId;
}
  

async function mintToken(tokenId, supplyKey, amount = 1, client) {  
    const receipts = [];
  
    for await (const iterator of Array.apply(null, Array(amount)).map((x, i) => i)) {
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from([`NFT ${iterator}`])])
        .freezeWith(client);
  
      const mintTransactionSign = await mintTransaction.sign(supplyKey);
      const mintTxSubmit = await mintTransactionSign.execute(client);
      const mintRx = await mintTxSubmit.getReceipt(client);
  
      console.log(`Created NFT ${tokenId} with serial: ${mintRx.serials[0].low} \n`);
      receipts.push(mintRx);
    }
  
    return receipts;
}
  

async function associateTokenToAccount(tokenId, account, client) {  
    const transaction = await new TokenAssociateTransaction()
      .setAccountId(account.id)
      .setTokenIds([tokenId])
      .freezeWith(client)
      .sign(account.privateKey);
  
    const transactionSubmit = await transaction.execute(client);
    const transactionReceipt = await transactionSubmit.getReceipt(client);
  
    console.log(`NFT association with Account3: ${transactionReceipt.status.toString()}\n`);
  
    return transactionReceipt;
}
  
async function main() {

    // Acounts set up
    const treasuryAccount = {
      id: process.env.ACCOUNT_1_ID,
      privateKey: PrivateKey.fromString(process.env.ACCOUNT_1_PRIVATE_KEY),
    };
    const account2 = {
        id: process.env.ACCOUNT_2_ID,
        privateKey: PrivateKey.fromString(process.env.ACCOUNT_2_PRIVATE_KEY),
    };
    const account3 = {
      id: process.env.ACCOUNT_3_ID,
      privateKey: PrivateKey.fromString(process.env.ACCOUNT_3_PRIVATE_KEY),
    }

    // Generate private key and create NFT
    const supplyKey = PrivateKey.generateED25519();
    const client = Client.forTestnet().setOperator(treasuryAccount.id, treasuryAccount.privateKey);
    const tokenId = await createNewNft({
      name: 'Toni Coin',
      symbol: 'TT',
      decimals: 0,
      supply: 0,
      maxSupply: 5,
      treasuryId: treasuryAccount.id,
      treasuryPk: treasuryAccount.privateKey,
      supplyKey,
      feeCollectorAccountId: account2.id,
      fallbackFee: 200,
    }, client);
  
    // Minting
    const newlyMintedNfts = await mintToken(tokenId, supplyKey, 5, client);
    console.log({ newlyMintedNfts, supplyKey: supplyKey.toStringRaw() })
    await associateTokenToAccount(tokenId, account3, client);
    const tokenTransferTx = await new TransferTransaction()
      .addNftTransfer(tokenId, 2, treasuryAccount.id, account3.id)
      .freezeWith(client)
      .sign(treasuryAccount.privateKey);
  
    const tokenTransferSubmit = await tokenTransferTx.execute(client);
  
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
  
    console.log(`NFT transfer from Treasury to Account3: ${tokenTransferRx.status} \n`);
  
    const treasuryBalance = await new AccountBalanceQuery().setAccountId(treasuryAccount.id).execute(client);
    console.log(`Treasury balance: ${treasuryBalance.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);
  
    const account3Balance = await new AccountBalanceQuery().setAccountId(account3.id).execute(client);
    console.log(`Account3 balance: ${account3Balance.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);
    process.exit()
}
  
// Call the main function and catch any errors
main().catch((error) => { 
    console.log(`Error: ${error}`) 
    process.exit()
})