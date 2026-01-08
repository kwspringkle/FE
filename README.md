
# **Bản dịch tiếng Việt**

## **課題（Vấn đề）**

**Giúp sinh viên Việt Nam có thể tự tin giới thiệu món ăn Việt Nam cho giáo viên người Nhật mà không bị lúng túng.**

---

## **解決策（Giải pháp）**

**“Ứng dụng này cho phép tìm kiếm các món ăn và nhà hàng Việt Nam phù hợp với khẩu vị người Nhật trong khu vực Hà Nội.
Ứng dụng cung cấp thông tin chi tiết về quán ăn, thông tin món ăn, nguyên liệu, hình ảnh món ăn, lý do đề xuất, và cả chức năng chỉ đường.
Nhờ đó, sinh viên Việt Nam có thể tự tin giới thiệu ẩm thực Việt Nam cho sinh viên hoặc giáo viên người Nhật.”**

---

## **想定ユーザ（Người dùng dự kiến）**

* Sinh viên Việt Nam đang học tập tại Hà Nội

---

## **Webアプリ名称（Tên ứng dụng Web）**

**ベトめしガイド（Beto-meshi Guide / Hướng dẫn món Việt）**

---

# **Danh sách chức năng**

| No. | Tên chức năng                                     | Mô tả chức năng                                                                                                                                                                | Mục đích                                                                                                   |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | **Chức năng đăng nhập / đăng ký mới / đăng xuất** | Người dùng có thể tạo tài khoản, đăng nhập và đăng xuất. Thông tin người dùng được quản lý an toàn và chỉ người dùng đã xác thực mới có thể sử dụng.                           | Để xác thực người dùng và quản lý an toàn thông tin cá nhân, lịch sử sử dụng.                              |
| 2   | **Chức năng tìm kiếm**                            | Người dùng có thể tìm kiếm món ăn hoặc nhà hàng theo tên hoặc điều kiện.                                                                                                       | Giúp người dùng nhanh chóng tìm và giới thiệu món ăn/nhà hàng phù hợp.                                     |
| 3   | **Quản lý yêu thích**                             | Người dùng có thể thêm hoặc xóa món ăn/nhà hàng khỏi danh sách yêu thích.                                                                                                      | Giúp người dùng dễ dàng xem lại và giới thiệu sau.                                                         |
| 4   | **Đánh giá món ăn**                               | Người dùng có thể đăng đánh giá và bình luận về món ăn.                                                                                                                        | Cung cấp thông tin cho người khác và chia sẻ sự hấp dẫn của món ăn.                                        |
| 5   | **Đánh giá nhà hàng**                             | Người dùng có thể đăng đánh giá và bình luận về nhà hàng.                                                                                                                      | Giúp người dùng khác tham khảo khi chọn nhà hàng.                                                          |
| 6   | **Bảng xếp hạng**                                 | Hệ thống hiển thị bảng xếp hạng các món ăn và nhà hàng được yêu thích.                                                                                                         | Người dùng có thể tham khảo các món được ưa chuộng để giới thiệu cho người Nhật.                           |
| 7   | **Gợi ý (Recommend)**                             | Dựa trên vị trí hiện tại, mục yêu thích, hoặc thông tin món ăn liên quan để gợi ý món ăn/nhà hàng gần đó.                                                                      | Giúp người dùng dễ dàng tìm món ăn/hàng quán phù hợp và thuận tiện紹介.                                      |
| 8   | **Bản đồ / dẫn đường**                            | Hiển thị lộ trình, khoảng cách đến nhà hàng được chọn.                                                                                                                         | Giúp người dùng đến nơi mà không bị lạc.                                                                   |
| 9   | **Cài đặt cá nhân**                               | Cho phép người dùng xem/chỉnh sửa tên, email, quốc tịch, ảnh đại diện, đổi mật khẩu, và cập nhật vị trí hiện tại.                                                              | Giúp người dùng quản lý hồ sơ cá nhân và giữ thông tin luôn mới.                                           |
| 10  | **Hỗ trợ giới thiệu**                             | Khi người dùng nhập món muốn giới thiệu, AI sẽ tự động tóm tắt thông tin món ăn, gợi ý món liên quan, tạo script giới thiệu bằng tiếng Nhật kèm bản dịch và hướng dẫn phát âm. | Giúp sinh viên Việt Nam tự tin giới thiệu món ăn bằng tiếng Nhật trong thuyết trình hoặc giao lưu văn hóa. |

---

# **Danh sách màn hình**

| No. | Tên màn hình                  | Mô tả                                                                                                                 | Mục đích                                                            |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | **Trang chủ**                 | Hiển thị khi người dùng chưa đăng nhập. Giới thiệu tổng quan ứng dụng, chức năng chính và liên kết đăng nhập/đăng ký. | Giúp người dùng hiểu tổng thể hệ thống.                             |
| 2   | **Đăng ký mới**               | Màn hình để người dùng nhập tên, email, mật khẩu để tạo tài khoản.                                                    | Thu thập thông tin người dùng và tạo dữ liệu cơ bản.                |
| 3   | **Đăng nhập**                 | Người dùng nhập email và mật khẩu để đăng nhập.                                                                       | Xác thực người dùng và cung cấp quyền truy cập an toàn.             |
| 4   | **Trang chủ sau đăng nhập**   | Hiển thị các chức năng chính để người dùng lựa chọn.                                                                  | Giúp người dùng dễ dàng truy cập các chức năng.                     |
| 5   | **Danh sách yêu thích**       | Hiển thị món ăn & nhà hàng mà người dùng đã lưu.                                                                      | Giúp người dùng xem lại và giới thiệu dễ dàng.                      |
| 6   | **Trang xếp hạng**            | Hiển thị bảng xếp hạng món ăn & nhà hàng phổ biến với người Nhật.                                                     | Cung cấp gợi ý tin cậy để giới thiệu.                               |
| 7   | **Kết quả tìm kiếm**          | Hiển thị danh sách món ăn tương ứng với từ khóa tìm kiếm.                                                             | Giúp người dùng nhanh chóng tìm món để giới thiệu.                  |
| 8   | **Chi tiết nhà hàng**         | Hiển thị hình ảnh, khoảng cách, mô tả, địa chỉ, mức độ phổ biến, giá, v.v.                                            | Giúp người dùng có đầy đủ thông tin để giới thiệu nhà hàng.         |
| 9   | **Danh sách review nhà hàng** | Hiển thị đánh giá và bình luận từ người dùng.                                                                         | Giúp người dùng tham khảo khi chọn nhà hàng.                        |
| 10  | **Chi tiết món ăn**           | Hiển thị hình ảnh, nguyên liệu, đặc điểm, giá, món liên quan, nhà hàng phục vụ món đó.                                | Cung cấp thông tin chi tiết để giới thiệu món ăn.                   |
| 11  | **Danh sách review món ăn**   | Hiển thị các đánh giá về món ăn.                                                                                      | Giúp người dùng có thêm thông tin khi giới thiệu.                   |
| 12  | **Trang cài đặt cá nhân**     | Người dùng có thể chỉnh sửa tên, quốc tịch, email, ảnh đại diện, đổi mật khẩu và cập nhật vị trí.                     | Quản lý thông tin cá nhân tập trung.                                |
| 13  | **Popup hỗ trợ giới thiệu**   | Hiển thị khi người dùng bấm “Hỗ trợ giới thiệu”. AI tạo văn giới thiệu, bản dịch, và hướng dẫn luyện tập.             | Giúp người dùng dễ dàng soạn bài giới thiệu món ăn bằng tiếng Nhật. |

---

## Cấu hình Vietmap (tính khoảng cách theo vị trí hiện tại)

FE có route `GET /api/vietmap/distance` để gọi Vietmap Search v4 + Place v4 + Matrix API từ server (không lộ key ở client).

- Tạo file `FE/.env.local` và thêm: `VIETMAP_API_KEY=YOUR_KEY`
- Trên Vietmap Console cần bật/gán quyền cho các API: Search v4, Place v4, Matrix


