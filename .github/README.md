# Token-2022 với Transfer Hook - Proof of Concept

Đây là một POC (Proof of Concept) đơn giản cho việc tạo và sử dụng token Solana Token-2022 với custom transfer hook. Mã nguồn này được tạo trên Solana Devnet.

## Thông tin Token

- **Token Mint Address**: `9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22`
- **Transfer Hook Program ID**: `7ZbHwsNJCPeFCMisykL1Davm7eygVFoi5yx9pDaGbTsg`
- **Mạng**: Solana Devnet

## Giải thích về Transfer Hook

Transfer Hook là một extension của Token-2022 cho phép thực thi mã tùy chỉnh mỗi khi token được chuyển đi. Trong POC này, hook đơn giản ghi lại thông tin mỗi lần chuyển token.

Custom hook yêu cầu:
1. Tăng compute budget cho mỗi giao dịch
2. Thêm tài khoản bổ sung (extra accounts) vào instruction khi chuyển token

## Cấu trúc dự án

- `programs/transfer-hook-whale/src/lib.rs`: Mã nguồn của transfer hook
- `programs/transfer-hook-whale/Cargo.toml`: Dependencies của program
- `simple-script/simple-hook-demo.js`: Script đơn giản để demo cách chuyển token
- `docs/bao-cao-nghien-cuu.md`: Báo cáo chi tiết về kết quả nghiên cứu

## Cách chạy POC

1. Clone repository này
2. Cài đặt dependencies: `npm install`
3. Chạy test: `anchor test`

## Lưu ý về tích hợp DEX

Nhiều DEX hiện tại chưa hỗ trợ đầy đủ Token-2022 với Transfer Hook. Cần lưu ý:

- Raydium hiện không hỗ trợ Transfer Hook extension
- Cần sửa đổi các contract DEX để tăng compute budget và xử lý lỗi từ transfer hook

## Liên hệ

Nếu có câu hỏi, vui lòng mở issue trên GitHub. 