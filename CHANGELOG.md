# Nhật Ký Thay Đổi (Changelog)

Tất cả các thay đổi đáng chú ý của dự án **MathViz Studio** sẽ được ghi chép lại tại tài liệu này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/).

---

## [1.2.0] - 05/09/2026

### ✨ Tính Năng Mới (Features)
- **Trình chỉnh sửa hình học tương tác (Interactive SVG Editor)**:
  - Cho phép chọn trực tiếp các đối tượng (đoạn thẳng, đường tròn, cung góc, điểm mút) trên khung vẽ SVG.
  - Tự động bắt dính điểm (Snap-To-Nearest) trong bán kính 25px giúp chỉnh sửa chuẩn xác.
  - Hỗ trợ đổi nét liền / nét đứt (`stroke-dasharray`), thay đổi độ dày (`stroke-width`), chọn màu sắc và ký hiệu đánh dấu góc vuông / cung góc.
- **Hoán đổi thanh công cụ Canvas Header**:
  - Khi người dùng bật chế độ "Chỉnh sửa trực tiếp", thanh Canvas Header bên ngoài tự động chuyển thành thanh định dạng đối tượng hoàn chỉnh, giữ cho lòng khung vẽ SVG hoàn toàn thông thoáng, không bị che khuất.
- **Cơ chế quản lý Cụm Điểm - Nhãn (Point Entity Grouping)**:
  - Tự động ghép cặp chấm tròn (`<circle>`) và nhãn chữ (`<text>`) tương ứng.
  - Cung cấp 2 bộ chỉnh màu độc lập: đổi màu riêng cho chấm điểm và đổi màu riêng cho nhãn chữ cái.
- **Chuẩn hóa bộ bài toán thực tế mẫu theo định dạng LaTeX**:
  - Toàn bộ danh sách bài toán thực tế mẫu được tách ra module độc lập `src/data/samplePrompts.ts`.
  - Chuẩn hóa mọi ký hiệu toán học, góc, độ dài, quan hệ vuông góc theo chuẩn KaTeX `$ ... $`.
  - Tích hợp xem trước công thức toán học trực quan và tức thì qua component `LatexPreview`.

### 🚀 Cải Tiến & Tối Ưu (Improvements)
- **Bố cục giao diện 2 cột cân đối (Layout Optimization)**:
  - Chuẩn hóa padding `p-4 box-border` đối xứng hai bên cho cột điều khiển bên trái, khắc phục triệt để hiện tượng lệch mép viền.
  - Đưa khối "BỘ SƯU TẬP ĐÃ LƯU" trở lại vị trí nằm ngang ở đáy không gian Canvas.
  - Cho phép click vào bất kỳ đâu trên toàn bộ thanh tiêu đề để Đóng / Mở (Collapsible toggle) với giao diện danh sách thumbnail thu nhỏ gọn gàng.
- **Tối giản ô nhập đề bài**:
  - Tối giản tiêu đề "Nội dung đề bài", lược bỏ dòng chú thích phụ không cần thiết.
  - Khắc phục triệt để tình trạng tràn viền và rớt dòng nút "Tạo hình".

### 🐛 Vá Lỗi (Bug Fixes)
- Khắc phục lỗi mất liên kết phần tử SVG khi chỉnh sửa thuộc tính bằng cơ chế định danh duy nhất `data-edit-id`.

---

## [1.1.0] - 03/09/2026

### ✨ Tính Năng Mới (Features)
- Tích hợp module Soạn Kế hoạch bài dạy (Giáo án) chuẩn Công văn 5512/BGDĐT bổ sung Khung Năng lực số, bám sát SGK Kết nối tri thức với cuộc sống.
- Ra mắt Trình xem trước giáo án dạng trang giấy Word A4 trực quan kèm thước căn lề chuẩn Nghị định 30/2020/NĐ-CP, phóng to/thu nhỏ và xuất bản file `.docx`.
- Đồng bộ 2 chiều giữa module Vẽ hình học và Giáo án: bấm "Tạo hình SVG cho bài này" để chuyển sang vẽ và bấm "Chèn hình này vào Giáo án" để tự động nhúng hình vẽ.

### 🐛 Vá Lỗi & Cải Tiến (Fixes & Improvements)
- Khắc phục lỗi mất hình ảnh khi xuất file Word (`.docx`) bằng bộ chuyển đổi Canvas SVG -> PNG tự động nhúng `ImageRun`.
- Cấm AI vẽ hình minh họa bằng ký tự ASCII art; thay thế bằng React Component `IllustrationBox` sư phạm chuẩn mực.
- Khóa chống bẻ dòng và tối ưu giao diện cụm nút Phong cách hiển thị (Bài giảng / Đề thi) trên thanh công cụ.
- Đồng bộ trạng thái License Key, màu sắc Gemini Key và cơ chế chống flash tab khi tải lại trang.

---

## [1.0.0] - 02/09/2026

### ✨ Tính Năng Mới (Features)
- Phát hành phiên bản ổn định chính thức **MathViz Studio v1.0.0 (Stable Release)**.
- Tích hợp Chuỗi Model Cascade Gemini 3 (`gemini-2.5-flash` -> fallback) kèm cơ chế tự động Retry với Random Jitter chống quá tải.
- Hoàn thiện hệ thống quản lý và xác thực bản quyền License Key, bảng điều khiển quản trị viên (Admin Dashboard) và đồng bộ phiên bản.

### 🚀 Cải Tiến & Vá Lỗi
- Loại bỏ model cũ đã ngừng cung cấp và nâng cấp toàn diện thuật toán xử lý lỗi kết nối AI.
- Tối ưu hóa toàn diện hiệu năng và độ chuẩn xác khi tạo hình học phẳng, đường tròn, toán thực tế và mã TikZ LaTeX.

---

## [0.1.3-alpha] - 31/08/2026
- Ra mắt giao diện Dashboard Admin/CTV với thanh điều hướng dọc (Vertical Sidebar).
- Tối ưu hóa layout tạo License Key: cố định khung nhìn, cuộn độc lập và thu gọn mã key.
- Loại bỏ loading toàn trang khi tạo key giúp trải nghiệm mượt mà hơn.
- Cố định cột thao tác và loại bỏ tính năng disable key không cần thiết.

---

## [0.1.2-alpha] - 31/08/2026
- Chuyển đổi toàn bộ định dạng ngày sang chuẩn `dd/MM/yyyy`.
- Thiết lập cơ chế quản lý và hiển thị lịch sử cập nhật phiên bản.

---

## [0.1.1-alpha] - 31/08/2026
- Khắc phục lỗi thanh loading bị dừng ở mốc 74%.
- Điều chỉnh thuật toán tăng % tiến trình mượt mà theo chu kỳ xử lý.
- Tích hợp badge hiển thị phiên bản ứng dụng.

---

## [0.1.0-alpha] - 31/08/2026
- Khởi chạy hệ thống tạo hình học và trực quan hóa toán học đầu tiên.
- Hỗ trợ chuyển đổi Dark / Light Mode cho canvas.
- Hệ thống xác thực và quản lý tài khoản người dùng ban đầu.
