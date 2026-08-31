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
    version: "v0.1.1-alpha",
    date: "2026-08-31",
    title: "Tối ưu hóa tiến trình & Fix kẹt loading",
    changes: [
      { type: "fix", description: "Khắc phục lỗi thanh loading bị dừng ở mốc 74%" },
      { type: "improve", description: "Điều chỉnh thuật toán tăng % tiến trình mượt mà theo chu kỳ xử lý" },
      { type: "feat", description: "Tích hợp badge hiển thị phiên bản ứng dụng" },
    ],
  },
  {
    version: "v0.1.0-alpha",
    date: "2026-08-31",
    title: "Khởi tạo MathViz Studio Alpha",
    changes: [
      { type: "feat", description: "Khởi chạy hệ thống tạo hình học và trực quan hóa toán học" },
      { type: "feat", description: "Hỗ trợ chuyển đổi Dark / Light Mode cho canvas" },
      { type: "feat", description: "Hệ thống xác thực và quản lý tài khoản người dùng" },
    ],
  },
];
