const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const fetch = require('node-fetch');

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');


const JUPITER_API_DEVNET = 'https://quote-api.jup.ag/v6';

async function main() {
  console.log("Bắt đầu kiểm tra Jupiter với Token-2022 trên Devnet...");

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json')));
  const wallet = Keypair.fromSecretKey(secretKey);
  
  console.log("Ví của bạn:", wallet.publicKey.toString());
 
  const customTokenAddress = new PublicKey('9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22');
  
  const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
  
  try {
  
    console.log("Đang lấy thông tin token...");
    const tokenInfo = await connection.getParsedAccountInfo(customTokenAddress);
    if (!tokenInfo.value) {
      console.error("Không tìm thấy token!");
      return;
    }
    
    console.log("Token tồn tại. Chương trình sở hữu:", tokenInfo.value.owner.toString());

    const isToken2022 = tokenInfo.value.owner.toString() === TOKEN_2022_PROGRAM_ID.toString();
    console.log("Là Token-2022:", isToken2022);
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID }
    );
    
    console.log(`Tìm thấy ${tokenAccounts.value.length} tài khoản token thuộc sở hữu ví của bạn`);
    
    let customTokenAccount = null;
    for (const account of tokenAccounts.value) {
      const tokenData = account.account.data.parsed;
      if (tokenData.info.mint === customTokenAddress.toString()) {
        customTokenAccount = account;
        console.log(`Tìm thấy tài khoản cho token ${customTokenAddress.toString()}:`);
        console.log(`- Địa chỉ tài khoản: ${account.pubkey.toString()}`);
        console.log(`- Số dư: ${tokenData.info.tokenAmount.uiAmount}`);
        break;
      }
    }
    
    if (!customTokenAccount) {
      console.log(`Không tìm thấy tài khoản cho token ${customTokenAddress.toString()} trong ví của bạn`);
    }
    
    console.log("\nKiểm tra hỗ trợ của Jupiter cho token của bạn...");
    
    console.log("Lấy danh sách token từ Jupiter...");
    const tokensResponse = await fetch(`${JUPITER_API_DEVNET}/tokens`);
    const tokensData = await tokensResponse.json();
    
    const jupiterToken = tokensData.find(token => token.address === customTokenAddress.toString());
    
    if (jupiterToken) {
      console.log("Token của bạn được hỗ trợ bởi Jupiter!");
      console.log("Chi tiết token:", jupiterToken);
    } else {
      console.log("Token của bạn chưa được liệt kê trong danh sách token của Jupiter.");
      console.log("Điều này không có nghĩa là bạn không thể sử dụng nó, chỉ là nó chưa được index.");
    }
    
    console.log("\nTìm các route swap từ SOL sang token của bạn...");
    
    const swapParams = {
      inputMint: SOL_ADDRESS,
      outputMint: customTokenAddress.toString(),
      amount: 100000000, // 0.1 SOL
      slippageBps: 100, // 1%
      onlyDirectRoutes: false,
      asLegacyTransaction: true, 
      maxAccounts: 10, 
      platformFeeBps: 0,
    };
    
    try {
      const routesResponse = await fetch(`${JUPITER_API_DEVNET}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapParams)
      });
      
      if (routesResponse.status === 200) {
        const routesData = await routesResponse.json();
        
        if (routesData && routesData.data && routesData.data.length > 0) {
          console.log(`Tìm thấy ${routesData.data.length} route swap!`);
          console.log("Route tốt nhất:");
          console.log(`- Input: ${routesData.data[0].inAmount} lamports (${routesData.data[0].inAmount / 1e9} SOL)`);
          console.log(`- Output: ${routesData.data[0].outAmount} (${routesData.data[0].outAmount / 1e9} Token)`);
          console.log(`- Price impact: ${routesData.data[0].priceImpactPct * 100}%`);
          console.log(`- Market name: ${routesData.data[0].marketInfos.map(m => m.label).join(', ')}`);
          
          console.log("\nTạo giao dịch swap mô phỏng...");
          console.log("Lưu ý: Đây chỉ là mô phỏng, không thực hiện giao dịch thực tế");
          
          const bestRoute = routesData.data[0];
          console.log(`Route ID: ${bestRoute.routeId}`);
          
          
          console.log("\nĐể thực hiện swap thực tế, bạn cần:");
          console.log("1. Gọi API /swap-instructions với route ID để nhận các hướng dẫn giao dịch");
          console.log("2. Ký giao dịch bằng ví của bạn");
          console.log("3. Gửi giao dịch đã ký đến mạng Solana");
        } else {
          console.log("Không tìm thấy route swap nào. Có thể không có thanh khoản cho token này trên Devnet.");
        }
      } else {
        const errorData = await routesResponse.text();
        console.log("Lỗi khi lấy route swap:", errorData);
      }
    } catch (error) {
      console.error("Lỗi khi truy vấn route swap:", error.message);
    }
    
    console.log("\nTÓM TẮT KẾT QUẢ:");
    console.log(`1. Token của bạn (${customTokenAddress.toString()}) là ${isToken2022 ? 'Token-2022' : 'Standard SPL Token'}`);
    console.log(`2. Jupiter API ${jupiterToken ? 'có' : 'không có'} liệt kê token của bạn`);
    
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

main(); 