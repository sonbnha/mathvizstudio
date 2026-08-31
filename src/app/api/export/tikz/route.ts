import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

function extractTikzOnly(rawText: string): string {
  let clean = rawText.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:latex|tex|json|javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }
  const match = clean.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/i);
  if (match) {
    return match[0].trim();
  }
  return clean.replace(/```latex|```tex|```/gi, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via Header X-License-Key
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

    // 3. Gemini API setup (Priority 1: User custom BYOK key, Priority 2: System GEMINI_API_KEY)
    const customKey = req.headers.get('x-custom-api-key');
    const apiKey =
      customKey && customKey.trim().length > 10
        ? customKey.trim()
        : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[TikZ API] Thiếu cấu hình API Key: Cả key người dùng và GEMINI_API_KEY đều trống.');
      return NextResponse.json(
        { error: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống và bạn chưa nhập API Key cá nhân.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

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

    const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const FALLBACK_MODEL = 'gemini-1.5-flash';
    const MODELS = [
      PRIMARY_MODEL,
      ...(PRIMARY_MODEL !== FALLBACK_MODEL ? [FALLBACK_MODEL] : []),
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
    ];

    let response: any = null;
    let lastError: any = null;

    for (let i = 0; i < MODELS.length; i++) {
      const currentModel = MODELS[i];
      try {
        response = await ai.models.generateContent({
          model: currentModel,
          contents: [userPrompt],
          config: {
            systemInstruction,
          },
        });
        if (response?.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[TikZ API] Model ${currentModel} error:`, err?.message || err);
        if (i < MODELS.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Không thể sinh mã TikZ vào lúc này.');
    }

    const rawTikz = response.text || '';
    const cleanedTikz = extractTikzOnly(rawTikz);

    return NextResponse.json({
      success: true,
      tikz: cleanedTikz,
    });
  } catch (error: any) {
    console.error('DEBUG GEMINI TIKZ ERROR:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Lỗi khi tạo mã TikZ LaTeX.',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
