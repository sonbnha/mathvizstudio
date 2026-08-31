export interface VersionRelease {
  version: string;
  date: string;
  title: string;
  changes: {
    type: "feat" | "fix" | "improve";
    description: string;
  }[];
}

export const CHANGELOG: VersionRelease[] = [
  {
    version: "v0.1.5-alpha",
    date: "31/08/2026",
    title: "Chuẩn hóa Hình học Toán học SVG & Tối ưu AI Engine",
    changes: [
      { type: "feat", description: "Ra mắt Kiến trúc phân lớp SVG (SVG Layering): Đặt khung hình học toán học làm trọng tâm hàng đầu" },
      { type: "fix", description: "Chuẩn hóa vị trí Mặt Trời thẳng hàng (Collinear Sun Position) với tia sáng trong bài toán bóng nắng" },
      { type: "improve", description: "Tối ưu System Prompt và bộ lọc loại bỏ 100% chữ thừa, tiêu đề, và ghi chú mô tả trong SVG" },
      { type: "feat", description: "Tích hợp Gemini 3.5 Flash siêu tốc kèm cơ chế tự động Fallback đa tầng chống nghẽn mạng" },
      { type: "fix", description: "Phân biệt rõ ràng lỗi License Key hết hạn/hết lượt với lỗi quá tải AI Quota (ngăn chặn popup BYOK nhầm)" },
    ],
  },
  {
    version: "v0.1.4-alpha",
    date: "31/08/2026",
    title: "Hỗ trợ Gemini API Key cá nhân (BYOK) & Nâng cấp Model",
    changes: [
      { type: "feat", description: "Bổ sung tính năng tự cấu hình Gemini API Key cá nhân (BYOK) trên giao diện" },
      { type: "feat", description: "Tự động hiển thị pop-up hướng dẫn lấy key miễn phí khi hệ thống gặp lỗi quá tải" },
      { type: "fix", description: "Cập nhật model Gemini API mới nhất tương thích hệ thống (gemini-3.6-flash)" },
    ],
  },
  {
    version: "v0.1.3-alpha",
    date: "31/08/2026",
    title: "Tối ưu Quản lý License Keys & Nâng cấp Giao diện Admin",
    changes: [
      { type: "feat", description: "Ra mắt giao diện Dashboard Admin/CTV với thanh điều hướng dọc (Vertical Sidebar)" },
      { type: "improve", description: "Tối ưu hóa layout tạo License Key: cố định khung nhìn, cuộn độc lập và thu gọn mã key" },
      { type: "improve", description: "Loại bỏ loading toàn trang khi tạo key giúp trải nghiệm mượt mà hơn" },
      { type: "fix", description: "Cố định cột thao tác và loại bỏ tính năng disable key không cần thiết" },
    ],
  },
  {
    version: "v0.1.2-alpha",
    date: "31/08/2026",
    title: "Cập nhật định dạng ngày & Chuẩn hóa Changelog",
    changes: [
      { type: "improve", description: "Chuyển đổi toàn bộ định dạng ngày sang chuẩn dd/MM/yyyy" },
      { type: "feat", description: "Thiết lập cơ chế quản lý và hiển thị lịch sử cập nhật phiên bản" },
    ],
  },
  {
    version: "v0.1.1-alpha",
    date: "31/08/2026",
    title: "Tối ưu hóa tiến trình & Fix kẹt loading",
    changes: [
      { type: "fix", description: "Khắc phục lỗi thanh loading bị dừng ở mốc 74%" },
      { type: "improve", description: "Điều chỉnh thuật toán tăng % tiến trình mượt mà theo chu kỳ xử lý" },
      { type: "feat", description: "Tích hợp badge hiển thị phiên bản ứng dụng" },
    ],
  },
  {
    version: "v0.1.0-alpha",
    date: "31/08/2026",
    title: "Khởi tạo MathViz Studio Alpha",
    changes: [
      { type: "feat", description: "Khởi chạy hệ thống tạo hình học và trực quan hóa toán học" },
      { type: "feat", description: "Hỗ trợ chuyển đổi Dark / Light Mode cho canvas" },
      { type: "feat", description: "Hệ thống xác thực và quản lý tài khoản người dùng" },
    ],
  },
];
