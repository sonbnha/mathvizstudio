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
    version: "v1.2.0",
    date: "05/09/2026",
    title: "Trình Chỉnh Sửa SVG Tương Tác, Chuẩn Hóa LaTeX & Tối Ưu Bố Cục Canvas",
    changes: [
      { type: "feat", description: "Ra mắt Trình chỉnh sửa hình học tương tác (Interactive SVG Editor) cho phép tuỳ biến trực tiếp đối tượng, nét vẽ, màu sắc và nhãn điểm" },
      { type: "feat", description: "Chuẩn hóa bộ đề bài toán thực tế mẫu theo định dạng LaTeX ($...$) tích hợp xem trước công thức toán học sắc nét" },
      { type: "feat", description: "Hoán đổi thanh header Canvas thành thanh định dạng đối tượng ở chế độ chỉnh sửa và hỗ trợ chọn cụm điểm - nhãn thông minh" },
      { type: "improve", description: "Tối ưu hóa bố cục 2 cột cân đối, đưa Bộ sưu tập đã lưu xuống đáy Canvas với thanh tiêu đề đóng/mở tiện lợi" },
      { type: "improve", description: "Tối giản tiêu đề ô nhập liệu và khắc phục triệt để hiện tượng tràn viền, co giật các nút thao tác" },
    ],
  },
  {
    version: "v1.1.0",
    date: "03/09/2026",
    title: "Tích hợp Soạn giáo án 5512, Trình xem Word A4 & Đồng bộ Hình vẽ SVG 2 chiều",
    changes: [
      { type: "feat", description: "Tích hợp module Soạn Kế hoạch bài dạy (Giáo án) chuẩn Công văn 5512/BGDĐT bổ sung Khung Năng lực số, bám sát SGK Kết nối tri thức với cuộc sống" },
      { type: "feat", description: "Ra mắt Trình xem trước giáo án dạng trang giấy Word A4 trực quan kèm thước căn lề chuẩn Nghị định 30/2020/NĐ-CP, phóng to/thu nhỏ và xuất bản file .docx" },
      { type: "feat", description: "Đồng bộ 2 chiều giữa module Vẽ hình học và Giáo án: bấm 'Tạo hình SVG cho bài này' để chuyển sang vẽ và bấm 'Chèn hình này vào Giáo án' để tự động nhúng hình vẽ" },
      { type: "fix", description: "Khắc phục lỗi mất hình ảnh khi xuất file Word (.docx) bằng bộ chuyển đổi Canvas SVG -> PNG tự động nhúng ImageRun" },
      { type: "fix", description: "Cấm AI vẽ hình minh họa bằng ký tự ASCII art; thay thế bằng React Component IllustrationBox sư phạm chuẩn mực" },
      { type: "improve", description: "Khóa chống bẻ dòng và tối ưu giao diện cụm nút Phong cách hiển thị (Bài giảng / Đề thi) trên thanh công cụ" },
      { type: "improve", description: "Đồng bộ trạng thái License Key, màu sắc Gemini Key và cơ chế chống flash tab khi tải lại trang" },
    ],
  },
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

export function parseVersionNumber(v: string): number[] {
  const clean = v.replace(/^v/i, '').split('-')[0];
  return clean.split('.').map((x) => parseInt(x, 10) || 0);
}

export function compareVersions(a: string, b: string): number {
  const partsA = parseVersionNumber(a);
  const partsB = parseVersionNumber(b);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) {
      return numB - numA; // Descending: larger version number comes first
    }
  }
  return 0;
}

export function parseDateVN(dateStr: string): number {
  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    return new Date(dateStr).getTime() || 0;
  } catch {
    return 0;
  }
}

export function sortChangelogsList<T extends { version: string; date: string; createdAt?: Date | string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const vDiff = compareVersions(a.version, b.version);
    if (vDiff !== 0) return vDiff;
    const dateA = parseDateVN(a.date);
    const dateB = parseDateVN(b.date);
    if (dateB !== dateA) return dateB - dateA;
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });
}

export function mergeAndSortChangelogs(
  baseList: VersionRelease[],
  incomingList: any[]
): VersionRelease[] {
  const map = new Map<string, VersionRelease>();

  // 1. First add base static items
  for (const item of baseList) {
    map.set(item.version, item);
  }

  // 2. Merge incoming items from DB
  for (const inc of incomingList) {
    if (!inc || !inc.version) continue;
    const base = map.get(inc.version);
    if (base) {
      map.set(inc.version, {
        ...base,
        title: inc.title || base.title,
        date: inc.date || base.date,
        changes: Array.isArray(inc.changes) && inc.changes.length > 0 ? inc.changes : base.changes,
      });
    } else {
      map.set(inc.version, {
        version: inc.version,
        title: inc.title || '',
        date: inc.date || '',
        changes: Array.isArray(inc.changes) ? inc.changes : [],
      });
    }
  }

  return sortChangelogsList(Array.from(map.values()));
}
