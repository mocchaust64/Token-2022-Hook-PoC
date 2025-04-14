# Token-2022 với Transfer Hook - Proof of Concept

Đây là một POC (Proof of Concept) đơn giản cho việc tạo và sử dụng token Solana Token-2022 với custom transfer hook. Mã nguồn này được tạo trên Solana Devnet.

## Thông tin Token

- **Token Mint Address**: `9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22`
- **Transfer Hook Program ID**: `7ZbHwsNJCPeFCMisykL1Davm7eygVFoi5yx9pDaGbTsg`
- **Mạng**: Solana Devnet

## Giải thích về Transfer Hook

Transfer Hook là một extension của Token-2022 cho phép thực thi mã tùy chỉnh mỗi khi token được chuyển đi. Trong POC này, hook đơn giản ghi lại thông tin mỗi lần chuyển token:
- Tổng số lần chuyển token
- Số lượng token trong lần chuyển gần nhất

Transfer hook yêu cầu:
1. Tăng compute budget cho mỗi giao dịch
2. Thêm tài khoản bổ sung (extra accounts) vào instruction khi chuyển token

## Cấu trúc dự án

### Smart Contract
- `programs/transfer-hook-whale/src/lib.rs`: Mã nguồn transfer hook
- `programs/transfer-hook-whale/Cargo.toml`: Dependencies của program

### Scripts demo
- `simple-script/simple-hook-demo.js`: Script đơn giản để demo cách chuyển token
- `simple-script/create-pool.js`: Script demo thử nghiệm tạo pool (không thành công do giới hạn DEX)
- `simple-script/raydium-sdk-v2-pool.js`: Script thử nghiệm Raydium SDK

### Báo cáo và tài liệu
- `docs/bao-cao-nghien-cuu.md`: Báo cáo chi tiết về kết quả nghiên cứu

### Cấu hình dự án
- `Anchor.toml`: Cấu hình Anchor framework
- `package.json`: Cấu hình dependencies

## Cách chạy POC

1. Clone repository này
2. Cài đặt dependencies: `npm install`
3. Chạy test để tạo token và khởi tạo transfer hook: `anchor test`
4. (Tùy chọn) Chạy demo đơn giản:
   ```
   cd simple-script
   npm install  # Cài đặt dependencies cho script
   node simple-hook-demo.js
   ```

## Mã nguồn ví dụ để chuyển token

```javascript
const { Transaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { createTransferCheckedInstruction, TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token');

const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 1_000_000
});

const transferIx = createTransferCheckedInstruction(
  sourceTokenAccount,
  tokenMint,
  destinationTokenAccount,
  owner,
  amount,
  decimals,
  [],
  TOKEN_2022_PROGRAM_ID
);

transferIx.keys.push(
  { pubkey: extraAccountMetaPDA, isSigner: false, isWritable: false },
  { pubkey: transferHookProgramId, isSigner: false, isWritable: false },
  { pubkey: logTrackerPDA, isSigner: false, isWritable: true }
);

const transaction = new Transaction()
  .add(computeBudgetIx)
  .add(transferIx);
```

## Xác minh Transfer Hook

Sau khi thực hiện chuyển token, bạn có thể xác minh transfer hook đã chạy bằng cách:

1. Kiểm tra log giao dịch trên Solana Explorer
2. Kiểm tra tài khoản tracker: `LogTracker` tại địa chỉ PDA được tạo với seeds `["log-tracker", mint]`

## Thách thức tích hợp với DEX

Nhiều DEX hiện tại chưa hỗ trợ đầy đủ Token-2022 với Transfer Hook. Thách thức chính:

1. Raydium và hầu hết DEX khác không tự động tăng compute budget
2. DEX không thêm các extra accounts cần thiết cho transfer hook
3. Transfer hook có thể gây lỗi trong quy trình swap phức tạp

Tham khảo `docs/bao-cao-nghien-cuu.md` để biết thêm chi tiết về các thách thức và giải pháp tiềm năng.

## Kết quả đạt được

1. **Thành công**:
   - Tạo và triển khai token Token-2022 với transfer hook
   - Transfer hook hoạt động đúng khi chuyển token trực tiếp
   - Xây dựng smart contract mẫu cho transfer hook

2. **Hạn chế**:
   - Chưa tích hợp được với các DEX hiện tại
   - Cần phương án tự phát triển pool đơn giản hoặc đợi DEX hỗ trợ

## Để tìm hiểu thêm

Tham khảo báo cáo nghiên cứu đầy đủ trong file `docs/bao-cao-nghien-cuu.md`.

## Báo cáo nghiên cứu

File `docs/bao-cao-nghien-cuu.md` chứa báo cáo chi tiết về:
- Quy trình tạo token Token-2022 với transfer hook
- Kết quả thử nghiệm chức năng transfer hook
- Thách thức khi tích hợp với DEX và giải pháp tiềm năng
- Đề xuất phương án tích hợp DEX khả thi

