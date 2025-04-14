const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const fetch = require('node-fetch');

// Hằng số token-2022
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Jupiter API endpoint
const JUPITER_API_DEVNET = 'https://quote-api.jup.ag/v6';

async function main() {
  console.log("Bắt đầu kiểm tra Jupiter với Token-2022 trên Devnet...");
  
  // Kết nối tới Devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Lấy keypair từ file
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json')));
  const wallet = Keypair.fromSecretKey(secretKey);
  
  console.log("Ví của bạn:", wallet.publicKey.toString());
  
  // Địa chỉ token bạn đã tạo (token-2022)
  const customTokenAddress = new PublicKey('9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22');
  // Địa chỉ SOL wrapped
  const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
  
  try {
    // Kiểm tra thông tin token của bạn
    console.log("Đang lấy thông tin token...");
    const tokenInfo = await connection.getParsedAccountInfo(customTokenAddress);
    if (!tokenInfo.value) {
      console.error("Không tìm thấy token!");
      return;
    }
    
    console.log("Token tồn tại. Chương trình sở hữu:", tokenInfo.value.owner.toString());
    
    // Kiểm tra xem token này có phải token-2022 không
    const isToken2022 = tokenInfo.value.owner.toString() === TOKEN_2022_PROGRAM_ID.toString();
    console.log("Là Token-2022:", isToken2022);
    
    // Lấy token accounts của người dùng
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID }
    );
    
    console.log(`Tìm thấy ${tokenAccounts.value.length} tài khoản token thuộc sở hữu ví của bạn`);
    
    // Tìm tài khoản của token cụ thể
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
    
    // Kiểm tra xem Jupiter có hỗ trợ token của bạn không
    console.log("\nKiểm tra hỗ trợ của Jupiter cho token của bạn...");
    
    // 1. Kiểm tra xem token có trong danh sách token của Jupiter không
    console.log("Lấy danh sách token từ Jupiter...");
    const tokensResponse = await fetch(`${JUPITER_API_DEVNET}/tokens`);
    const tokensData = await tokensResponse.json();
    
    // Tìm token trong danh sách
    const jupiterToken = tokensData.find(token => token.address === customTokenAddress.toString());
    
    if (jupiterToken) {
      console.log("Token của bạn được hỗ trợ bởi Jupiter!");
      console.log("Chi tiết token:", jupiterToken);
    } else {
      console.log("Token của bạn chưa được liệt kê trong danh sách token của Jupiter.");
      console.log("Điều này không có nghĩa là bạn không thể sử dụng nó, chỉ là nó chưa được index.");
    }
    
    // 2. Thử lấy các route swap từ SOL sang token của bạn
    console.log("\nTìm các route swap từ SOL sang token của bạn...");
    
    const swapParams = {
      inputMint: SOL_ADDRESS,
      outputMint: customTokenAddress.toString(),
      amount: 100000000, // 0.1 SOL
      slippageBps: 100, // 1%
      onlyDirectRoutes: false,
      asLegacyTransaction: true, // Sử dụng legacy transaction
      maxAccounts: 10, // Giảm số lượng tài khoản để tránh lỗi kích thước giao dịch
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
          
          // Tạo giao dịch swap (chỉ mô phỏng, không thực hiện)
          console.log("\nTạo giao dịch swap mô phỏng...");
          console.log("Lưu ý: Đây chỉ là mô phỏng, không thực hiện giao dịch thực tế");
          
          // Lấy thông tin route tốt nhất
          const bestRoute = routesData.data[0];
          console.log(`Route ID: ${bestRoute.routeId}`);
          
          // Trong thực tế, bạn sẽ gọi:
          // 1. /swap-instructions với route ID để lấy hướng dẫn giao dịch
          // 2. Ký và gửi giao dịch
          
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
    
    // 3. Kiểm tra các DEX khác được hỗ trợ bởi Jupiter trên Devnet
    console.log("\nKiểm tra các DEX được hỗ trợ trên Devnet...");
    try {
      const dexsResponse = await fetch(`${JUPITER_API_DEVNET}/indexed-route-map`);
      const dexsData = await dexsResponse.json();
      
      // Lấy danh sách DEX duy nhất
      const dexs = new Set();
      for (const key in dexsData) {
        for (const route of dexsData[key]) {
          dexs.add(route.amm.label);
        }
      }
      
      console.log("Các DEX được hỗ trợ trên Devnet:");
      console.log(Array.from(dexs).join(', '));
      
      // Kiểm tra xem có hỗ trợ orca nào không (vì orca có xu hướng hỗ trợ token-2022)
      const hasOrca = Array.from(dexs).some(dex => dex.toLowerCase().includes('orca'));
      if (hasOrca) {
        console.log("Orca được hỗ trợ trên Devnet, có khả năng cao hỗ trợ Token-2022!");
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách DEX:", error.message);
    }
    
    // Tóm tắt
    console.log("\nTÓM TẮT KẾT QUẢ:");
    console.log(`1. Token của bạn (${customTokenAddress.toString()}) là ${isToken2022 ? 'Token-2022' : 'Standard SPL Token'}`);
    console.log(`2. Jupiter API ${jupiterToken ? 'có' : 'không có'} liệt kê token của bạn`);
    console.log("3. Để sử dụng token của bạn trên Jupiter, bạn cần:");
    console.log("   - Tạo thanh khoản trên một trong các DEX được hỗ trợ (Orca là lựa chọn tốt cho Token-2022)");
    console.log("   - Hoặc sử dụng UI của Jupiter: https://jup.ag/swap (chọn Devnet ở góc phải trên cùng)");
    console.log("   - Copy địa chỉ token của bạn và dán vào field token để swap");
    
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

main(); 