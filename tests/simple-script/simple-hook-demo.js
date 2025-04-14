const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  sendAndConfirmTransaction, 
  ComputeBudgetProgram 
} = require('@solana/web3.js');
const { 
  createTransferCheckedInstruction, 
  TOKEN_2022_PROGRAM_ID, 
  getAccount 
} = require('@solana/spl-token');
const fs = require('fs');
const os = require('os');

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const getWallet = () => {
  const secretKey = Uint8Array.from(
    JSON.parse(fs.readFileSync(os.homedir() + '/.config/solana/id.json'))
  );
  return Keypair.fromSecretKey(secretKey);
};

const TOKEN_MINT = new PublicKey('9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22');
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('7ZbHwsNJCPeFCMisykL1Davm7eygVFoi5yx9pDaGbTsg');
const decimals = 9;

const [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('extra-account-metas'), TOKEN_MINT.toBuffer()],
  TRANSFER_HOOK_PROGRAM_ID
);

const [logTrackerPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('log-tracker'), TOKEN_MINT.toBuffer()],
  TRANSFER_HOOK_PROGRAM_ID
);

async function transferTokenWithHook(
  sourceTokenAccount,
  destinationTokenAccount,
  amount
) {
  try {
    const wallet = getWallet();
    
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_000_000
    });
    
    const transferIx = createTransferCheckedInstruction(
      sourceTokenAccount,
      TOKEN_MINT,
      destinationTokenAccount,
      wallet.publicKey,
      amount * Math.pow(10, decimals),
      decimals,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    
    transferIx.keys.push(
      { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
      { pubkey: TRANSFER_HOOK_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: logTrackerPDA, isSigner: false, isWritable: true }
    );
    
    const transaction = new Transaction()
      .add(computeBudgetIx)
      .add(transferIx);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    console.log('Chuyển token thành công!');
    console.log('Signature:', signature);
    console.log('Solana Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (error) {
    console.error('Lỗi khi chuyển token:', error);
    throw error;
  }
}

async function checkToken() {
  try {
    const wallet = getWallet();
    console.log('Địa chỉ ví:', wallet.publicKey.toString());
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_2022_PROGRAM_ID }
    );
    
    let sourceTokenAccount = null;
    for (const account of tokenAccounts.value) {
      const tokenData = account.account.data.parsed;
      if (tokenData.info.mint === TOKEN_MINT.toString()) {
        sourceTokenAccount = account.pubkey;
        console.log('Tìm thấy tài khoản token:', sourceTokenAccount.toString());
        console.log('Số dư:', tokenData.info.tokenAmount.uiAmount, 'tokens');
        break;
      }
    }
    
    if (!sourceTokenAccount) {
      console.log('Không tìm thấy tài khoản token cho mint này!');
      return null;
    }
    
    return sourceTokenAccount;
  } catch (error) {
    console.error('Lỗi khi kiểm tra token:', error);
    return null;
  }
}

async function main() {
  try {
    console.log('Demo Token-2022 với Transfer Hook');
    console.log('Token Mint:', TOKEN_MINT.toString());
    console.log('Transfer Hook Program:', TRANSFER_HOOK_PROGRAM_ID.toString());
    
    const sourceTokenAccount = await checkToken();
    if (!sourceTokenAccount) {
      console.log('Không thể tiếp tục vì không tìm thấy tài khoản token!');
      return;
    }
    
    const destinationKeypair = Keypair.generate();
    console.log('Địa chỉ nhận thử nghiệm:', destinationKeypair.publicKey.toString());
    
    const destinationTokenAccount = sourceTokenAccount;
    
    await transferTokenWithHook(sourceTokenAccount, destinationTokenAccount, 0.1);
    
    console.log('\nĐể xác minh transfer hook đã chạy:');
    console.log('1. Kiểm tra log giao dịch trên Solana Explorer (link ở trên)');
    console.log(`2. Sử dụng Anchor để kiểm tra LogTracker: ${logTrackerPDA.toString()}`);
  } catch (error) {
    console.error('Lỗi khi chạy demo:', error);
  }
}

main();