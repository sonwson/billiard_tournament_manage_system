# Hệ Thống Quản Lý Giải Đấu Billiards

Hệ thống giải đấu billiards giúp quản lý thông tin về giải đấu, người chơi, kết quả trận đấu và các tính năng khác liên quan đến quản lý giải đấu. Dưới đây là mô tả chi tiết về các chức năng và yêu cầu của hệ thống.

## Các Chức Năng Chính

### 1. **Hiển Thị Match List**
   - **Mô tả**: Hiển thị danh sách các trận đấu với thông tin **winner**, **round name**, và **race to** (ví dụ: "Winner Round 1 - Race to 5").
   - **Yêu cầu**:
     - Các trận đấu phải được phân chia theo vòng đấu.
     - Thông tin chi tiết về các trận đấu (tỉ số, người chơi tham gia, v.v.) phải rõ ràng.
     - Giao diện dễ nhìn, không bị che khuất thông tin.

### 2. **Cải Thiện Thông Báo**
   - **Mô tả**: Khi người dùng nhấn vào button hoặc submit form, hệ thống phải hiển thị **thông báo đẹp và rõ ràng**.
   - **Yêu cầu**:
     - Thông báo có thể tùy chỉnh cho từng hành động (thành công, lỗi, yêu cầu nhập thông tin).
     - Nút thông báo cần có **icon**, **màu sắc khác nhau** (thành công - xanh, lỗi - đỏ, cảnh báo - vàng).

### 3. **Chức Năng Quên Mật Khẩu và Đổi Mật Khẩu**
   - **Mô tả**: Người dùng có thể yêu cầu **mã xác thực gửi qua email** để **reset mật khẩu**, hoặc thay đổi mật khẩu khi đăng nhập.
   - **Yêu cầu**:
     - **Gửi email** với mã xác thực để reset mật khẩu.
     - Sau khi nhận mã xác thực, người dùng có thể **đặt lại mật khẩu mới**.

### 4. **Tạo QR Code Để Cập Nhật Tỉ Số Trận Đấu**
   - **Mô tả**: Khi người tham gia thi đấu đến giải đấu, họ có thể **quét QR code** để cập nhật tỉ số trận đấu trực tiếp.
   - **Yêu cầu**:
     - Tạo **QR Code** cho mỗi trận đấu.
     - Người tham gia chỉ cần quét QR code để **cập nhật tỉ số** trận đấu ngay lập tức.
   
### 5. **Xem Trận Đấu Của Mỗi Người Dùng**
   - **Mô tả**: Người dùng có thể **xem các trận đấu của mình** theo từng giải đấu (Event).
   - **Yêu cầu**:
     - Mỗi người dùng chỉ có thể xem các trận đấu của mình trong **event** mà họ tham gia.
     - **Event Page**: Người dùng có thể click vào giải đấu để xem tất cả các trận đấu của mình trong giải đấu đó.

### 6. **Lọc Giải Đấu Theo Địa Điểm và Giải Thưởng**
   - **Mô tả**: Người dùng có thể **lọc giải đấu** theo **địa điểm**, **giải thưởng**, và **trạng thái** (đang diễn ra, đã kết thúc).
   - **Yêu cầu**:
     - **Lọc theo địa điểm**: Hiển thị các giải đấu tổ chức tại một địa điểm cụ thể.
     - **Lọc theo giải thưởng**: Hiển thị các giải đấu có phần thưởng nhất định cho người chiến thắng.
     - **Lọc theo trạng thái**: Hiển thị giải đấu theo các trạng thái như **đang diễn ra**, **hoàn thành**, **mở đăng ký**.

## Cấu Trúc Dữ Liệu

### 1. **Cấu Trúc Tournament**
   - **Tên giải đấu** (name)
   - **Giải thưởng** (prizeFund)
   - **Các vòng đấu** (rounds), ví dụ:
     - Round 1: **Race to 5**
     - Quarterfinals: **Race to 7**
   - **Trạng thái giải đấu** (status): `draft`, `open registration`, `ongoing`, `completed`

### 2. **Cấu Trúc Player**
   - **Tên người chơi** (name)
   - **Email** (email)
   - **Số điện thoại** (phone)
   - **Giải đấu tham gia** (tournament)

### 3. **Cấu Trúc Match**
   - **Trận đấu giữa hai người chơi** (player1, player2)
   - **Tỉ số trận đấu** (scorePlayer1, scorePlayer2)
   - **Người thắng** (winner)

## Quyền Hạn và Phân Quyền

### 1. **Super Admin**:
   - Quản lý tất cả giải đấu.
   - Có thể **xóa người chơi vĩnh viễn**.
   - Quản lý tất cả tài khoản người dùng và giải đấu.

### 2. **Admin Giải Đấu**:
   - Quản lý giải đấu mà họ được phân quyền.
   - Có thể **xóa người chơi khỏi giải đấu** nhưng không thể xóa tài khoản người chơi.
   - Cập nhật kết quả trận đấu trong giải đấu của mình.

### 3. **Người Dùng**:
   - Xem các trận đấu của mình trong các giải đấu mà họ tham gia.
   - Tham gia giải đấu và cập nhật kết quả khi có thay đổi trong trận đấu.

## Giao Diện

### 1. **Match List Page**:
   - Hiển thị danh sách các trận đấu với **tỉ số**, **người chơi**, và **vòng đấu**.
   - Phân chia trận đấu theo **vòng** (Round 1, Quarterfinals, Final).

### 2. **Thông Báo**:
   - **Thông báo đẹp** và dễ nhìn khi người dùng submit form hoặc có thay đổi (thành công, lỗi).
   - **Toast notifications** với thời gian tự động đóng sau khi người dùng xem.

### 3. **Event Filtering**:
   - Lọc giải đấu theo **địa điểm**, **giải thưởng**, và **trạng thái**.

### 4. **QR Code**:
   - **QR Code** cho mỗi trận đấu để người tham gia quét và cập nhật tỉ số trận đấu.

## Tổng Kết

Hệ thống này sẽ giúp quản lý giải đấu billiards một cách hoàn chỉnh với các chức năng như **quản lý trận đấu**, **quản lý người chơi**, **quản lý thông báo**, **cập nhật tỉ số real-time**, và **tạo QR code** cho các trận đấu. Các chức năng như **quên mật khẩu**, **đổi mật khẩu**, và **lọc giải đấu** sẽ giúp người dùng dễ dàng quản lý và tham gia giải đấu.