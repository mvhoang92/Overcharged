# Overcharged: Trạm Sạc Bão Táp — Design Doc

- **Ngày:** 2026-11-27
- **Trạng thái:** Đã duyệt (2026-11-27) — 3D Three.js; MVP-first: backend/co-op/voucher hoãn lại
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

### 4.1 Tech stack — Three.js + TypeScript + Vite (3D thật)

**Quyết định (2026-11-27): 3D thật, camera cố định góc Overcooked.** Gameplay vẫn trên mặt phẳng XZ; đồ họa là model 3D low-poly.

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| Phaser 3 (2D) | Nhẹ, đã chứng minh | Không phải 3D thật | Loại (human chọn 3D) |
| **Three.js + TS** | 3D thật, bundle nhẹ (~150KB core), chạy tốt mobile browser | Tự viết game logic, không có editor | **Chốt** |
| Babylon.js | 3D đầy đủ hơn, có inspector | Core nặng hơn (~400KB+) | Dự phòng |
| Unity / Godot WebGL | Editor mạnh | Bundle 15-30MB+, iOS Safari crash memory | Loại (giết share link) |

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

**Băng chuyền khách/hàng → Nhặt → Gắn lên xe đã sạch + sạc → Xuất chuyến.**

Xe: Intake → Wash → Charge → LOADED → Export. Khách/hàng trôi trên băng chuyền, tràn = hất đơn. Combo 5 sao.

### 5.2 State machine của Xe

```
RAW → WASHING → CLEAN → CHARGING → CHARGED → LOADED → EXPORTED
                                  ↓ quá 3s sau 100%
                            OVERCHARGED (phạt điểm/s, khói → lửa)
```

- **RAW:** bẩn 100%, pin 0%
- **WASHING:** đặt vào bồn, player tap liên hồi để cọ; dirt 100→0 trong ~10 tap (mỗi tap -10%)
- **CLEAN:** dirt 0
- **CHARGING:** auto 0→100% trong 8s
- **CHARGED:** 100%, chuông báo
- **OVERCHARGED:** sau grace 3s, -5 điểm/s, VFX khói→lửa, rung máy; nhấc xe lên để dừng
- **LOADED:** đã gắn khách/hàng khớp yêu cầu (xe + khách/hàng cùng loại)
- **EXPORTED:** xuất chuyến thành công

### 5.3 Trạm

| Trạm | Hành vi |
|---|---|
| Intake | 3 nút chọn loại xe (Bike/VF5/VF8), spawn, cooldown 2s |
| Wash | Đặt xe, tap liên hồi để cọ (mỗi tap -10% bẩn, ~10 tap sạch) |
| Charger | Đặt xe, auto 8s, chuông, grace 3s, quá sạc phạt |
| Băng chuyền | 4 slot, khách/hàng spawn liên tục, trôi về cuối; tràn = hất đơn, -điểm |
| Export | Đặt xe đã LOADED khớp yêu cầu → điểm + combo; sai → từ chối, xe vẫn đó |

**Phí quá giờ (blocking fee) — GĐ 2:** chỉ áp dụng ở Wash và Charger. Wash: xe nằm >10s không cọ → -2 điểm/s. Charger: quá 3s sau 100% → -5 điểm/s (overcharge).

### 5.4 Khách/hàng & Combo

- **Băng chuyền 4 slot:** khách/hàng spawn liên tục, trôi từ đầu đến cuối; tràn cuối = hất đơn, -điểm, combo reset
- **Mỗi thực thể — 4 thuộc tính, 3 kênh hiển thị:**
  - **Loại** (Khách / Hàng) → **icon** trên đầu
  - **Hạng** (Thường / VIP) → **màu viền** (VIP = viền vàng)
  - **Yêu cầu xe** (Ô tô / Xe máy) → **bong bóng thoại**
  - **Luồng** (Cao tốc / Đường quê / Đường biển) → **bong bóng thoại** (GĐ 2, cần nhiều làn xuất)
- **Matching:** yêu cầu Ô tô → VF 5 Taxi; yêu cầu Xe máy → Bike. Luồng → xuất đúng làn (GĐ 2)
- **VIP:** điểm x2, patience ngắn hơn, viền vàng
- **Combo:** xuất chuyến liên tiếp không hất đơn → 1x → 1.5x → 2x → 3x → 5x (5 sao)
- Hất đơn → combo reset, mất điểm (Campaign) / -1 mạng (Endless)

### 5.5 Chaos mechanics

1. **Kẹt xe:** mỗi 20-30s, 1-2 NPC xe máy/shipper chạy ngang sàn theo lane cố định, cảnh báo còi + mũi tên 2s trước. Va chạm player → rơi xe đang bưng (xe giữ nguyên trạng thái).
2. **Cúp điện:** mỗi 30-45s, 1-2 trụ sạc mất điện 5-8s (đèn tắt, màn hình nhấp nháy). Xe trên trụ đó tạm dừng sạc, không bị phạt.

### 5.6 Điều khiển

**Mobile — bố cục hai ngón cái, màn hình ngang, tách nút để tránh bấm nhầm khi cuống:**

- **Nửa trái — Virtual Joystick động:** cần gạt ảo xuất hiện ngay tại điểm chạm ngón tay, điều hướng 360°, biến mất khi nhả. Gạt cần khi đang cọ = ngắt cọ ngay (cọ dạng tap nên tự nhiên).
- **Góc dưới phải — cụm 3 nút hình vòng cung:**
  - **CẦM/ĐẶT (to nhất):** nhấc/đặt xe, đưa xe vào/ra trụ sạc V-Green, nhặt khách/hàng, gắn khách/hàng lên xe, đẩy xe hoàn chỉnh vào cổng xuất bến.
  - **CỌ/THAO TÁC (cỡ vừa, tách riêng):** đứng tay không cạnh bồn rửa, tap liên hồi để đánh bay vết bùn (mỗi tap -10% bẩn, ~10 tap sạch); tiến trình rửa giữ nguyên khi chạy đi giữa chừng. Đang cầm khách/hàng → ném qua làn đường (auto-target xe hợp lệ trong 6m; không có target thì trả về băng chuyền).
  - **DASH (cỡ nhỏ):** lướt nhanh một đoạn ngắn, hồi chiêu 1.5s, để băng qua làn xe chạy; huých đồng đội (co-op, GĐ 3).
- Keyboard fallback (desktop dev): WASD/arrows + Space (Cầm/Đặt) + E (Cọ/Thao tác) + Shift (Dash)
- Landscape bắt buộc; portrait → overlay "xoay ngang máy"

### 5.7 Modes & Content

- **Campaign:** 3 màn (Trạm Quận 1, Trạm Sân Bay, Trạm Cao Tốc), mỗi màn **timer 120-180s**, 3 sao theo điểm
- **Endless:** sống sót, 3 đơn hết hạn = game over, leaderboard
- **Co-op:** 2-4 người, cùng modes, room link
- **Xe:** Bike (xe máy), VF 5 Taxi (ô tô), VF 8 Luxury (GĐ 2, ô tô VIP)
- **Khách/hàng:** 2 loại (Khách, Hàng) × 2 hạng (Thường, VIP) × 2 yêu cầu xe (Ô tô, Xe máy) — bong bóng thoại trên đầu
- **Nhân vật:** 4 nhân vật playable, **cùng stats — chỉ khác ngoại hình** (giống Overcooked, công bằng cho leaderboard)
- **Xe hỏng (GĐ 2):** 3 loại — lốp xẹp (bơm), ắc quy yếu (thay), phần mềm lỗi (cập nhật) — cần trạm Repair
- **Rocket SM (GĐ 2):** đơn huyền thoại ~10%/màn, patience 30s, full service + khách VIP, điểm 2000, quá sạc = nổ -500
- **Bus (GĐ 3):** xe buýt điện VinBus, bưng 2 người hoặc 1 người chậm 40%, cần Trụ Sạc Nhanh, điểm 800
- **Cao điểm (GĐ 2):** 2-3 cửa sổ/màn, khách/hàng spawn nhanh hơn, điểm x1.5, patience drain x1.5
- **Phụ kiện (GĐ 2+, optional):** Mũ bảo hiểm, Thùng hàng Express, Nước & Khăn VIP — gắn thêm lên xe để thưởng điểm
- **Map:** single-screen arena, trạm quanh viền, lane giao thông ở giữa

### 5.8 Layout màn hình (text sketch)

```
┌──────────────────────────────────────────────┐
│ [Khách/hàng: 🚗🚲]     ⭐ Combo x3     💰 1250 │
│                                              │
│ ┌──────┐                          ┌───────┐  │
│ │INTAKE│                          │EXPORT │  │
│ └──────┘                          └───────┘  │
│ ┌──────┐  ┌────────┐  ┌────────┐  ┌───────┐  │
│ │ WASH │  │CHARGER │  │CHARGER │  │BĂNG   │  │
│ └──────┘  └────────┘  └────────┘  │CHUYỀN │  │
│        🏍️ ← lane giao thông → 🏍️  └───────┘  │
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

### 6.1 Client (Three.js)

- Three.js + TypeScript + Vite; không physics engine — di chuyển mặt phẳng XZ + collision trụ/AABB tự viết
- Camera: perspective, nhìn xuống ~55°, cố định (góc Overcooked)
- Scenes: Boot → Preload → Menu → Lobby (co-op) → Game → UI (overlay) → Result
- Entities: Player (GLB + AnimationMixer), Vehicle (GLB), Station (mesh + trigger), NPC
- Systems: InputSystem, OrderSystem, ComboSystem, ChaosDirector, AudioManager, SaveManager
- Data-driven: `vehicles.json`, `accessories.json`, `orders.json`, `levels.json`, `chaos.json`
- Ánh sáng: ambient + directional, **không real-time shadow** trên mobile — blob shadow dưới chân
- Perf: object pooling, không allocate per-frame, texture atlas 1024², GLB + Draco
- Load: initial < 5MB, load theo màn nếu vượt
- Placeholder: capsule/box màu → thay bằng model final GĐ 4
- Fallback perf: pre-render model 3D thành sprite 2D (giữ chất 3D, quay về Phaser nếu cần)

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

### 6.6 3D asset pipeline

1. Concept 2D (đã có trong `docs/concepts/`) → AI image-to-3D (Meshy / Tripo / Rodin) → base mesh
2. Blender 5.3 (đã cài): cleanup, UV, retopo nếu cần, export GLB
3. Mixamo (tài khoản free, đã có): auto-rig + animation — walk 4 hướng, carry, idle, scrub
4. Export GLB → Three.js
- Nhân vật phải humanoid chuẩn để rig; skin đặc biệt (nón lá, áo dài) chỉ dùng cho skin sự kiện
- Model low-poly 2-5k tris, texture atlas 1024²

## 7. Roadmap (10-12 tuần, solo dev + AI, 3D)

**Quyết định MVP-first (2026-11-27):** Giai đoạn hiện tại chỉ làm **MVP = bản chơi được, single-player, không backend, không co-op, không voucher**. Backend/co-op/voucher/marketing để sau khi MVP chạy ổn — scale sau.

| GĐ | Tuần | Nội dung | Milestone |
|---|---|---|---|
| **MVP+** | W1-5 | Core loop single-player 3D: 1 map, 1 player (capsule placeholder), 2 xe, 5 trạm (Intake/Wash/Charger/Băng chuyền/Export), khách/hàng + bong bóng thoại, combo 5 sao, kẹt xe NPC, joystick+action+dash, camera 3/4 | Link chơi được để playtest |
| 2 | W6-8 | Quá sạc VFX, cao điểm + phí quá giờ, xe hỏng + Repair, Rocket SM, phụ kiện optional, 3 map, 3 xe, SFX, tutorial, VI/EN | Bản single-player đầy đủ |
| 3 | W9-11 | Supabase (leaderboard/voucher/analytics), Colyseus co-op 2-4, lobby, room link, Bus + Trụ Sạc Nhanh | Co-op chạy được |
| 4 | W12-14 | Model 3D final + rig + animation (Mixamo), branding, perf, QA thiết bị, OG card, soft launch | Launch |

**Fallback:** co-op trượt deadline → launch single-player cuối W9, co-op bổ sung sau. Perf 3D fail trên Android tầm trung → pre-render sprite 2D, quay về Phaser.

**Sau MVP:** mới quyết voucher (giá trị + chống gian lận) và lưu lượng launch (sizing server).

## 8. Left to the builder / Open questions

- Brand assets chính thức (logo, màu, art xe) — placeholder đến khi có
- Tuning số cụ thể (tốc độ, timer, điểm) — qua playtest
- Đối tác voucher & pool code
- **Giá trị voucher & mức chống gian lận** — quyết định dedupe thiết bị hay cần phone OTP (chờ human partner)
- **Lưu lượng launch dự kiến** — quyết định sizing server Colyseus/Supabase (chờ human partner)
- Danh sách analytics event chốt
- Port Zalo Mini App (post-launch, tùy chiến dịch)

**Đã chốt (2026-11-27):**
1. Phí quá giờ: chỉ Wash + Charger
2. Cao điểm + phí quá giờ: GĐ 2
3. Xe hỏng: GĐ 2
4. Bus GĐ 3, Rocket GĐ 2
