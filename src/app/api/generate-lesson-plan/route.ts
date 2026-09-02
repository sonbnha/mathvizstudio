import { NextRequest } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      grade = 'Lớp 9',
      book = 'Bộ sách Thống nhất',
      duration = '2 tiết (90 phút)',
      notes = '',
      style = 'Chuẩn 5512',
      licenseKey,
    } = body;

    if (!topic || !topic.trim()) {
      return new Response(
        JSON.stringify({ error: 'Vui lòng nhập tên bài học hoặc chủ đề cần soạn giáo án.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. License key validation & credit deduction (if provided)
    let keyRecord: any = null;
    if (licenseKey && typeof licenseKey === 'string' && licenseKey.trim() !== '') {
      keyRecord = await prisma.licenseKey.findUnique({
        where: { key: licenseKey.trim().toUpperCase() },
      });

      if (!keyRecord) {
        return new Response(
          JSON.stringify({ error: 'License key không tồn tại trong hệ thống.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!keyRecord.isActive) {
        return new Response(
          JSON.stringify({ error: 'License key này đã bị vô hiệu hóa.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'License key này đã hết hạn sử dụng.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (keyRecord.totalCredits !== -1 && keyRecord.usedCredits >= keyRecord.totalCredits) {
        return new Response(
          JSON.stringify({ error: 'License key này đã sử dụng hết số lượt (Credits) khả dụng.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Deduct credit
      if (keyRecord.totalCredits !== -1) {
        await prisma.licenseKey.update({
          where: { id: keyRecord.id },
          data: { usedCredits: { increment: 1 } },
        });
      }
    }

    // 2. Initialize Gemini Client
    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: 'Lỗi cấu hình AI Server: ' + (e?.message || 'Chưa thiết lập API Key') }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Construct System Prompt according to Official Dispatch 5512/BGDĐT
    const systemInstruction = `Bạn là Chuyên gia Sư phạm Toán học cao cấp và Chuyên viên Phát triển Chương trình Giáo dục Phổ thông Việt Nam.
Nhiệm vụ của bạn là soạn thảo một Kế hoạch Bài dạy (Giáo án) Toán học hoàn chỉnh, cực kỳ chi tiết, chuẩn mực sư phạm cao cấp và tuân thủ nghiêm ngặt theo KHUNG KẾ HOẠCH BÀI DẠY CÔNG VĂN SỐ 5512/BGDĐT-GDTrH của Bộ Giáo dục và Đào tạo.

QUY CHUẨN CHƯƠNG TRÌNH & BỘ SÁCH GIÁO KHOA:
- Tiêu chuẩn chương trình: Sử dụng "Bộ sách Thống nhất".
- LƯU Ý ĐẶC BIỆT: Mọi nội dung, mạch bài học, hoạt động khởi động, hình vẽ minh họa, bài tập và các ví dụ toán học của "Bộ sách Thống nhất" BẮT BUỘC lấy chính xác 100% từ bộ sách "Kết nối tri thức với cuộc sống" (Nhà xuất bản Giáo dục Việt Nam).
- TUYỆT ĐỐI KHÔNG lấy ngữ liệu, tên bài hoặc thứ tự bài học từ Cánh Diều hay Chân trời sáng tạo.
- Trên phần thông tin đầu trang và bảng giáo án, luôn hiển thị chính xác tên: "Bộ sách: Bộ sách Thống nhất".

CẤU TRÚC BẮT BUỘC THEO CÔNG VĂN 5512:
# KẾ HOẠCH BÀI DẠY: [TÊN BÀI HỌC VIẾT HOA]
**Môn học**: Toán | **Khối lớp**: [Lớp] | **Bộ sách**: Bộ sách Thống nhất | **Thời lượng**: [Thời lượng]
**Định hướng**: [Phong cách/Mức độ]

---

## I. MỤC TIÊU BÀI HỌC
### 1. Về kiến thức:
- Nêu rõ các yêu cầu cần đạt (học sinh nhận biết, phát biểu, chứng minh, tính toán, và vận dụng được các định lý/công thức nào theo chuẩn SGK Kết nối tri thức).

### 2. Về năng lực:
- **Năng lực toán học đặc thù**:
  * *Năng lực tư duy và lập luận toán học*: ...
  * *Năng lực mô hình hóa toán học*: ...
  * *Năng lực giải quyết vấn đề toán học*: ...
  * *Năng lực giao tiếp toán học*: ...
  * *Năng lực sử dụng công cụ, phương tiện học toán*: ...
- **Năng lực chung**: Tự chủ và tự học, giao tiếp và hợp tác, giải quyết vấn đề và sáng tạo.

### 3. Về phẩm chất:
- Chăm chỉ, trung thực, trách nhiệm, bồi dưỡng niềm say mê toán học.

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên**: SGK Bộ sách Thống nhất (Kết nối tri thức), Kế hoạch bài dạy, thước thẳng chia vạch, compa, êke, máy chiếu/bảng phụ, phiếu học tập số 1 & số 2, phần mềm mô phỏng (GeoGebra / MathViz Studio).
2. **Học sinh**: SGK, vở ghi chép, dụng cụ vẽ hình toán học (thước, compa, máy tính cầm tay).

---

## III. TIẾN TRÌNH DẠY HỌC

### A. BẢNG TỔNG QUAN TIẾN TRÌNH DẠY HỌC
| Hoạt động | Mục tiêu | Nội dung trọng tâm | PPDH & KTDH | Phương án đánh giá |
|---|---|---|---|---|
| HĐ 1: Mở đầu / Khởi động (X phút) | ... | ... | Đàm thoại, đặt vấn đề | Đánh giá qua câu trả lời |
| HĐ 2: Hình thành kiến thức (X phút) | ... | ... | Dạy học hợp tác, trực quan | Đánh giá qua sản phẩm HĐ |
| HĐ 3: Luyện tập (X phút) | ... | ... | Luyện tập thực hành cá nhân | Đánh giá bài tập/bảng phụ |
| HĐ 4: Vận dụng (X phút) | ... | ... | Dạy học giải quyết vấn đề | Đánh giá sản phẩm thực tế |

---

### B. CÁC HOẠT ĐỘNG DẠY HỌC CHI TIẾT

#### 1. HOẠT ĐỘNG 1: MỞ ĐẦU / KHỞI ĐỘNG (XÁC ĐỊNH VẤN ĐỀ)
- **a) Mục tiêu**: Tạo tâm thế hào hứng, gợi mở nhu cầu nhận thức kiến thức mới.
- **b) Nội dung**: Tình huống thực tế hoặc câu đố/bài toán dẫn nhập đúng theo ngữ liệu SGK Kết nối tri thức.
- **c) Sản phẩm**: Câu trả lời, dự đoán ban đầu của học sinh.
- **d) Tổ chức thực hiện**:
  * **Bước 1: Chuyển giao nhiệm vụ**: GV trình chiếu tình huống/bài toán...
  * **Bước 2: Thực hiện nhiệm vụ**: HS suy nghĩ, trao đổi theo cặp...
  * **Bước 3: Báo cáo, thảo luận**: Đại diện học sinh phát biểu, học sinh khác nhận xét...
  * **Bước 4: Kết luận, nhận định**: GV nhận xét thái độ và dẫn dắt vào bài mới...

#### 2. HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI
*(Triển khai chi tiết từng đơn vị kiến thức theo đúng thứ tự mạch bài của SGK Kết nối tri thức: Mục 2.1, Mục 2.2,... Mỗi mục bắt buộc phải có đầy đủ 4 phần chuẩn 5512: a) Mục tiêu, b) Nội dung, c) Sản phẩm có bài giải/chứng minh toán học chi tiết kèm công thức LaTeX, d) Tổ chức thực hiện qua 4 bước: Chuyển giao nhiệm vụ -> Thực hiện nhiệm vụ -> Báo cáo thảo luận -> Kết luận nhận định).*

#### 3. HOẠT ĐỘNG 3: LUYỆN TẬP
- **a) Mục tiêu**: Củng cố và khắc sâu kiến thức, rèn luyện kỹ năng giải bài tập toán học.
- **b) Nội dung**: Hệ thống bài tập từ cơ bản đến nâng cao (Bài 1, Bài 2, Bài 3...) bám sát các dạng bài trong SGK.
- **c) Sản phẩm**: Lời giải chi tiết, chuẩn mực từng bước có giải thích rõ ràng và công thức LaTeX.
- **d) Tổ chức thực hiện**: Tổ chức chia nhóm hoặc làm việc cá nhân có chấm chữa chi tiết.

#### 4. HOẠT ĐỘNG 4: VẬN DỤNG (THỰC TIỄN)
- **a) Mục tiêu**: Vận dụng kiến thức đã học để giải quyết bài toán thực tế đời sống hoặc STEM.
- **b) Nội dung**: Tình huống thực tiễn gắn với đời sống, nghề nghiệp, khoa học.
- **c) Sản phẩm**: Bài giải và giải thích ý nghĩa thực tế của học sinh.
- **d) Tổ chức thực hiện**: Giao nhiệm vụ thực hành hoặc dự án nhỏ về nhà.

---

## IV. HỒ SƠ DẠY HỌC & HƯỚNG DẪN TỰ HỌC
### 1. Hướng dẫn tự học ở nhà:
- Tóm tắt sơ đồ tư duy kiến thức bài học.
- Bài tập rèn luyện thêm tại nhà và định hướng bài học tiếp theo.

### 2. Phụ lục: Phiếu Học Tập (Worksheets):
*(Thiết kế chi tiết nội dung Phiếu học tập số 1 và Phiếu học tập số 2 với các câu hỏi rõ ràng, có kẻ ô đáp án để giáo viên in sẵn cho học sinh).*

QUY TẮC BẮT BUỘC:
1. Toàn bộ công thức toán học PHẢI viết bằng LaTeX chuẩn: $công_thức$ (inline) hoặc $$công_thức$$ (block).
2. Nội dung xuất ra phải là Markdown chuẩn mực, rõ ràng, không dùng các ký hiệu thừa.
3. TUYỆT ĐỐI KHÔNG viết tắt, không dùng dấu ba chấm "..." để bỏ lửng. Mọi hoạt động, ví dụ, bài tập và phiếu học tập đều phải có nội dung và lời giải hoàn chỉnh 100%.`;

    const userPrompt = `Hãy soạn một Kế hoạch bài dạy (Giáo án) Toán học hoàn chỉnh theo chuẩn Công văn 5512/BGDĐT với các thông tin sau:
- Tên bài học / Chủ đề: ${topic.trim()}
- Khối lớp: ${grade}
- Bộ sách: Bộ sách Thống nhất (Nội dung và mạch kiến thức lấy chính xác 100% từ Kết nối tri thức với cuộc sống - NXBGDVN)
- Thời lượng: ${duration}
- Định hướng bài học: ${style}
${notes && notes.trim() ? `- Ghi chú & Yêu cầu trọng tâm của giáo viên: ${notes.trim()}` : ''}

LƯU Ý ĐẶC BIỆT: Bám sát 100% ngữ liệu, mạch kiến thức, hoạt động khởi động, ví dụ và bài tập của SGK "Kết nối tri thức với cuộc sống" (NXB Giáo Dục Việt Nam). Tuyệt đối không lấy từ Cánh Diều hay Chân trời sáng tạo. Đề mục giáo án ghi tên "Bộ sách Thống nhất".
Hãy triển khai thật chi tiết, đầy đủ toàn bộ các phần, bảng tiến trình, các hoạt động dạy học 4 bước, bài tập có lời giải chuẩn LaTeX và phiếu học tập hoàn chỉnh.`;

    // 4. Call AI with Stream
    const modelsToTry = [
      process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => a.indexOf(v) === i);

    let responseStream: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI Stream] Bắt đầu tạo luồng giáo án với model: ${modelName}...`);
        responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents: [userPrompt],
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
        if (responseStream) {
          console.log(`[AI Stream] Đã kết nối luồng thành công với model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[AI Stream] Model ${modelName} gặp lỗi: ${err?.message || ''}. Chuyển model kế tiếp...`);
        lastError = err;
      }
    }

    if (!responseStream) {
      throw new Error(`Không thể khởi tạo luồng dữ liệu AI: ${lastError?.message || 'Tất cả model đều bận'}`);
    }

    // 5. Pipe Stream to Client immediately
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err: any) {
          console.error('[AI Stream] Lỗi khi stream chunk:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error generating lesson plan:', error);
    const errorMessage =
      error?.message || 'Có lỗi xảy ra khi tạo kế hoạch bài dạy. Vui lòng thử lại sau.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
