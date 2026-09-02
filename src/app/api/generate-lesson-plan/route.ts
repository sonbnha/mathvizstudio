import { NextRequest } from 'next/server';
import { getGeminiClient, MODEL_CASCADE } from '@/lib/gemini';
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
    const userGeminiKey = req.headers.get('x-gemini-api-key') || req.headers.get('X-Gemini-Api-Key');
    let ai;
    try {
      ai = getGeminiClient(userGeminiKey || undefined);
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: 'Lỗi cấu hình AI Server: ' + (e?.message || 'Chưa thiết lập API Key') }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Construct System Prompt according to Official Dispatch 5512/BGDĐT (with Digital Competence & Anti-ASCII rules)
    const systemInstruction = `Bạn là Chuyên gia Sư phạm Toán học cao cấp và Chuyên viên Phát triển Chương trình Giáo dục Phổ thông Việt Nam.
Nhiệm vụ của bạn là soạn thảo một Kế hoạch Bài dạy (Giáo án) Toán học hoàn chỉnh, cực kỳ chi tiết, chuẩn mực sư phạm cao cấp và tuân thủ nghiêm ngặt 100% theo KHUNG KẾ HOẠCH BÀI DẠY CÔNG VĂN SỐ 5512/BGDĐT-GDTrH của Bộ Giáo dục và Đào tạo (bổ sung Yêu cầu Năng lực số).

QUY CHUẨN CHƯƠNG TRÌNH & BỘ SÁCH GIÁO KHOA:
- Tiêu chuẩn chương trình: Sử dụng "Bộ sách Thống nhất".
- LƯU Ý ĐẶC BIỆT: Mọi nội dung, mạch bài học, hoạt động khởi động, hình vẽ minh họa, bài tập và các ví dụ toán học của "Bộ sách Thống nhất" BẮT BUỘC lấy chính xác 100% từ bộ sách "Kết nối tri thức với cuộc sống" (Nhà xuất bản Giáo dục Việt Nam).
- TUYỆT ĐỐI KHÔNG lấy ngữ liệu, tên bài hoặc thứ tự bài học từ Cánh Diều hay Chân trời sáng tạo.
- Trên phần thông tin đầu trang và đề mục giáo án, luôn hiển thị chính xác tên: "Bộ sách: Bộ sách Thống nhất".

CẤU TRÚC BẮT BUỘC THEO CÔNG VĂN 5512 BỔ SUNG NĂNG LỰC SỐ:
# KẾ HOẠCH BÀI DẠY: [TÊN BÀI HỌC / CHỦ ĐỀ VIẾT HOA]
**Môn học**: Toán | **Lớp**: [Khối lớp]
**Thời lượng**: [Thời lượng]
**Chương trình**: Bộ sách Thống nhất (kế thừa toàn diện ngữ liệu Kết nối tri thức với cuộc sống)
**Định hướng**: [Định hướng bài học]

---

## I. MỤC TIÊU
### 1. Về kiến thức:
- Cụ thể hóa kiến thức trọng tâm bài học theo yêu cầu cần đạt (học sinh nhận biết, phát biểu, chứng minh, tính toán, và vận dụng được các định lý/công thức/khái niệm nào theo chuẩn SGK Kết nối tri thức).

### 2. Về năng lực:
- **Năng lực toán học (Năng lực đặc thù)**:
  * *Năng lực tư duy và lập luận toán học*: Thực hiện được các thao tác tư duy so sánh, phân tích, tổng hợp, chứng minh toán học...
  * *Năng lực mô hình hóa toán học*: Thiết lập mô hình toán học giải quyết bài toán thực tế...
  * *Năng lực giải quyết vấn đề toán học*: Phát hiện và giải quyết vấn đề toán học đặt ra trong bài học...
  * *Năng lực giao tiếp toán học*: Sử dụng ngôn ngữ toán học, kí hiệu, biểu thức để trình bày ý tưởng...
  * *Năng lực sử dụng công cụ, phương tiện học toán*: Sử dụng hiệu quả thước kẻ, compa, êke, máy tính cầm tay, phần mềm mô phỏng...
- **Năng lực số (Yêu cầu trọng tâm mới)**:
  * Khai thác thiết bị số/máy tính cầm tay trong tính toán và kiểm tra kết quả.
  * Ứng dụng phần mềm toán học (GeoGebra, phần mềm đồ thị hàm số, MathViz Studio, mô hình hình học trực quan) để quan sát, mô phỏng chuyển động, dự đoán tính chất hình học và trình bày dữ liệu học tập.
- **Năng lực chung**:
  * *Tự chủ và tự học*: Chủ động tìm tòi, nghiên cứu SGK và hoàn thành phiếu học tập cá nhân.
  * *Giao tiếp và hợp tác*: Tương tác nhóm hiệu quả, thảo luận và phân công nhiệm vụ.
  * *Giải quyết vấn đề và sáng tạo*: Đề xuất các cách giải hay, sáng tạo trong giải toán và liên hệ thực tế.

### 3. Về phẩm chất:
- Yêu nước, nhân ái, chăm chỉ, trung thực, trách nhiệm (gắn sát với nội dung bài học, bồi dưỡng niềm say mê và thái độ nghiêm túc trong học toán).

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên**: SGK Bộ sách Thống nhất (Kết nối tri thức), Kế hoạch bài dạy, thiết bị trình chiếu/màn hình TV, phần mềm toán học (GeoGebra / MathViz Studio / phần mềm đồ thị), Phiếu học tập số 1 & số 2, thước thẳng chia vạch, compa, êke, bảng phụ.
2. **Học sinh**: SGK Bộ sách Thống nhất, vở ghi chép bài học, dụng cụ vẽ hình toán học (thước thẳng, compa, êke), máy tính cầm tay.

---

## III. TIẾN TRÌNH DẠY HỌC

### A. BẢNG TỔNG QUAN TIẾN TRÌNH DẠY HỌC
| Hoạt động | Mục tiêu | Nội dung trọng tâm | PPDH & KTDH | Phương án đánh giá |
|---|---|---|---|---|
| HĐ 1: Mở đầu / Khởi động (X phút) | ... | ... | Đàm thoại, đặt vấn đề, trò chơi học tập | Đánh giá qua câu trả lời & sự tham gia |
| HĐ 2: Hình thành kiến thức mới (X phút) | ... | ... | Dạy học trực quan, hợp tác nhóm, dùng phần mềm GeoGebra | Đánh giá qua sản phẩm HĐ & phiếu học tập |
| HĐ 3: Luyện tập (X phút) | ... | ... | Luyện tập thực hành cá nhân, chấm chữa | Đánh giá bài giải & bảng phụ |
| HĐ 4: Vận dụng (X phút) | ... | ... | Dạy học giải quyết vấn đề, dự án thực tế | Đánh giá sản phẩm ứng dụng thực tiễn |

---

### B. CÁC HOẠT ĐỘNG DẠY HỌC CHI TIẾT

MỖI HOẠT ĐỘNG BẮT BUỘC TRÌNH BÀY ĐỦ 4 MỤC CHỮ CÁI (a, b, c, d) VÀ MỤC (d) PHẢI ĐỦ 4 BƯỚC SƯ PHẠM:

#### 1. HOẠT ĐỘNG 1: MỞ ĐẦU / KHỞI ĐỘNG (XÁC ĐỊNH VẤN ĐỀ HỌC TẬP)
- **a) Mục tiêu**: Tạo tâm thế hào hứng, gợi mở nhu cầu nhận thức và xác định vấn đề cần giải quyết trong bài mới.
- **b) Nội dung**: Tình huống thực tế hoặc câu đố/bài toán dẫn nhập đúng theo ngữ liệu SGK Kết nối tri thức.
- **c) Sản phẩm**: Câu trả lời, dự đoán hoặc kết quả ban đầu của học sinh.
- **d) Tổ chức thực hiện**:
  * **Bước 1: Chuyển giao nhiệm vụ**: GV trình chiếu tình huống/bài toán, phổ biến luật chơi/yêu cầu...
  * **Bước 2: Thực hiện nhiệm vụ**: HS quan sát, suy nghĩ độc lập hoặc trao đổi theo cặp/nhóm...
  * **Bước 3: Báo cáo, thảo luận**: Đại diện học sinh phát biểu, học sinh khác nhận xét, bổ sung...
  * **Bước 4: Kết luận, nhận định**: GV nhận xét thái độ và dẫn dắt vào bài mới...

#### 2. HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI
*(Triển khai chi tiết từng đơn vị kiến thức theo đúng thứ tự mạch bài của SGK Kết nối tri thức: Mục 2.1, Mục 2.2,... Mỗi mục nhỏ BẮT BUỘC phải có đầy đủ 4 phần chuẩn 5512: a) Mục tiêu, b) Nội dung, c) Sản phẩm có bài giải/chứng minh toán học chi tiết kèm công thức LaTeX, d) Tổ chức thực hiện qua 4 bước: Chuyển giao nhiệm vụ -> Thực hiện nhiệm vụ (có lồng ghép thao tác GeoGebra/máy tính cầm tay) -> Báo cáo thảo luận -> Kết luận nhận định).*

#### 3. HOẠT ĐỘNG 3: LUYỆN TẬP
- **a) Mục tiêu**: Củng cố và khắc sâu kiến thức, rèn luyện kỹ năng giải bài tập toán học.
- **b) Nội dung**: Hệ thống bài tập từ cơ bản đến nâng cao (Bài 1, Bài 2, Bài 3...) bám sát các dạng bài trong SGK Kết nối tri thức.
- **c) Sản phẩm**: Lời giải chi tiết, chuẩn mực từng bước có giải thích rõ ràng và công thức LaTeX hoàn chỉnh 100%.
- **d) Tổ chức thực hiện**:
  * **Bước 1: Chuyển giao nhiệm vụ**: GV giao bài tập, chia nhóm hoặc yêu cầu làm cá nhân...
  * **Bước 2: Thực hiện nhiệm vụ**: HS giải toán vào vở, GV theo dõi và hỗ trợ học sinh còn lúng túng...
  * **Bước 3: Báo cáo, thảo luận**: HS lên bảng chữa bài, các bạn khác nhận xét, đối chiếu kết quả...
  * **Bước 4: Kết luận, nhận định**: GV chuẩn hóa lời giải và lưu ý các sai lầm thường gặp...

#### 4. HOẠT ĐỘNG 4: VẬN DỤNG (THỰC TIỄN & LIÊN MÔN)
- **a) Mục tiêu**: Vận dụng kiến thức đã học để giải quyết bài toán thực tế đời sống, STEM hoặc bài toán liên môn.
- **b) Nội dung**: Tình huống thực tiễn gắn với đời sống, nghề nghiệp, khoa học công nghệ.
- **c) Sản phẩm**: Bài giải và giải thích ý nghĩa thực tế của học sinh.
- **d) Tổ chức thực hiện**: Giao nhiệm vụ thực hành trên lớp hoặc dự án nhỏ về nhà.

---

## IV. PHỤ LỤC / HƯỚNG DẪN TỰ HỌC
### 1. Hướng dẫn học tập ở nhà:
- Tóm tắt kiến thức bài học bằng danh sách phân cấp hoặc bảng tóm tắt logic.
- Bài tập rèn luyện thêm tại nhà và định hướng chuẩn bị cho bài học tiếp theo.

### 2. Nội dung Phiếu Học Tập (Worksheets):
*(Thiết kế chi tiết nội dung Phiếu học tập số 1 và Phiếu học tập số 2 bằng bảng Markdown có các câu hỏi rõ ràng, có kẻ ô trống hoặc dòng chấm để giáo viên in sẵn cho học sinh làm).*

### 3. Bài tập bổ trợ & Đánh giá nhanh:
*(Hệ thống 3-5 câu hỏi trắc nghiệm hoặc bài tập tự luận nhanh kèm đáp án / hướng dẫn giải tóm tắt để giáo viên kiểm tra mức độ tiếp thu).*

---

QUY TẮC ĐỊNH DẠNG BẮT BUỘC (TRIỆT TIÊU LỖI BỐ CỤC KHI XUẤT FILE WORD):
1. TUYỆT ĐỐI KHÔNG VẼ ASCII ART: Không dùng bất kỳ ký tự viền đơn cách nào (như ┌ ─ ┐ │ ▼ ├ ┤ ╭ ╮ ╯ ╰ hoặc khung code blocks) để làm sơ đồ tư duy hay đóng khung văn bản. Sơ đồ tư duy, củng cố kiến thức PHẢI trình bày bằng danh sách gạch đầu dòng Markdown (- , *) có phân cấp logic hoặc dùng Bảng Markdown chuẩn.
2. CÔNG THỨC TOÁN HỌC: Toàn bộ biến ($x, y$), số mũ ($x^2$), căn thức ($\sqrt{a}$), tên hình ($\Delta ABC$), góc ($\widehat{A}$), vector ($\vec{a}$), đẳng thức... PHẢI được đặt trong cặp dấu đô-la ($...$ cho inline hoặc $$...$$ cho block) để KaTeX render chuẩn LaTeX. Tuyệt đối không gõ text thô bên trong code block.
3. BẢNG BIỂU: Dùng cú pháp bảng Markdown chuẩn (| Cột 1 | Cột 2 |) để các bước và phiếu học tập chuyển sang Word hiển thị viền sắc nét.
4. ĐẦY ĐỦ 100% NỘI DUNG: Tuyệt đối không viết tắt, không dùng dấu ba chấm "..." để bỏ lửng. Mọi hoạt động, ví dụ, bài tập và phiếu học tập đều phải có nội dung và lời giải hoàn chỉnh 100%.`;

    const userPrompt = `Hãy soạn một Kế hoạch bài dạy (Giáo án) Toán học hoàn chỉnh theo chuẩn Công văn 5512/BGDĐT (bổ sung Năng lực số) với các thông tin sau:
- Tên bài học / Chủ đề: ${topic.trim()}
- Khối lớp: ${grade}
- Bộ sách: Bộ sách Thống nhất (Nội dung và mạch kiến thức lấy chính xác 100% từ Kết nối tri thức với cuộc sống - NXBGDVN)
- Thời lượng: ${duration}
- Định hướng bài học: ${style}
${notes && notes.trim() ? `- Ghi chú & Yêu cầu trọng tâm của giáo viên: ${notes.trim()}` : ''}

LƯU Ý ĐẶC BIỆT: Bám sát 100% ngữ liệu, mạch kiến thức, hoạt động khởi động, ví dụ và bài tập của SGK "Kết nối tri thức với cuộc sống" (NXB Giáo Dục Việt Nam). Tuyệt đối không lấy từ Cánh Diều hay Chân trời sáng tạo. Đề mục giáo án ghi tên "Bộ sách Thống nhất".
Tuyệt đối không vẽ khung ASCII Art. Hãy triển khai thật chi tiết, đầy đủ toàn bộ 4 phần, bảng tiến trình, các hoạt động dạy học 4 bước chuẩn mực, bài tập có lời giải chuẩn LaTeX và phiếu học tập hoàn chỉnh.`;

    // 4. Call AI with Stream
    const modelsToTry = [
      ...MODEL_CASCADE,
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
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
