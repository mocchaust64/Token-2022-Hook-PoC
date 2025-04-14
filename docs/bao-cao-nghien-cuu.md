# Báo cáo Nghiên cứu: Token-2022 với Transfer Hook trên Solana

## 1. Giới thiệu

### 1.1. Tổng quan

Solana Token-2022 là phiên bản cải tiến của chuẩn Token SPL truyền thống, bổ sung nhiều tính năng mới như transfer hook, confidential transfers, metadata và các extension khác. Trong số đó, transfer hook là một tính năng quan trọng cho phép thực thi mã tùy chỉnh mỗi khi token được chuyển, mở ra nhiều ứng dụng tiềm năng cho DeFi, GameFi và các dự án blockchain khác.

### 1.2. Mục tiêu nghiên cứu

Nghiên cứu này nhằm mục đích:
- Tạo và triển khai token Solana Token-2022 với transfer hook
- Đánh giá khả năng tích hợp token này với các DEX (Decentralized Exchange) hiện có
- Xác định các thách thức kỹ thuật và đề xuất giải pháp khả thi

### 1.3. Transfer Hook là gì?

Transfer hook là một extension của Token-2022 cho phép chạy một chương trình tùy chỉnh mỗi khi token được chuyển đi. Điều này mở ra nhiều khả năng mới như:

- Ghi lại lịch sử giao dịch on-chain
- Tính phí giao dịch tự động
- Triển khai cơ chế tokenomics phức tạp (ví dụ: burning, rebasing, v.v.)
- Thực thi các quy tắc chuyển token (ví dụ: giới hạn số lượng, cấm một số địa chỉ)

## 2. Phương pháp nghiên cứu

### 2.1. Công nghệ sử dụng

- Solana Blockchain (Devnet)
- Solana Program Library (SPL)
- Token-2022 Extension
- Rust (cho smart contract)
- JavaScript (cho client và testing)

### 2.2. Quy trình thực hiện

1. Tạo smart contract transfer hook đơn giản bằng Rust/Anchor
2. Triển khai token Token-2022 với transfer hook trên Solana Devnet
3. Phát triển các script test để:
   - Chuyển token trực tiếp giữa các ví
   - Tạo và sử dụng pool trên các DEX khác nhau
4. Đánh giá khả năng tích hợp với các DEX phổ biến: Raydium, SPL token-swap, v.v.

## 3. Triển khai Transfer Hook

### 3.1. Thiết kế Token-2022 với Transfer Hook

Chúng tôi đã tạo một token Token-2022 đơn giản với transfer hook có các đặc điểm sau:

- Địa chỉ mint: `9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22`
- Program ID của Transfer Hook: `7ZbHwsNJCPeFCMisykL1Davm7eygVFoi5yx9pDaGbTsg`
- 9 decimals
- Chức năng của transfer hook: Ghi lại số lần chuyển token và lượng token gần nhất được chuyển

### 3.2. Yêu cầu đặc biệt khi chuyển token

Để chuyển Token-2022 có transfer hook, cần thêm một số tham số đặc biệt vào giao dịch:

1. **Tăng compute budget**: Do transfer hook chạy code tùy chỉnh, cần tăng compute budget cho giao dịch
   ```javascript
   const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
     units: 1_000_000
   });
   ```

2. **Thêm tài khoản bổ sung (extra accounts)**: Transfer hook yêu cầu thêm các tài khoản sau vào instruction
   ```javascript
   transferInstruction.keys.push(
     { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
     { pubkey: TRANSFER_HOOK_PROGRAM_ID, isSigner: false, isWritable: false },
     { pubkey: logTrackerPDA, isSigner: false, isWritable: true }
   );
   ```

3. **Skip preflight**: Khi test trên Devnet, đôi khi cần bỏ qua kiểm tra preflight
   ```javascript
   const txid = await sendAndConfirmTransaction(
     connection,
     transaction,
     signers,
     { skipPreflight: true }
   );
   ```

## 4. Thử nghiệm tích hợp với DEX

### 4.1. Chuyển token trực tiếp

Chúng tôi đã thử nghiệm chuyển token trực tiếp giữa các ví và xác nhận transfer hook hoạt động đúng. Khi chuyển token, các bước sau diễn ra:

1. Token được chuyển từ ví nguồn đến ví đích
2. Transfer hook tự động thực thi, ghi lại thông tin vào tài khoản LogTracker
3. Thông tin về số lần chuyển và số lượng token được cập nhật

Kết quả thử nghiệm cho thấy transfer hook hoạt động ổn định khi chuyển token trực tiếp.

### 4.2. Tích hợp với SPL Token-Swap

Chúng tôi đã thử nghiệm tạo pool với SPL Token-Swap program, kết quả như sau:

- **Tạo tài khoản pool**: THÀNH CÔNG
- **Chuyển token vào pool**: THÀNH CÔNG (cả token-2022 và token thường)
- **Khởi tạo pool**: THẤT BẠI (Custom Program Error 1)
- **Swap token**: THẤT BẠI (không thể swap do pool không khởi tạo hoàn chỉnh)

### 4.3. Tích hợp với Raydium và các DEX khác

Kết quả thử nghiệm với Raydium và các DEX khác:

- **Raydium**: KHÔNG KHẢ THI (chưa hỗ trợ token-2022)
- **Orca**: KHÔNG KHẢ THI (chưa hỗ trợ token-2022)
- **Các DEX khác**: KHÔNG KHẢ THI (chưa hỗ trợ token-2022)

## 5. Phân tích kết quả và thách thức

### 5.1. Thách thức kỹ thuật

Chúng tôi đã xác định ba thách thức chính khi tích hợp token-2022 với transfer hook vào các DEX:

1. **Extra accounts**: Token-2022 với transfer hook yêu cầu thêm tài khoản bổ sung vào mỗi giao dịch chuyển token, trong khi các DEX hiện tại không được thiết kế để thêm các tài khoản này.

2. **Compute budget**: Transfer hook cần nhiều compute budget hơn để thực thi, trong khi các DEX thường không tự động tăng compute budget cho giao dịch.

3. **Các kiểm tra của DEX**: Nhiều DEX có các kiểm tra nghiêm ngặt về loại token và cách token được chuyển. Các kiểm tra này thường không tương thích với token-2022 và các extension của nó.

### 5.2. Phân tích mã lỗi

Khi khởi tạo pool SPL token-swap, chúng tôi nhận được lỗi Custom Program Error 1:

```
Error initializing pool: SendTransactionError: Transaction zaxWHqRjRakvMxRwS8RNCWwhtiL3PDWJ2AqJc8NPZXPaGsKtX6Xf3yYJoYpq9xKZ4gFf93DH1vQnjcfHwfmmMZX resulted in an error.
Status: ({"err":{"InstructionError":[2,{"Custom":1}]}})
```

Lỗi này xảy ra do SPL token-swap program không được thiết kế để xử lý token-2022 và các extension của nó, đặc biệt là transfer hook.

### 5.3. Phân tích thành công một phần

Mặc dù không thể tạo pool hoàn chỉnh, chúng tôi đã thành công trong việc:

1. Tạo tất cả các tài khoản cần thiết cho pool
2. Chuyển cả token-2022 với transfer hook và token thường vào pool
3. Xác nhận transfer hook hoạt động khi chuyển token vào pool

Điều này chứng tỏ việc tích hợp là có khả năng nếu các DEX được sửa đổi để hỗ trợ token-2022.

## 6. Giải pháp tiềm năng

### 6.1. Sửa đổi SPL Token-Swap

Một giải pháp khả thi là sửa đổi mã nguồn của SPL token-swap program để hỗ trợ token-2022 và transfer hook:

1. Cập nhật program để xử lý các token khác ngoài SPL-Token tiêu chuẩn
2. Thêm khả năng thêm extra accounts vào transaction khi cần thiết
3. Tăng compute budget cho các giao dịch liên quan đến token-2022

### 6.2. Phát triển AMM tùy chỉnh

Một giải pháp khác là xây dựng một AMM (Automated Market Maker) mới được thiết kế đặc biệt cho token-2022:

1. Tạo AMM hiểu cách xử lý token-2022 và các extension của nó
2. Tự động thêm các tài khoản bổ sung cần thiết cho transfer hook
3. Tối ưu hóa cho token-2022 thay vì cố gắng tương thích ngược

### 6.3. Đợi hỗ trợ chính thức

Giải pháp an toàn nhất là đợi các DEX chính thức hỗ trợ token-2022 và transfer hook. Theo thông tin, các DEX lớn như Raydium và Orca đang phát triển hỗ trợ cho token-2022, nhưng chưa có thời gian triển khai cụ thể.

## 7. Kết luận và đề xuất

### 7.1. Tóm tắt kết quả

1. **Token-2022 với transfer hook** hoạt động ổn định khi chuyển token trực tiếp giữa các ví.
2. **Tích hợp với DEX hiện tại** gặp thách thức do các DEX chưa được thiết kế để xử lý token-2022 và transfer hook.
3. **SPL token-swap** có thể được sửa đổi để hỗ trợ token-2022, nhưng cần thay đổi đáng kể.

### 7.2. Đề xuất phát triển

Dựa trên kết quả nghiên cứu, chúng tôi đề xuất:

1. **Ngắn hạn**: Sử dụng token-2022 với transfer hook cho các chức năng không yêu cầu tích hợp DEX (ví dụ: chuyển token trực tiếp, staking, v.v.)

2. **Trung hạn**: Phát triển hoặc sửa đổi một AMM đơn giản dựa trên SPL token-swap để hỗ trợ token-2022 và transfer hook.

3. **Dài hạn**: Đợi các DEX chính thức hỗ trợ token-2022 và transfer hook, hoặc phát triển một DEX mới được thiết kế đặc biệt cho token-2022.

### 7.3. Hướng nghiên cứu tương lai

Các hướng nghiên cứu tiềm năng bao gồm:

1. Tìm hiểu cách sửa đổi SPL token-swap program để hỗ trợ token-2022
2. Phát triển DEX tùy chỉnh cho token-2022 và các extension của nó
3. Nghiên cứu các use case khác của transfer hook ngoài DeFi

## 8. Tài liệu tham khảo

1. [Solana Token-2022 Documentation](https://spl.solana.com/token-2022)
2. [SPL Token-Swap Documentation](https://spl.solana.com/token-swap)
3. [Raydium Documentation](https://raydium.io/doc/)
4. [Transfer Hook Documentation](https://github.com/solana-labs/solana-program-library/tree/master/token/program-2022/src/extension/transfer_hook) 