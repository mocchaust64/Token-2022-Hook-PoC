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
- `simple-script/create-spl-pool.js`: Script thử nghiệm tạo pool với SPL token-swap
- `simple-script/create-raydium-pool-forced.js`: Script thử nghiệm tạo pool trên Raydium
- `simple-script/create-fluxbeam-pool.js`: Script thử nghiệm tạo pool trên Fluxbeam

### Báo cáo và tài liệu
- `docs/bao-cao-nghien-cuu.md`: Báo cáo chi tiết về kết quả nghiên cứu

## Cách chạy POC

1. Clone repository này
2. Cài đặt dependencies: `npm install`
3. Chạy test để tạo token và khởi tạo transfer hook: `anchor test`
4. Chạy demo đơn giản:
   ```
   cd tests/simple-script
   npm install  # Cài đặt dependencies cho script
   node simple-hook-demo.js
   ```
5. Thử tạo pool với SPL token-swap:
   ```
   cd tests/simple-script
   node create-spl-pool.js
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

## Kết quả Nghiên cứu

### Chuyển Token Trực Tiếp
- **Kết quả**: ✅ THÀNH CÔNG
- Transfer hook hoạt động hoàn hảo khi chuyển token trực tiếp giữa các ví
- Log Tracker PDA ghi lại được số lượt chuyển và số lượng token

### Tích hợp với SPL Token-Swap
- **Tạo tài khoản pool**: ✅ THÀNH CÔNG
- **Chuyển token vào pool**: ✅ THÀNH CÔNG
- **Khởi tạo pool**: ❌ THẤT BẠI (Custom Program Error 1)
- **Swap token**: ❌ THẤT BẠI (pool không khởi tạo hoàn chỉnh)

### Tích hợp với Raydium/Fluxbeam
- **Raydium**: ❌ KHÔNG KHẢ THI (chưa hỗ trợ token-2022)
- **Fluxbeam**: ❌ KHÔNG KHẢ THI (chưa hỗ trợ token-2022)
- **Các DEX khác**: ❌ KHÔNG KHẢ THI (chưa hỗ trợ token-2022)

## Thách thức tích hợp với DEX

Những thách thức chính khi tích hợp token-2022 với transfer hook vào DEX:

1. **Extra Accounts**: Token-2022 với transfer hook yêu cầu thêm tài khoản bổ sung vào mỗi giao dịch chuyển token, trong khi các DEX hiện tại không được thiết kế để thêm các tài khoản này.

2. **Compute Budget**: Transfer hook cần nhiều compute budget hơn để thực thi, DEX thường không tự động tăng compute budget.

3. **Các kiểm tra của DEX**: DEX có các kiểm tra nghiêm ngặt về loại token và cách token được chuyển, không tương thích với token-2022.

4. **Program Error**: SPL token-swap trả về Custom Program Error 1 khi khởi tạo pool với token-2022.

## Giải pháp Tiềm năng

1. **Sửa đổi SPL Token-Swap**:
   - Fork mã nguồn SPL token-swap program
   - Sửa đổi để xử lý token-2022 và extra accounts
   - Tăng compute budget cho các giao dịch

2. **Phát triển AMM Tùy chỉnh**:
   - Xây dựng AMM mới được thiết kế cho token-2022
   - Tự động thêm extra accounts cho transfer hook
   - Tối ưu hóa cho token-2022 thay vì tương thích ngược

3. **Đợi Hỗ trợ Chính thức**:
   - Chờ DEX lớn như Raydium, Orca hỗ trợ token-2022
   - Theo dõi cập nhật từ Solana Labs về Token-2022

## Kết quả đạt được

1. **Thành công**:
   - Tạo và triển khai token Token-2022 với transfer hook
   - Transfer hook hoạt động đúng khi chuyển token trực tiếp
   - Tạo được tài khoản pool và chuyển token vào pool
   - Xây dựng smart contract mẫu cho transfer hook

2. **Hạn chế**:
   - Chưa tích hợp được với các DEX hiện tại
   - Không thể khởi tạo pool hoàn chỉnh với token-2022
   - Cần phương án tự phát triển pool đơn giản hoặc đợi DEX hỗ trợ

## Để tìm hiểu thêm

Tham khảo báo cáo nghiên cứu đầy đủ trong file `docs/bao-cao-nghien-cuu.md`.

## Báo cáo nghiên cứu

File `docs/bao-cao-nghien-cuu.md` chứa báo cáo chi tiết về:
- Quy trình tạo token Token-2022 với transfer hook
- Kết quả thử nghiệm chức năng transfer hook
- Thách thức khi tích hợp với DEX và giải pháp tiềm năng
- Đề xuất phương án tích hợp DEX khả thi

