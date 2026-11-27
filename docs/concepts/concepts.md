# Overcharged — Concept Design: Nhân vật, Map, Vật phẩm

> **Cập nhật 2026-11-27:** Game chốt **3D thật (Three.js)**. Concept 2D trong doc này là reference cho bước image-to-3D — model 3D sẽ giữ đúng thiết kế nhân vật/vật phẩm/map ở đây.

- **Ngày:** 2026-11-27
- **Trạng thái:** Draft — chờ duyệt cùng spec
- **Liên quan:** `docs/superpowers/specs/2026-11-27-overcharged-design.md`

## 1. Art Direction

- **Style:** chibi top-down, flat vector, outline đậm 2-3px, màu tươi
- **Tỷ lệ:** 2-2.5 đầu, đầu chiếm ~40% chiều cao, thân nhỏ
- **Palette:** Xanh SM cyan-teal, V-Green green, accent vàng/cam/tím (hex gần đúng, chờ brand kit chính thức)
- **Quy tắc đọc được:** mỗi nhân vật có silhouette riêng (tóc/mũ/dáng) + màu riêng — nhìn 0.5s là phân biệt được trên màn 6 inch
- **Xe:** chibi, bánh to, đèn pha biểu cảm (như mắt)
- **Trạm:** color-code — Intake xanh lá, Wash cyan, Charger vàng, Export đỏ

## 2. Nhân vật (4 playable)

**Quyết định (2026-11-27): Hướng A — giống hệt Overcooked.** Cả 4 nhân vật **cùng stats, chỉ khác ngoại hình** (cosmetic thuần). Không perk, không role khóa — công bằng cho leaderboard, ai cũng làm được mọi việc, dễ học trong 30 giây. Perk/role để ngỏ cho GĐ 2+ nếu playtest thấy nhân vật nhạt (hướng B: perk nhẹ, tắt ở mode xếp hạng).

| # | Tên | Vai trò (flavor) | Ngoại hình | Stats |
|---|---|---|---|---|
| 1 | **Tí Điện** | Kỹ thuật viên | Nam, đầu 20s, tóc xù đen, đồng phục cyan-teal, đai dụng cụ, cầm cờ lê | Giống hệt |
| 2 | **Na Nước** | Nhân viên rửa xe | Nữ, tóc đuôi ngựa, tạp dề vàng-green, găng cao su, bình xịt | Giống hệt |
| 3 | **Hùng Búa** | Điều phối viên | Nam lực điền, nón bảo hộ, vest cam, găng tay to | Giống hệt |
| 4 | **Chị Thảo** | Quản lý ca | Nữ 30s, kính, đồng phục tím-teal, cầm clipboard | Giống hệt |

- "Vai trò" chỉ là flavor text cho marketing — không ảnh hưởng gameplay.
- **Animation cần:** walk 4 hướng × 4 frame (16), carry 4 hướng × 2 (8), action 2, idle 2 → ~28 frame/nhân vật
- **MVP placeholder:** vòng tròn màu + mũi tên hướng

## 3. Map (3 map launch)

| # | Map | Theme | Layout | Chaos | Độ khó |
|---|---|---|---|---|---|
| 1 | **Trạm Quận 1** | Trung tâm thành phố, hoàng hôn, neon | Vòng chuẩn: Intake góc trái-trên, Wash trái-dưới, 2 Charger giữa-trên, Accessory phải, Export phải-trên | Lane xe máy ngang giữa map | Dễ (tutorial) |
| 2 | **Trạm Sân Bay** | Sân bay, đèn runway, máy bay | Dài ngang: trạm trải xa, hành lang dài | Xe đẩy hành lý cắt dọc | Trung bình (routing) |
| 3 | **Trạm Cao Tốc** | Cao tốc đêm, mưa, xe tải | Compact: trạm gần nhau, chỉ 1 charger | Cúp điện thường xuyên, xe tải tốc cao | Khó (quản lý tài nguyên) |

**Map elements chung:**
- Sàn: bê tông + vạch kẻ đỗ xe, vết dầu
- Lane giao thông: dải đường + mũi tên trắng, NPC chạy ngang
- Trang trí: cọc giao thông, cây chậu, banner Xanh SM, biển V-Green, dây sạc
- Background: city/airport/highway (static cho MVP, parallax sau)

**Layout sketch — Trạm Quận 1:**

```
┌──────────────────────────────────────────────┐
│ ┌──────┐   ┌────────┐ ┌────────┐   ┌───────┐ │
│ │INTAKE│   │CHARGER │ │CHARGER │   │EXPORT │ │
│ └──────┘   └────────┘ └────────┘   └───────┘ │
│                                              │
│        🏍️ ←── lane xe máy ──→ 🏍️            │
│                                              │
│ ┌──────┐                        ┌─────────┐  │
│ │ WASH │                        │ACCESSORY│  │
│ └──────┘                        └─────────┘  │
│   (Joystick)                      [A] [Dash] │
└──────────────────────────────────────────────┘
```

## 4. Vật phẩm

### 4.0 Khách/hàng (nguyên liệu chính — thay phụ kiện)

| Thực thể | Hạng | Yêu cầu xe | Bong bóng thoại |
|---|---|---|---|
| Khách | Thường | Ô tô / Xe máy | Trắng, icon xe |
| Khách | VIP | Ô tô / Xe máy | Vàng, icon xe + ngôi sao |
| Hàng | Thường | Ô tô / Xe máy | Trắng, icon hộp |
| Hàng | VIP | Ô tô / Xe máy | Vàng, icon hộp + ngôi sao |

- Art cần: 4 sprite/model chibi (khách thường, khách VIP, hàng thường, hàng VIP) + bong bóng thoại 2 icon (ô tô, xe máy)
- Trôi trên băng chuyền 4 slot; tràn cuối = hất đơn

### 4.1 Phụ kiện (gắn lên xe — GĐ 2+, optional)

| Vật phẩm | Mô tả | Điểm thưởng |
|---|---|---|
| **Mũ bảo hiểm Xanh** | Mũ xanh có logo, gắn lên xe | +50 |
| **Thùng hàng Express** | Thùng giao hàng xanh, gắn sau xe | +75 |
| **Bộ Nước & Khăn VIP** | Chai nước + khăn gấp, đặt trong xe | +100 |

### 4.2 Linh kiện sửa chữa (GĐ 2)

| Vật phẩm | Dùng cho | Mini-interaction |
|---|---|---|
| **Lốp xe** | Lốp xẹp | Bơm lốp (giữ nút) |
| **Ắc quy** | Ắc quy yếu | Thay bình (bưng từ kệ → gắn) |
| **Chip phần mềm** | Lỗi phần mềm | Cập nhật (tap sequence) |

### 4.3 Vật phẩm đặc biệt

| Vật phẩm | Hiệu ứng | Ghi chú |
|---|---|---|
| **Cà phê sữa đá** | Tốc chạy +30% trong 10s | Rất Việt, xuất hiện ngẫu nhiên |
| **Trà đá** | Tốc chạy +15% trong 10s | Phổ biến, rẻ |

### 4.4 Dụng cụ tại trạm (visual)

- Bình xịt rửa (Wash), Máy bơm (Repair), Sạc dự phòng (Charger), Dây sạc V-Green

## 5. MVP Placeholder Plan

| Thành phần | Placeholder | Final (GĐ 4) |
|---|---|---|
| Nhân vật | Vòng tròn màu + mũi tên hướng | Sprite sheet 28 frame |
| Xe | Rounded rect màu theo loại | Sprite chibi + animation |
| Trạm | Rect màu + label | Sprite + animation + VFX |
| Vật phẩm | Emoji + ô màu | Icon vector |
| Map | Grid + rect | Tilemap + background |

## 6. Concept Images

**SVG (vẽ tay):**
- `docs/concepts/characters.svg` — lineup 4 nhân vật (front + top-down)
- `docs/concepts/map-quan-1.svg` — map Trạm Quận 1
- `docs/concepts/items.svg` — bộ vật phẩm

**Generated (AI, đã chọn hướng):**
- `docs/concepts/generated/characters-v1.png` — 4 nhân vật front + back view (base chính)
- `docs/concepts/generated/characters-v2-vietnam.png` — biến thể Việt hóa: nón lá, mũ tai bèo, áo dài (skin sự kiện)
- `docs/concepts/generated/map-dusk.png` — map hoàng hôn, layout chuẩn spec
- `docs/concepts/generated/map-street.png` — map phố Việt: nhà phố, hoa phượng, xe ôm, quán cà phê ghế nhựa (map chính)
- `docs/concepts/generated/items.png` — 10 vật phẩm, sẵn sàng làm icon

> Ghi chú: V-LLM không có model tạo ảnh; SVG vẽ tay, PNG do human partner generate qua agent khác.
