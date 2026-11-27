# Overcharged: Trạm Sạc Bão Táp — Design Doc

- **Ngày:** 2026-11-27
- **Trạng thái:** Draft — chờ duyệt (MVP-first: backend/co-op/voucher hoãn lại, làm bản chơi được trước)
- **Tác giả:** V-LLM (AI) cùng human partner
- **Loại:** Project — design doc đầy đủ

## 1. Intent & Why

Game 2D top-down lấy cảm hứng từ Overcooked, làm marketing cho thương hiệu xe điện **Xanh SM** và trạm sạc **V-Green**.

Người chơi là nhân viên vận hành trạm trung chuyển xe điện: nhận xe bẩn/hết pin → rửa → sạc → gắn phụ kiện → xuất bến, dưới áp lực đơn hàng và hỗn loạn giao thông Việt Nam.

**Vì sao web game share link:** chiến dịch marketing cần zero-install — mở bằng URL trên mobile browser, share qua Zalo/FB/Messenger. Không qua app store.

**Thành công trông như thế nào:**
- Người chơi hiểu và chơi được vòng lặp trong 30 giây đầu
- Tỷ lệ share link phòng co-op cao (viral loop)
- Session 3-10 phút, chơi lại vì leaderboard/voucher
- Đo lường được bằng analytics

## 2. Goals / Non-goals / Anti-goals

**Goals**
- Vòng lặp lõi vui, 60fps trên Android tầm trung trong browser
- Share link → chơi ngay, không cài đặt
- Online co-op 2-4 người qua room link
- VI/EN
- Leaderboard + voucher + analytics

**Non-goals**
- Phát hành native app store (App Store / CH Play)
- Offline mode / PWA cache (để sau)
- Cốt truyện phức tạp
- Monetization trong game

**Anti-goals** (thành công kỹ thuật nhưng vẫn thất bại)
- Mô phỏng lái xe thực tế
- Màn chơi dài >10 phút
- Pay-to-win / cơ chế gây khó chịu
- Đồ họa nặng, load >5s trên 4G

## 3. Constraints

- Mobile browser, landscape, touch
- Share card OG image cho Zalo/FB
- Giả định: 1 dev + AI hỗ trợ, 8 tuần (có thêm artist thì rút ngắn GĐ 4)
- Brand assets Xanh SM/V-Green chưa có — dùng placeholder trước
- Asset gốc, không vi phạm bản quyền

## 4. Approaches (đã chốt)

### 4.1 Tech stack — Phaser 3 + TypeScript + Vite

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| Vanilla JS + Canvas | Siêu nhẹ | Tự build scene/input/audio/tween/collision → dev time x2-3 | Loại |
| **Phaser 3 + TS** | Đủ đồ chơi, cộng đồng lớn, wrap Capacitor được nếu cần native sau này | ~300KB gzip | **Chốt** |
| PixiJS | Renderer nhanh nhất | Chỉ render, tự làm game logic | Loại |
| Unity / Godot | Native thật | Không share link được, build nặng | Loại (trái mục tiêu) |

### 4.2 Backend — Supabase + Colyseus

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| Không backend | Nhanh nhất | Không leaderboard/voucher/analytics | Không đủ cho campaign |
| **Supabase** | Leaderboard, voucher, analytics, free tier | — | **Chốt** (data) |
| **Colyseus** | Chuyên game room realtime, sync state | Cần server Node | **Chốt** (co-op) |

MVP chưa cần backend; nối ở GĐ 3.

### 4.3 Co-op — online room link, "co-op lite"

- 2-4 người, chung order queue & điểm
- Không va chạm vật lý giữa người chơi (dễ sync, ít bug)
- Reservation trạm: ai tới trước giữ trước
- Room code trong URL: `?room=ABC123` — share qua Web Share API / Zalo / FB
- Local co-op 1 máy: không khả thi trên mobile (màn nhỏ, control xung đột)

## 5. Game Design

### 5.1 Core loop

Intake → Wash → Charge → Accessories → Export. Order queue 3-5 đơn. Combo 5 sao.

### 5.2 State machine của Xe

```
RAW → WASHING → CLEAN → CHARGING → CHARGED → ACCESSORIZED → READY → EXPORTED
                                  ↓ quá 3s sau 100%
                            OVERCHARGED (phạt điểm/s, khói → lửa)
```

- **RAW:** bẩn 100%, pin 0%
- **WASHING:** đặt vào bồn, player giữ nút cọ; dirt 100→0 trong 3s giữ
- **CLEAN:** dirt 0
- **CHARGING:** auto 0→100% trong 8s
- **CHARGED:** 100%, chuông báo
- **OVERCHARGED:** sau grace 3s, -5 điểm/s, VFX khói→lửa, rung máy; nhấc xe lên để dừng
- **ACCESSORIZED:** đủ phụ kiện theo đơn
- **READY:** sạch + 100% + đủ phụ kiện
- **EXPORTED:** giao thành công

### 5.3 Trạm

| Trạm | Hành vi |
|---|---|
| Intake | 3 nút chọn loại xe (Bike/VF5/VF8), spawn, cooldown 2s |
| Wash | Đặt xe, giữ nút cọ 3s |
| Charger | Đặt xe, auto 8s, chuông, grace 3s, quá sạc phạt |
| Accessory | 3 stack phụ kiện; player bưng phụ kiện tới xe, gắn (tối đa 3/xe) |
| Export | Đặt xe khớp đơn → điểm + combo; sai → từ chối, xe vẫn đó |

### 5.4 Đơn hàng & Combo

- Queue 3-5, mỗi đơn: loại xe + 0-2 phụ kiện + patience 60-90s
- Đơn mới spawn khi đơn cũ hoàn thành/hết hạn
- Combo: giao liên tiếp → 1x → 1.5x → 2x → 3x → 5x (5 sao)
- Hết hạn đơn → combo reset, mất điểm (Campaign) / -1 mạng (Endless)

### 5.5 Chaos mechanics

1. **Kẹt xe:** mỗi 20-30s, 1-2 NPC xe máy/shipper chạy ngang sàn theo lane cố định, cảnh báo còi + mũi tên 2s trước. Va chạm player → rơi xe đang bưng (xe giữ nguyên trạng thái).
2. **Cúp điện:** mỗi 30-45s, 1-2 trụ sạc mất điện 5-8s (đèn tắt, màn hình nhấp nháy). Xe trên trụ đó tạm dừng sạc, không bị phạt.

### 5.6 Điều khiển

- Virtual joystick trái + nút Action phải (context: nhấc/đặt/cọ/gắn) + Dash (2s cooldown)
- Tap-to-move: tap sàn để đi, tap trạm để tương tác (hỗ trợ song song)
- Landscape bắt buộc; portrait → overlay "xoay ngang máy"

### 5.7 Modes & Content

- **Campaign:** 3 màn (Trạm Quận 1, Trạm Sân Bay, Trạm Cao Tốc), mỗi màn **timer 120-180s**, 3 sao theo điểm
- **Endless:** sống sót, 3 đơn hết hạn = game over, leaderboard
- **Co-op:** 2-4 người, cùng modes, room link
- **Xe:** Bike (nhanh, điểm thấp), VF 5 Taxi (trung bình), VF 8 Luxury (chậm, điểm cao, cần VIP kit)
- **Nhân vật:** 4 nhân vật playable, **cùng stats — chỉ khác ngoại hình** (giống Overcooked, công bằng cho leaderboard)
- **Phụ kiện:** Mũ bảo hiểm, Thùng hàng Express, Nước & Khăn VIP
- **Map:** single-screen arena, trạm quanh viền, lane giao thông ở giữa

### 5.8 Layout màn hình (text sketch)

```
┌──────────────────────────────────────────────┐
│ [Đơn: 🚲 🚗 🚙]      ⭐ Combo x3      💰 1250 │
│                                              │
│ ┌──────┐                          ┌───────┐  │
│ │INTAKE│                          │EXPORT │  │
│ └──────┘                          └───────┘  │
│ ┌──────┐  ┌────────┐  ┌────────┐  ┌───────┐  │
│ │ WASH │  │CHARGER │  │CHARGER │  │ACCES. │  │
│ └──────┘  └────────┘  └────────┘  └───────┘  │
│        🏍️ ← lane giao thông → 🏍️            │
│                                              │
│   (Joystick)                      [A] [Dash] │
└──────────────────────────────────────────────┘
```

### 5.9 Điểm & thất bại

- Điểm = base (Bike 100 / VF5 200 / VF8 400) × combo + time bonus
- Campaign: đạt ngưỡng điểm → 1-3 sao; không hard-fail (game marketing thân thiện)
- Endless: 3 đơn hết hạn = kết thúc
- Voucher: 3 sao hoặc top-100 → claim code

## 6. Technical Architecture

### 6.1 Client

- Phaser 3.80+, TypeScript, Vite, Arcade Physics
- Scenes: Boot → Preload → Menu → Lobby (co-op) → Game → UI (overlay) → Result
- Entities: Player, Vehicle, Station (Intake/Wash/Charger/Accessory/Export), NPC
- Systems: InputSystem, OrderSystem, ComboSystem, ChaosDirector, AudioManager, SaveManager
- Data-driven: `vehicles.json`, `accessories.json`, `orders.json`, `levels.json`, `chaos.json`
- Placeholder art: shape màu + emoji → thay bằng art final GĐ 4
- Perf: object pooling, không allocate per-frame, texture atlas

### 6.2 Multiplayer (Colyseus)

- Node.js + Colyseus 0.15+, room tối đa 4
- Room code trong URL `?room=ABC123`, share qua Web Share API / Zalo / FB
- State schema: players[], vehicles[], orders[], score, timer
- Tick 20Hz, interpolation cho remote player, local prediction cho player mình
- Co-op lite: không va chạm player-player, chung điểm/đơn, reservation trạm
- **Server-authoritative:** server chạy shared simulation (vị trí/trạng thái xe, đơn, chaos, điểm); client chỉ gửi input và render theo state sync. Xe đang được bưng thuộc quyền server; 2 người giành cùng xe → server arbitrate first-come, người sau bị từ chối. ChaosDirector chạy server-side, đồng bộ toàn phòng.
- **Shared sim module:** logic lõi (state machine xe, order, scoring) đóng gói thành package dùng chung — client chạy cho single-player, server chạy headless cho co-op. Tránh viết logic 2 lần.
- **Room lifecycle:** chỉ join ở pre-game lobby (MVP, không join-in-progress); host disconnect → host migration, phòng sống tiếp; player disconnect → xe đang bưng rơi tại chỗ giữ nguyên trạng thái, 30s reconnect grace rồi remove khỏi phòng.
- Reconnect grace 30s
- Fallback: nếu chưa ổn định cuối W6 → launch single-player, co-op bổ sung sau

### 6.3 Backend (Supabase)

- Postgres + anonymous auth + Edge Functions
- Bảng: `leaderboard` (weekly), `vouchers` (pool code, 1 claim/device), `analytics_events`
- Events: session_start, level_start, level_end, share_click, room_create, room_join, voucher_claim
- Voucher: Edge Function rate-limited

### 6.4 Hosting

- Static game: Vercel / Cloudflare Pages
- Colyseus: Railway/Fly.io Singapore hoặc VPS VN (VNG Cloud/Viettel) cho latency
- Supabase: hosted

### 6.5 Support matrix

- **Ưu tiên:** Android Chrome (perf target 60fps máy tầm trung)
- **Bắt buộc:** iOS Safari (share link mở trên iPhone), in-app browser Zalo/FB/Messenger (kênh campaign chính)
- **Secondary:** desktop Chrome/Firefox/Safari
- Audio unlock on first touch (iOS), xử lý input quirks từng browser trong QA

## 7. Roadmap (8 tuần, solo dev + AI)

**Quyết định MVP-first (2026-11-27):** Giai đoạn hiện tại chỉ làm **MVP = bản chơi được, single-player, không backend, không co-op, không voucher**. Backend/co-op/voucher/marketing để sau khi MVP chạy ổn — scale sau.

| GĐ | Tuần | Nội dung | Milestone |
|---|---|---|---|
| **MVP** | W1-2 | Core loop single-player: 1 map, 1 player, 2 xe, 4 trạm, joystick+action+dash, placeholder art | Link chơi được để playtest |
| 2 | W3-4 | Phụ kiện, combo 5 sao, quá sạc VFX, chaos, 3 map, 3 xe, SFX, tutorial, VI/EN | Bản single-player đầy đủ |
| 3 | W5-6 | Supabase (leaderboard/voucher/analytics), Colyseus co-op 2-4, lobby, room link | Co-op chạy được |
| 4 | W7-8 | Art final + branding, animation, perf, QA thiết bị, OG card, soft launch | Launch |

**Fallback:** co-op trượt deadline → launch single-player cuối W6, co-op bổ sung sau.

**Sau MVP:** mới quyết voucher (giá trị + chống gian lận) và lưu lượng launch (sizing server).

## 8. Left to the builder / Open questions

- Brand assets chính thức (logo, màu, art xe) — placeholder đến khi có
- Tuning số cụ thể (tốc độ, timer, điểm) — qua playtest
- Đối tác voucher & pool code
- **Giá trị voucher & mức chống gian lận** — quyết định dedupe thiết bị hay cần phone OTP (chờ human partner)
- **Lưu lượng launch dự kiến** — quyết định sizing server Colyseus/Supabase (chờ human partner)
- Danh sách analytics event chốt
- Port Zalo Mini App (post-launch, tùy chiến dịch)
