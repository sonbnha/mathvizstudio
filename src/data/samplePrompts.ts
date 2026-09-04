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
    prompt: 'Một người đứng trên đỉnh ngọn hải đăng cao 38m quan sát một con thuyền trên biển với góc hạ 30 độ so với phương ngang. Hãy tính khoảng cách từ chân hải đăng đến con thuyền.',
  },
  {
    id: 'sample-building-height',
    title: 'Chiều cao toà tháp (Góc nâng)',
    badge: 'Toán 9',
    prompt: 'Một người đứng tại điểm B cách chân toà nhà C một khoảng 45m nhìn lên đỉnh A của toà nhà với góc nâng 35 độ. Tầm mắt người quan sát cách mặt đất 1.6m. Tính chiều cao của toà tháp.',
  },
  {
    id: 'sample-river-width',
    title: 'Đo bề rộng sông (Góc vuông)',
    badge: 'Toán 9',
    prompt: 'Để đo khoảng cách giữa hai điểm A và B ở hai bên bờ sông, người ta vạch đoạn thẳng AC = 60m vuông góc với AB dọc theo một bờ. Từ C ngắm sang B đo được góc ACB = 52 độ. Hãy tính khoảng cách AB giữa hai bờ sông.',
  },
  {
    id: 'sample-airplane-landing',
    title: 'Máy bay tiếp đất (Đường dốc)',
    badge: 'Toán 9',
    prompt: 'Một chiếc máy bay đang ở độ cao 1200m chuẩn bị hạ cánh xuống điểm C trên đường băng theo đường thẳng kính AC nghiêng một góc hạ 18 độ so với phương ngang. Tính chiều dài quãng đường bay AC từ vị trí máy bay tới điểm tiếp đất.',
  },
  {
    id: 'sample-tree-shadow',
    title: 'Đo chiều cao cây (Bóng nắng)',
    badge: 'Toán 8',
    prompt: 'Một cái cây có bóng trên mặt đất dài 8.5m. Cùng thời điểm đó, một cọc tiêu cao 2m cắm vuông góc với mặt đất có bóng dài 2.5m. Tính chiều cao của cái cây.',
  },
  {
    id: 'sample-two-ships',
    title: 'Khoảng cách 2 con tàu (Hải đăng)',
    badge: 'Toán 10',
    prompt: 'Từ đỉnh một ngọn hải đăng cao 80m so với mực nước biển, người quan sát nhìn thấy hai chiếc thuyền A và B thẳng hàng với chân hải đăng dưới các góc hạ lần lượt là 25 độ và 40 độ. Tính khoảng cách giữa hai con tàu.',
  }
];

// Aliases for convenient importing
export const samplePrompts = REAL_WORLD_MATH_SAMPLES;
export const realLifeMathData = REAL_WORLD_MATH_SAMPLES;
