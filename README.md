# Overcharged: Trạm Sạc Bão Táp

Game 2D/3D top-down lấy cảm hứng từ Overcooked, làm marketing cho thương hiệu xe điện **Xanh SM** và trạm sạc **V-Green**.

Người chơi là nhân viên vận hành trạm trung chuyển xe điện: nhận xe bẩn/hết pin → rửa → sạc → nhặt khách/hàng từ băng chuyền → gắn lên xe → xuất chuyến, dưới áp lực đơn hàng và hỗn loạn giao thông Việt Nam.

## Tech Stack

- **Three.js** + TypeScript + Vite (3D thật, camera cố định góc Overcooked)
- **Vitest** cho unit test logic thuần
- Mobile browser landscape, share link (không qua app store)

## Tài liệu

- **Design doc:** [`docs/superpowers/specs/2026-11-27-overcharged-design.md`](docs/superpowers/specs/2026-11-27-overcharged-design.md)
- **Implementation plan (MVP+):** [`docs/superpowers/plans/2026-11-27-overcharged-mvp-plus-threejs.md`](docs/superpowers/plans/2026-11-27-overcharged-mvp-plus-threejs.md)
- **Concept design:** [`docs/concepts/concepts.md`](docs/concepts/concepts.md)
- **Concept images:** [`docs/concepts/generated/`](docs/concepts/generated/)

## Chạy dự án

```bash
npm install
npm run dev      # dev server (LAN accessible)
npm test         # unit tests
npm run build    # production build
```

## Chơi online

**https://overcharged-hoang-c3b5.vercel.app**

Mở trên điện thoại (landscape), share link cho bạn bè chơi ngay — không cần cài đặt.

## Trạng thái

MVP+ đang phát triển — core loop single-player: nhập xe → rửa → sạc → gắn khách/hàng → xuất chuyến.
