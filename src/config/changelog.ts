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
    version: "v0.1.3-alpha",
    date: "31/08/2026",
    title: "Quản lý Changelog trong Admin & API động",
    changes: [
      { type: "feat", description: "Bổ sung model Changelog và đồng bộ Neon Database" },
      { type: "feat", description: "Xây dựng hệ thống API quản lý Changelog (CRUD) bảo mật" },
      { type: "feat", description: "Giao diện quản lý và chỉnh sửa Changelog với dynamic rows trong Admin" },
      { type: "improve", description: "Cửa sổ Changelog ngoài trang chủ tự động fetch dữ liệu theo thời gian thực" },
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
