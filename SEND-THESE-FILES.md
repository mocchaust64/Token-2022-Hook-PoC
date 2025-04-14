# Hướng dẫn về POC Token-2022 với Transfer Hook

## Files cần giữ
Dưới đây là danh sách các file cần gửi trong POC:

1. **Smart Contract Transfer Hook**
   - `/programs/transfer-hook-whale/src/lib.rs` (mã nguồn transfer hook)
   - `/programs/transfer-hook-whale/Cargo.toml` (dependencies của program)

2. **Script tạo và test**
   - `/tests/transfer-hook-whale.ts` (script tạo và test token)

3. **Demo đơn giản**
   - `/simple-script/simple-hook-demo.js` (script đơn giản để demo cách chuyển token)

4. **Báo cáo nghiên cứu**
   - `/docs/bao-cao-nghien-cuu.md` (báo cáo chi tiết về kết quả nghiên cứu)

5. **Files cơ bản**
   - `/Anchor.toml` (cấu hình Anchor)
   - `/README.md` (hướng dẫn sử dụng POC)
   - `/.gitignore` (nếu cần)

## Files nên loại bỏ
Các file sau không cần thiết cho POC đơn giản và có thể gây nhầm lẫn:

1. **Scripts thử nghiệm DEX phức tạp**
   - `/simple-script/raydium-sdk-test.js`
   - `/simple-script/raydium-sdk-v2-test.js`
   - `/simple-script/raydium-sdk-v2-pool.js`
   - `/simple-script/jupiter-test.js`
   - `/simple-script/create-pool.js`

2. **Files tạm thời và build**
   - `/target/` (thư mục build)
   - `/node_modules/` (dependencies - không cần gửi)
   - Các file `.DS_Store`, v.v.

## Tóm tắt POC
POC này chứng minh:
1. Cách tạo token Token-2022 với extension Transfer Hook
2. Cách triển khai một transfer hook đơn giản để theo dõi chuyển token
3. Cách thực hiện giao dịch chuyển token có transfer hook
4. Các phân tích về thách thức tích hợp với DEX (trong báo cáo nghiên cứu)

## Thông tin Token trên Devnet
- **Token Mint Address**: `9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22`
- **Transfer Hook Program ID**: `7ZbHwsNJCPeFCMisykL1Davm7eygVFoi5yx9pDaGbTsg` 