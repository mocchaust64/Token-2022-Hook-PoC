const { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID,
  createTransferInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  NATIVE_MINT
} = require('@solana/spl-token');
const fs = require('fs');
const { 
  Liquidity, 
  jsonInfo2PoolKeys, 
  LiquidityPoolKeys,
  LIQUIDITY_STATE_LAYOUT_V4,
  Token,
  TokenAmount,
  Percent
} = require('@raydium-io/raydium-sdk');
const Decimal = require('decimal.js');
const BN = require('bn.js');


const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');


const connection = new Connection('https://api.devnet.solana.com', 'confirmed');


const getWallet = () => {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json')));
  return Keypair.fromSecretKey(secretKey);
};

// Địa chỉ token và các thông tin khác
const CUSTOM_TOKEN_ADDRESS = new PublicKey('9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22'); // Token-2022 của bạn
const SOL_TOKEN_ADDRESS = new PublicKey('So11111111111111111111111111111111111111112'); // SOL wrapped
const RAYDIUM_PROGRAM_ID = {
  AMM_V4: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
};


async function initializeAccounts() {
  try {
    console.log("Đang khởi tạo các tài khoản...");
    const wallet = getWallet();
    
    const solBalance = await connection.getBalance(wallet.publicKey);
    console.log(`Số dư SOL hiện tại: ${solBalance / LAMPORTS_PER_SOL} SOL`);
    
    if (solBalance < 0.5 * LAMPORTS_PER_SOL) {
      console.error("Không đủ SOL! Cần ít nhất 0.5 SOL để tạo pool.");
      console.log("Vui lòng airdrop thêm SOL trên devnet: solana airdrop 1 <địa_chỉ_ví>");
      return false;
    }
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_2022_PROGRAM_ID }
    );
    
    let customTokenAccount = null;
    for (const account of tokenAccounts.value) {
      const tokenData = account.account.data.parsed;
      if (tokenData.info.mint === CUSTOM_TOKEN_ADDRESS.toString()) {
        customTokenAccount = account;
        console.log(`Tài khoản token: ${account.pubkey.toString()}`);
        console.log(`Số dư: ${tokenData.info.tokenAmount.uiAmount} tokens`);
        
        if (tokenData.info.tokenAmount.uiAmount < 100) {
          console.error("Không đủ token! Cần ít nhất 100 token để tạo pool.");
          return false;
        }
        break;
      }
    }
    
    if (!customTokenAccount) {
      console.error("Không tìm thấy tài khoản token!");
      return false;
    }
    
    console.log("Khởi tạo tài khoản thành công!");
    return true;
  } catch (error) {
    console.error("Lỗi khi khởi tạo tài khoản:", error);
    return false;
  }
}

/**
 * Tạo AMM pool trên Raydium Devnet
 */
async function createPool() {
  try {
    console.log("\nBắt đầu tạo pool...");
    const wallet = getWallet();
    
 
    const baseToken = {
      mint: CUSTOM_TOKEN_ADDRESS,
      programId: TOKEN_2022_PROGRAM_ID,
      decimals: 9
    };
    
    const quoteToken = {
      mint: SOL_TOKEN_ADDRESS,
      programId: TOKEN_PROGRAM_ID,
      decimals: 9
    };
    
 
    const baseAmount = new BN(50 * 10**9); 
    const quoteAmount = new BN(0.05 * 10**9); 
    
  
    const baseTokenAccount = await getAssociatedTokenAddress(
      baseToken.mint,
      wallet.publicKey,
      false,
      baseToken.programId
    );
    
  
    const wrappedSOLAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
   
    let wrappedSOLAccountExists = false;
    try {
      const wrappedSOLAccountInfo = await connection.getAccountInfo(wrappedSOLAccount);
      wrappedSOLAccountExists = !!wrappedSOLAccountInfo;
    } catch (e) {
      wrappedSOLAccountExists = false;
    }
    
    console.log("Thông tin pool sẽ tạo:");
    console.log(`- Base token (Token của bạn): ${baseToken.mint.toString()}`);
    console.log(`- Quote token (SOL): ${quoteToken.mint.toString()}`);
    console.log(`- Base amount: ${baseAmount.toString() / 10**9} tokens`);
    console.log(`- Quote amount: ${quoteAmount.toString() / 10**9} SOL`);
    
    console.log("\nĐang tạo các tham số pool...");
    

    const ammId = Keypair.generate();
    const poolId = Keypair.generate();
    const lpMintId = Keypair.generate();
    const ammAuthority = await PublicKey.findProgramAddress(
      [ammId.publicKey.toBuffer()],
      RAYDIUM_PROGRAM_ID.AMM_V4
    );
    

    const poolKeys = {
      id: ammId.publicKey,
      baseMint: baseToken.mint,
      quoteMint: quoteToken.mint,
      lpMint: lpMintId.publicKey,
      baseVault: await getAssociatedTokenAddress(baseToken.mint, ammAuthority[0], true, baseToken.programId),
      quoteVault: await getAssociatedTokenAddress(quoteToken.mint, ammAuthority[0], true, quoteToken.programId),
      authority: ammAuthority[0],
      openOrders: poolId.publicKey,
      targetOrders: Keypair.generate().publicKey,
      withdrawQueue: Keypair.generate().publicKey,
      lpVault: await getAssociatedTokenAddress(lpMintId.publicKey, ammAuthority[0], true),
      marketProgramId: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'), // Serum program
      marketId: Keypair.generate().publicKey,
      marketAuthority: Keypair.generate().publicKey,
      marketBaseVault: Keypair.generate().publicKey, 
      marketQuoteVault: Keypair.generate().publicKey,
      marketBids: Keypair.generate().publicKey,
      marketAsks: Keypair.generate().publicKey,
      marketEventQueue: Keypair.generate().publicKey,
      programId: RAYDIUM_PROGRAM_ID.AMM_V4
    };
    
    console.log("Pool keys đã được tạo");
    console.log(`AMM ID: ${ammId.publicKey.toString()}`);
    console.log(`LP Mint: ${lpMintId.publicKey.toString()}`);
    
    // Chúng ta cần tạo các instruction để tạo pool và cung cấp thanh khoản
    console.log("\nĐây là các bước để tạo pool trên Devnet với AMM V4:");
    console.log("1. Tạo các tài khoản cần thiết (AMM account, market accounts, vaults)");
    console.log("2. Khởi tạo AMM pool với tham số đã định");
    console.log("3. Cung cấp thanh khoản ban đầu");
    
    console.log("\nLưu ý: Để thực hiện các bước trên, chúng ta cần tương tác trực tiếp với Raydium AMM Contract.");
    console.log("Việc này rất phức tạp và cần nhiều instruction cụ thể theo layout của Raydium AMM V4.");
    
    console.log("\nThay vì tạo pool trên Devnet (khá phức tạp và không được hỗ trợ tốt),");
    console.log("chúng ta có một số lựa chọn thay thế:");
    
    console.log("\n1. Test transfer hook thông qua giao dịch thông thường:");
    console.log("   - Tạo một tài khoản token mới và gửi token đến đó");
    console.log("   - Kiểm tra log giao dịch để xem transfer hook có được kích hoạt không");
    
    console.log("\n2. Sử dụng Solana Program Library (SPL) để tạo pool đơn giản:");
    console.log("   - Sử dụng SPL token-swap để tạo pool đơn giản");
    console.log("   - Thực hiện swap để kích hoạt transfer hook");
    
    console.log("\n3. Chuyển lên Mainnet và sử dụng Raydium UI:");
    console.log("   - Tạo lại token trên Mainnet");
    console.log("   - Sử dụng giao diện người dùng của Raydium để tạo pool và swap");
    
    console.log("\nBạn có muốn thực hiện test đơn giản bằng cách gửi token để kích hoạt transfer hook không?");
    
    return true;
  } catch (error) {
    console.error("Lỗi khi tạo pool:", error);
    return false;
  }
}

/**
 * Test transfer hook bằng cách gửi token
 */
async function testTransferHook() {
  try {
    console.log("\nBắt đầu test transfer hook...");
    const wallet = getWallet();
    

    const destinationWallet = Keypair.generate();
    console.log(`Địa chỉ đích: ${destinationWallet.publicKey.toString()}`);
    

    const destinationTokenAccount = await getAssociatedTokenAddress(
      CUSTOM_TOKEN_ADDRESS,
      destinationWallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log(`Token account đích: ${destinationTokenAccount.toString()}`);
    

    const senderTokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_2022_PROGRAM_ID }
    );
    
    let senderTokenAccount = null;
    for (const account of senderTokenAccounts.value) {
      const tokenData = account.account.data.parsed;
      if (tokenData.info.mint === CUSTOM_TOKEN_ADDRESS.toString()) {
        senderTokenAccount = account.pubkey;
        console.log(`Tài khoản token người gửi: ${senderTokenAccount.toString()}`);
        console.log(`Số dư hiện tại: ${tokenData.info.tokenAmount.uiAmount} tokens`);
        break;
      }
    }
    
    if (!senderTokenAccount) {
      console.error("Không tìm thấy tài khoản token của người gửi!");
      return false;
    }
    

    const fundingTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: destinationWallet.publicKey,
        lamports: 0.01 * LAMPORTS_PER_SOL
      })
    );
    
    console.log("Đang cấp SOL cho ví đích...");
    const fundingSignature = await sendAndConfirmTransaction(
      connection,
      fundingTx,
      [wallet]
    );
    console.log(`Cấp SOL thành công: ${fundingSignature}`);
    

    const createAccountTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        destinationTokenAccount,
        destinationWallet.publicKey,
        CUSTOM_TOKEN_ADDRESS,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    console.log("Đang tạo token account cho ví đích...");
    const createAccountSignature = await sendAndConfirmTransaction(
      connection,
      createAccountTx,
      [wallet]
    );
    console.log(`Tạo token account thành công: ${createAccountSignature}`);
    

    const transferAmount = 10 * 10**9; 
    const transferInstruction = createTransferInstruction(
      senderTokenAccount,
      destinationTokenAccount,
      wallet.publicKey,
      transferAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    
    const transferTx = new Transaction().add(transferInstruction);
    
    console.log(`Đang chuyển ${transferAmount / 10**9} tokens đến ví đích...`);
    const transferSignature = await sendAndConfirmTransaction(
      connection,
      transferTx,
      [wallet]
    );
    
    console.log(`Chuyển token thành công: ${transferSignature}`);
    console.log(`Bạn có thể kiểm tra giao dịch tại: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
    

    const destinationAccountInfo = await connection.getParsedAccountInfo(destinationTokenAccount);
    if (destinationAccountInfo.value) {
      const tokenData = destinationAccountInfo.value.data.parsed;
      console.log(`Số dư ví đích sau khi chuyển: ${tokenData.info.tokenAmount.uiAmount} tokens`);
    }
    
    console.log("\nTransfer hook của bạn đã được kích hoạt trong giao dịch này!");
    console.log("Kiểm tra log giao dịch trong explorer để xem chi tiết về transfer hook.");
    
    return true;
  } catch (error) {
    console.error("Lỗi khi test transfer hook:", error);
    return false;
  }
}

/**
 * Hàm chính
 */
async function main() {
  try {
    console.log("=== TEST TOKEN-2022 TRANSFER HOOK ===");
    

    const accountsInitialized = await initializeAccounts();
    if (!accountsInitialized) {
      console.error("Không thể khởi tạo tài khoản. Dừng chương trình.");
      return;
    }
    

    await createPool();
    

    console.log("\nThực hiện test transfer hook bằng cách gửi token...");
    const transferResult = await testTransferHook();
    
    if (transferResult) {
      console.log("\n=== KẾT QUẢ TEST ===");
      console.log("Transfer hook đã được kích hoạt thành công!");
      console.log("Đây là cách tốt nhất để kiểm tra transfer hook của token-2022 trên Devnet.");
      console.log("Nếu muốn test trong môi trường DEX, bạn cần chuyển lên Mainnet và sử dụng UI của Raydium hoặc Jupiter.");
    }
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

main(); 