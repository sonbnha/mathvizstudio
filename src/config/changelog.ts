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
    version: "v1.0.0",
    date: "02/09/2026",
    title: "Phát Hành Chính Thức MathViz Studio v1.0.0 (Stable Release)",
    changes: [
      { type: "feat", description: "Phát hành phiên bản ổn định chính thức MathViz Studio v1.0.0" },
      { type: "feat", description: "Tích hợp Chuỗi Model Cascade Gemini 3 (3.6-flash -> 3.5-flash) kèm cơ chế tự động Retry với Random Jitter chống quá tải" },
      { type: "fix", description: "Loại bỏ model cũ đã ngừng cung cấp và nâng cấp toàn diện thuật toán xử lý lỗi kết nối AI" },
      { type: "improve", description: "Tối ưu hóa toàn diện hiệu năng và độ chuẩn xác khi tạo hình học phẳng, đường tròn, toán thực tế và mã TikZ LaTeX" },
      { type: "feat", description: "Hoàn thiện hệ thống quản lý và xác thực bản quyền License Key, bảng điều khiển quản trị viên và đồng bộ phiên bản" },
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
