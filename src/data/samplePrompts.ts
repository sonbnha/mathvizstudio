export interface RealWorldMathSample {
  id: string;
  title: string;
  badge: string;
  prompt: string;
  desc?: string;
}

export const REAL_WORLD_MATH_SAMPLES: RealWorldMathSample[] = [
  {
    id: 'sample-tower-30deg',
    title: 'Hải đăng và tàu (Góc hạ)',
    badge: 'Toán 9',
    prompt: 'Một người đứng trên đỉnh ngọn hải đăng $A$ cao $38\\text{ m}$ quan sát một con thuyền $C$ trên biển. Từ đỉnh $A$, góc hạ nhìn thấy thuyền là $30^\\circ$ so với phương ngang $Ax$. Chân hải đăng đặt tại $B$ sao cho $AB \\perp BC$. Hãy tính khoảng cách $BC$ từ chân hải đăng đến con thuyền.',
  },
  {
    id: 'sample-building-height',
    title: 'Chiều cao toà tháp (Góc nâng)',
    badge: 'Toán 9',
    prompt: 'Một người đứng tại vị trí $B$ cách chân toà tháp $C$ một khoảng $45\\text{ m}$ nhìn lên đỉnh $A$ với góc nâng $35^\\circ$ so với phương ngang. Tầm mắt người quan sát cách mặt đất $BB\' = 1{,}6\\text{ m}$ ($B\'C \\perp AC$). Tính chiều cao $AC$ của toà tháp.',
  },
  {
    id: 'sample-river-width',
    title: 'Đo bề rộng sông (Tam giác vuông)',
    badge: 'Toán 9',
    prompt: 'Để đo khoảng cách giữa hai điểm $A$ và $B$ ở hai bên bờ sông, người ta vạch đoạn thẳng $AC = 60\\text{ m}$ dọc bờ sông sao cho $AC \\perp AB$. Từ $C$ ngắm sang điểm $B$ đo được góc $\\widehat{ACB} = 52^\\circ$. Hãy tính chiều rộng $AB$ của khúc sông.',
  },
  {
    id: 'sample-airplane-landing',
    title: 'Máy bay hạ cánh (Góc hạ)',
    badge: 'Toán 9',
    prompt: 'Một chiếc máy bay đang ở độ cao $h = 1200\\text{ m}$ tại vị trí $A$ chuẩn bị tiếp đất tại điểm $C$ trên đường băng. Quãng đường hạ cánh thẳng $AC$ tạo với phương nằm ngang một góc hạ $\\alpha = 18^\\circ$. Tính độ dài đường bay $AC$ để máy bay tiếp đất.',
  },
  {
    id: 'sample-tree-shadow',
    title: 'Chiều cao cây (Bóng nắng)',
    badge: 'Toán 8',
    prompt: 'Một cái cây thẳng đứng $AB$ có bóng trên mặt đất là $BC = 8{,}5\\text{ m}$. Cùng thời điểm đó, một cọc tiêu $DE = 2\\text{ m}$ cắm vuông góc với mặt đất có bóng đổ $EF = 2{,}5\\text{ m}$. Biết các tia nắng mặt trời song song, hãy tính chiều cao $AB$ của cây.',
  },
  {
    id: 'sample-two-ships',
    title: 'Khoảng cách 2 con tàu (Hai góc hạ)',
    badge: 'Toán 10',
    prompt: 'Từ đỉnh ngọn hải đăng $CD = 80\\text{ m}$ ($CD \\perp AB$), người quan sát nhìn thấy hai con tàu $A$ và $B$ thẳng hàng với chân hải đăng $D$ dưới các góc hạ lần lượt là $25^\\circ$ và $40^\\circ$. Hãy tính khoảng cách $AB$ giữa hai con tàu.',
  }
];

// Aliases for convenient importing
export const samplePrompts = REAL_WORLD_MATH_SAMPLES;
export const realLifeMathData = REAL_WORLD_MATH_SAMPLES;
