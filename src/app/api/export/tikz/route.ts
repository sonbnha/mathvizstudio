import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function extractTikzOnly(rawText: string): string {
  const match = rawText.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/i);
  if (match) {
    return match[0].trim();
  }
  return rawText.replace(/```latex|```tex|```/g, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via Header X-License-Key or Account VIP
    const currentUser = await getCurrentUserFromRequest(req);
    const isAccountVip = Boolean(
      currentUser && (
        ['admin', 'ctv'].includes((currentUser.role || '').toLowerCase()) ||
        currentUser.isVip ||
        (currentUser as any).is_vip
      )
    );

    if (!isAccountVip) {
      const licenseKey = req.headers.get('x-license-key') || req.headers.get('X-License-Key');
      if (!licenseKey) {
        return NextResponse.json(
          { error: 'Thiếu License Key trong Header X-License-Key.' },
          { status: 403 }
        );
      }

      const keyRecord = await prisma.licenseKey.findUnique({
        where: { key: licenseKey.trim() },
      });

      if (!keyRecord || !keyRecord.isActive) {
        return NextResponse.json(
          { error: 'License key không hợp lệ hoặc đã bị khóa.' },
          { status: 403 }
        );
      }

      if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: 'License key đã hết hạn sử dụng.' },
          { status: 403 }
        );
      }
    }

    // 2. Parse request payload
    let body: { svg?: string; prompt?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { svg, prompt } = body;
    if (!svg && !prompt) {
      return NextResponse.json(
        { error: 'Cần cung cấp mã SVG hoặc đề bài toán để chuyển đổi sang TikZ.' },
        { status: 400 }
      );
    }

    // 3. Gemini API setup
    const userGeminiKey = req.headers.get('x-gemini-api-key') || req.headers.get('X-Gemini-Api-Key');
    let ai;
    try {
      ai = getGeminiClient(userGeminiKey || undefined);
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Lỗi cấu hình AI Server: ' + (e?.message || 'Chưa thiết lập API Key') },
        { status: 500 }
      );
    }

    const systemInstruction = `Bạn là chuyên gia LaTeX và gói đồ họa TikZ hàng đầu phục vụ soạn thảo tài liệu toán học THCS/THPT tại Việt Nam.
Nhiệm vụ của bạn là chuyển đổi mô hình hình học từ mã SVG hoặc đề bài toán sang MÃ TIKZ / LATEX CHUẨN XÁC để giáo viên có thể dán trực tiếp vào Overleaf hoặc tài liệu LaTeX mà không bị lỗi biên dịch.

QUY TẮC BẮT BUỘC:
1. CHỈ xuất ra duy nhất khối môi trường bắt đầu bằng:
\\begin{tikzpicture}[scale=1, >=stealth, font=\\small]
và kết thúc bằng:
\\end{tikzpicture}
TUYỆT ĐỐI KHÔNG viết lời mở đầu, không giải thích, không kèm preamble (\\documentclass...).

2. CẤU TRÚC MÃ TIKZ CHUẨN:
- Khai báo tọa độ các điểm bằng \\coordinate (A) at (x, y); với tỉ lệ hình học cân đối, kích thước nằm trong khoảng 0cm đến 8cm.
- Vẽ các cạnh chính: \\draw[thick] (A) -- (B) -- (C) -- cycle;
- Vẽ đường ngắm / đường gióng / chiều cao ẩn: \\draw[dashed] (A) -- (H);
- Đánh dấu góc vuông: Dùng lệnh vẽ góc vuông chuẩn (ví dụ: \\draw (H) rectangle +(0.25,0.25); hoặc tương đương).
- Đánh dấu cung góc và số đo góc: \\draw (B) +(0:0.5) arc (0:60:0.5); kèm node số đo (ví dụ: 60$^{\\circ}$).
- Tên điểm đỉnh: \\node[above] at (A) {$A$}; \\node[below left] at (B) {$B$};
- Nhãn kích thước số đo: Dùng \\node[midway, fill=white, inner sep=1.5pt] để không bị đè lên đường nét vẽ.
- Chấm tròn đỉnh: \\fill (A) circle (1.5pt);

3. Đảm bảo toàn bộ ký hiệu toán học đặt trong cặp dấu $...$ (ví dụ: $A$, $B$, $60^{\\circ}$, $h = ?$).`;

    const userPrompt = `Hãy chuyển đổi hình học sau sang mã TikZ hoàn chỉnh:\n${
      svg ? `Mã SVG:\n${svg}\n` : ''
    }${prompt ? `Đề bài:\n${prompt}` : ''}`;

    const MODEL_CASCADE = [
      process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
    ].filter((v, i, a) => a.indexOf(v) === i);

    let response: any = null;
    let lastError: any = null;
    const maxRetriesPerModel = 2;

    for (const modelName of MODEL_CASCADE) {
      for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
        try {
          console.log(
            `[TikZ API Cascade] Đang thử với model: ${modelName} (Lần thử ${attempt + 1}/${maxRetriesPerModel + 1})...`
          );
          response = await ai.models.generateContent({
            model: modelName,
            contents: [userPrompt],
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });
          if (response?.text) {
            console.log(`[TikZ API Cascade] Thành công với model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const statusCode = err?.status || err?.statusCode || err?.response?.status;
          const errMsg = String(err?.message || '').toLowerCase();

          const isSpike =
            statusCode === 503 ||
            statusCode === 429 ||
            errMsg.includes('503') ||
            errMsg.includes('429') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('resource exhausted');

          if (isSpike && attempt < maxRetriesPerModel) {
            const delay = (attempt + 1) * 1200 + Math.random() * 500;
            console.warn(
              `[TikZ API Cascade] Model ${modelName} gặp lỗi tạm thời (${statusCode || 'Spike'}). Thử lại sau ${Math.round(delay)}ms...`
            );
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }

          console.warn(
            `[TikZ API Cascade] Model ${modelName} gặp lỗi (${statusCode || 'Unknown'}): ${err?.message || ''}. Chuyển model kế tiếp...`
          );
          break;
        }
      }
      if (response?.text) {
        break;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Không thể sinh mã TikZ vào lúc này. Toàn bộ model đều không khả dụng.');
    }

    const rawTikz = response.text || '';
    const cleanedTikz = extractTikzOnly(rawTikz);

    return NextResponse.json({
      tikz: cleanedTikz,
    });
  } catch (error: any) {
    console.error('Error generating TikZ code:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi khi tạo mã TikZ LaTeX.' },
      { status: 500 }
    );
  }
}
