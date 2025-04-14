const { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram
} = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddress, 
  createSyncNativeInstruction,
  NATIVE_MINT,
  createMintToInstruction
} = require('@solana/spl-token');
const fs = require('fs');
const { 
  Liquidity, 
  LIQUIDITY_STATE_LAYOUT_V4,
  Token,
  TokenAmount,
  Percent
} = require('@raydium-io/raydium-sdk');
const BN = require('bn.js');

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const CUSTOM_TOKEN_ADDRESS = new PublicKey('9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22');
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('7ZbHwsNJCPeFCMisykL1Davm7eygVFoi5yx9pDaGbTsg');
const AMM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

// Extra Account Meta PDA (tạo với cùng seeds như trong program)
const [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('extra-account-metas'), CUSTOM_TOKEN_ADDRESS.toBuffer()],
  TRANSFER_HOOK_PROGRAM_ID
);

// Log Tracker PDA
const [logTrackerPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('log-tracker'), CUSTOM_TOKEN_ADDRESS.toBuffer()],
  TRANSFER_HOOK_PROGRAM_ID
);

const getWallet = () => {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json')));
  return Keypair.fromSecretKey(secretKey);
};

async function createRaydiumPool() {
  console.log("=== FORCED RAYDIUM POOL CREATION ===");
  console.log("Cố gắng tạo pool Raydium với token-2022 transfer hook...");
  
  const wallet = getWallet();
  console.log("Wallet address:", wallet.publicKey.toString());
  
  // 1. Set up token information
  const baseTokenInfo = {
    mint: CUSTOM_TOKEN_ADDRESS,
    decimals: 9,
    programId: TOKEN_2022_PROGRAM_ID
  };
  
  const quoteTokenInfo = {
    mint: NATIVE_MINT,
    decimals: 9,
    programId: TOKEN_PROGRAM_ID
  };
  
  // 2. Check token balances
  const baseTokenAccount = await getAssociatedTokenAddress(
    baseTokenInfo.mint,
    wallet.publicKey,
    false,
    baseTokenInfo.programId
  );
  
  console.log("Checking token balances...");
  const baseTokenAccountInfo = await connection.getParsedAccountInfo(baseTokenAccount);
  if (!baseTokenAccountInfo.value) {
    console.error("Token account not found. Please make sure you have tokens.");
    return null;
  }
  
  const baseTokenAmount = baseTokenAccountInfo.value.data.parsed.info.tokenAmount.uiAmount;
  console.log(`Base token balance: ${baseTokenAmount}`);
  
  if (baseTokenAmount < 100) {
    console.warn("Low token balance. Recommended to have at least 100 tokens for pool creation.");
  }
  
  // 3. Generate pool keypairs
  console.log("Generating keypairs for pool creation...");
  const ammKeypair = Keypair.generate();
  const poolKeypair = Keypair.generate();
  const lpMintKeypair = Keypair.generate();
  
  console.log(`AMM ID: ${ammKeypair.publicKey.toString()}`);
  console.log(`Pool ID: ${poolKeypair.publicKey.toString()}`);
  console.log(`LP Mint: ${lpMintKeypair.publicKey.toString()}`);
  
  // 4. Calculate authority PDA
  const [authority] = await PublicKey.findProgramAddress(
    [ammKeypair.publicKey.toBuffer()],
    AMM_PROGRAM_ID
  );
  console.log(`Authority: ${authority.toString()}`);
  
  // 5. Create vault accounts for base and quote tokens
  const baseVault = await getAssociatedTokenAddress(
    baseTokenInfo.mint,
    authority,
    true,
    baseTokenInfo.programId
  );
  
  const quoteVault = await getAssociatedTokenAddress(
    quoteTokenInfo.mint,
    authority,
    true,
    quoteTokenInfo.programId
  );
  
  console.log(`Base vault: ${baseVault.toString()}`);
  console.log(`Quote vault: ${quoteVault.toString()}`);
  
  // 6. Create additional keypairs for market accounts
  const marketId = Keypair.generate();
  const marketAuthority = Keypair.generate(); 
  const marketBaseVault = Keypair.generate();
  const marketQuoteVault = Keypair.generate();
  const marketBids = Keypair.generate();
  const marketAsks = Keypair.generate();
  const marketEventQueue = Keypair.generate();
  
  // 7. Build pool keys
  const poolKeys = {
    id: ammKeypair.publicKey,
    baseMint: baseTokenInfo.mint,
    quoteMint: quoteTokenInfo.mint,
    lpMint: lpMintKeypair.publicKey,
    baseVault: baseVault,
    quoteVault: quoteVault,
    authority: authority,
    openOrders: poolKeypair.publicKey,
    targetOrders: Keypair.generate().publicKey,
    withdrawQueue: Keypair.generate().publicKey,
    lpVault: await getAssociatedTokenAddress(lpMintKeypair.publicKey, authority, true),
    marketProgramId: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
    marketId: marketId.publicKey,
    marketAuthority: PublicKey.default,
    marketBaseVault: marketBaseVault.publicKey,
    marketQuoteVault: marketQuoteVault.publicKey,
    marketBids: marketBids.publicKey,
    marketAsks: marketAsks.publicKey,
    marketEventQueue: marketEventQueue.publicKey,
    programId: AMM_PROGRAM_ID
  };
  
  // 8. Prepare liquidity amounts
  const baseAmount = new BN(50 * 10**baseTokenInfo.decimals); // 50 tokens
  const quoteAmount = new BN(0.1 * 10**quoteTokenInfo.decimals); // 0.1 SOL
  
  console.log(`Adding liquidity: ${baseAmount.toString() / 10**baseTokenInfo.decimals} base tokens and ${quoteAmount.toString() / 10**quoteTokenInfo.decimals} SOL`);
  
  try {
    // 9. Create instructions for pool creation
    console.log("Preparing pool creation transaction...");
    
    // Increase compute budget for transfer hook
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_400_000
    });
    
    // Start building the transaction manually
    const transaction = new Transaction().add(computeBudgetIx);
    
    // Add necessary space allocation and creation instructions
    
    // Fund the AMM account
    const createAmmAccountIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: ammKeypair.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(LIQUIDITY_STATE_LAYOUT_V4.span),
      space: LIQUIDITY_STATE_LAYOUT_V4.span,
      programId: AMM_PROGRAM_ID
    });
    transaction.add(createAmmAccountIx);
    
    // Add create open orders account instruction
    const createPoolAccountIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: poolKeypair.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(3228), // approximate size
      space: 3228,
      programId: AMM_PROGRAM_ID
    });
    transaction.add(createPoolAccountIx);
    
    // Add create LP mint instruction
    // This would require more detailed implementation
    // Simplified for now
    
    // Initialize AMM instruction 
    // This would require detailed construction based on Raydium's ABI
    // Simplified for this demonstration
    
    // 10. Add extra accounts for transfer hook if needed
    // For any token transfers involved, we'd need to add extra accounts
    
    // 11. Send and confirm transaction
    console.log("Attempting to send transaction...");
    console.log("NOTE: This is experimental and may fail due to Raydium's specific requirements");
    console.log("If it fails, consider using SPL token-swap program as suggested in the research report");
    
    const signers = [wallet, ammKeypair, poolKeypair, lpMintKeypair];
    
    try {
      const txid = await sendAndConfirmTransaction(
        connection,
        transaction,
        signers,
        {
          commitment: 'confirmed',
          skipPreflight: true // Skip simulation to force it through
        }
      );
      
      console.log("Transaction successful!");
      console.log("Transaction ID:", txid);
      console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
      
      return poolKeys;
    } catch (error) {
      console.error("Transaction failed:", error.message);
      console.log("The error is expected since Raydium pools have specific requirements");
      console.log("Alternative: Use SPL token-swap program and modify it to support Token-2022");
      
      return null;
    }
  } catch (error) {
    console.error("Error preparing pool creation:", error);
    return null;
  }
}

async function addLiquidityToPool(poolKeys) {
  if (!poolKeys) {
    console.log("No pool keys available, skipping liquidity addition");
    return false;
  }
  
  console.log("Adding liquidity to pool...");
  // Implementation would be similar to pool creation, requiring specific Raydium instructions
  
  return false; // Simplified for demo
}

async function main() {
  try {
    console.log("=== TRYING TO CREATE RAYDIUM POOL WITH TOKEN-2022 TRANSFER HOOK ===");
    
    // 1. Create pool
    const poolKeys = await createRaydiumPool();
    
    // 2. Add liquidity if pool creation succeeded
    if (poolKeys) {
      const liquidityAdded = await addLiquidityToPool(poolKeys);
      if (liquidityAdded) {
        console.log("Successfully added liquidity to pool!");
      }
    }
    
    // 3. Show alternative approaches if unsuccessful
    if (!poolKeys) {
      console.log("\n=== ALTERNATIVE APPROACHES ===");
      console.log("1. Use SPL token-swap program and modify it for Token-2022");
      console.log("2. Create a custom AMM specifically for Token-2022 with transfer hooks");
      console.log("3. Wait for official Raydium/Orca support for Token-2022 transfer hooks");
    }
    
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

main(); 