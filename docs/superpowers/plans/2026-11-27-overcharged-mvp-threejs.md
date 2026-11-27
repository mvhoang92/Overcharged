# Overcharged MVP (Three.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bản chơi được single-player 3D của Overcharged — nhận xe, rửa, sạc, xuất bến — chạy trên mobile browser landscape.

**Architecture:** Three.js + TypeScript + Vite. Logic thuần (VehicleStateMachine, OrderSystem, ScoreSystem, nearestWithin) nằm trong `src/core/`, test bằng Vitest, không import Three.js. Three.js layer (`game/`, `entities/`) chỉ render + input, gọi core. HUD và điều khiển cảm ứng dùng DOM overlay.

**Tech Stack:** Three.js 0.170+, TypeScript 5.6, Vite 5.4, Vitest 2.1.

**Spec:** `docs/superpowers/specs/2026-11-27-overcharged-design.md`

## Global Constraints

- Mobile landscape, touch-first; keyboard WASD/arrows + Space/Shift fallback cho desktop dev
- Placeholder 3D: capsule/box màu, không asset ngoài
- Không backend, không co-op, không voucher, không combo (MVP)
- UI text tiếng Việt
- 60fps target; không allocate object trong update loop
- Data-driven: `src/data/vehicles.ts`, `src/data/levels.ts`
- dt clamp 0.1s trong game loop
- Camera perspective cố định, nhìn xuống ~55°

## Review Focus

1. **Multi-touch đồng thời** (joystick + action + dash): ngón trượt ra ngoài vùng joystick không được mất input — Task 8 verification.
2. **dt lớn khi tab background:** dirt/battery/overcharge clamp, penalty không double-count — Task 3 tests + Task 10 verification.
3. **Order hết hạn cùng frame với fulfill:** fulfill sau update trả null — Task 4 test.
4. **Action context giữa xe và trạm:** chọn mục tiêu gần nhất, ưu tiên trạm khi đang bưng xe — Task 5 + Task 9.
5. **Clamp 0-100:** dirt/battery không âm/vượt — Task 3 tests.
6. **Resize/orientation:** canvas + camera aspect cập nhật đúng khi xoay máy — Task 6 verification.

---

### Task 1: Scaffold project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`, `src/main.ts`

**Interfaces:**
- Produces: `npm run dev` chạy Three.js scene stub; `npm test` chạy Vitest; `npm run build` build production.

- [ ] **Step 1: Tạo `package.json`**

```json
{
  "name": "overcharged",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc && vite build",
    "preview": "vite preview --host",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "@types/three": "^0.170.0",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Tạo config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true },
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

`.gitignore`:

```
node_modules
dist
```

- [ ] **Step 3: Tạo `index.html`** (canvas + DOM UI overlay)

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0b5cff" />
    <title>Overcharged: Trạm Sạc Bão Táp</title>
    <style>
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #111; touch-action: none; }
      #game { position: fixed; inset: 0; }
      #ui { position: fixed; inset: 0; pointer-events: none; font-family: sans-serif; }
      #ui > * { pointer-events: auto; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <div id="ui"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Tạo `src/main.ts` stub**

```ts
import * as THREE from 'three';

const container = document.getElementById('game')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 14, 11);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(5, 10, 5);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 13.5),
  new THREE.MeshStandardMaterial({ color: 0x3a3a5a }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```

- [ ] **Step 5: Cài dependencies và chạy dev server**

Run: `npm install && npm run dev`
Expected: Vite serve, mở browser thấy mặt phẳng 3D màu xanh tím.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Three.js + TS + Vite + Vitest"
```

---

### Task 2: Core types, config, data, EventBus

**Files:**
- Create: `src/core/types.ts`, `src/config.ts`, `src/data/vehicles.ts`, `src/data/levels.ts`, `src/systems/EventBus.ts`

**Interfaces:**
- Produces: `VehicleType`, `VehicleLocation`, `VehicleState`, `StationType`, `VehicleDef`, `LevelDef`; `CONFIG`; `VEHICLES`; `LEVEL_1`; `bus` (EventBus instance với `on/off/emit`).

- [ ] **Step 1: Tạo `src/core/types.ts`**

```ts
export type VehicleType = 'bike' | 'vf5';
export type VehicleLocation = 'floor' | 'wash' | 'charger' | 'export' | 'carried' | 'exported';
export type VehicleState = 'raw' | 'washing' | 'clean' | 'charging' | 'charged' | 'overcharged' | 'ready' | 'exported';
export type StationType = 'intake' | 'wash' | 'charger' | 'export';

export interface VehicleDef {
  type: VehicleType;
  label: string;
  color: number;
  basePoints: number;
  speedFactor: number;
}

export interface LevelDef {
  id: string;
  label: string;
  durationSec: number;
  maxOrders: number;
  patienceRange: [number, number];
  stations: Array<{ type: StationType; x: number; z: number }>;
}
```

- [ ] **Step 2: Tạo `src/config.ts`**

```ts
export const CONFIG = {
  playerSpeed: 6,
  dashSpeed: 14,
  dashDurationMs: 150,
  dashCooldownMs: 2000,
  carrySpeedFactor: 0.8,
  washRatePerSec: 34,
  chargeRatePerSec: 12.5,
  overchargeGraceSec: 3,
  overchargePenaltyPerSec: 5,
  intakeCooldownMs: 2000,
  interactionRange: 1.8,
  levelDurationSec: 120,
  maxOrders: 3,
  patienceRange: [60, 90] as [number, number],
  mapHalfWidth: 11.5,
  mapHalfDepth: 6.2,
} as const;
```

- [ ] **Step 3: Tạo `src/data/vehicles.ts`**

```ts
import type { VehicleDef, VehicleType } from '../core/types';

export const VEHICLES: Record<VehicleType, VehicleDef> = {
  bike: { type: 'bike', label: 'Bike', color: 0x2ecc71, basePoints: 100, speedFactor: 1.0 },
  vf5: { type: 'vf5', label: 'VF 5 Taxi', color: 0x3498db, basePoints: 200, speedFactor: 0.9 },
};
```

- [ ] **Step 4: Tạo `src/data/levels.ts`**

```ts
import type { LevelDef } from '../core/types';

export const LEVEL_1: LevelDef = {
  id: 'quan-1',
  label: 'Trạm Quận 1',
  durationSec: 120,
  maxOrders: 3,
  patienceRange: [60, 90],
  stations: [
    { type: 'intake', x: -9, z: -4.5 },
    { type: 'wash', x: -9, z: 4.5 },
    { type: 'charger', x: 0, z: -4.8 },
    { type: 'export', x: 9, z: -4.5 },
  ],
};
```

- [ ] **Step 5: Tạo `src/systems/EventBus.ts`**

```ts
type Handler = (...args: unknown[]) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((h) => h(...args));
  }
}

export const bus = new EventBus();
```

- [ ] **Step 6: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, không lỗi.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: core types, config, data, event bus"
```

---

### Task 3: VehicleStateMachine (TDD)

**Files:**
- Create: `src/core/VehicleStateMachine.ts`
- Test: `tests/VehicleStateMachine.test.ts`

**Interfaces:**
- Consumes: `VehicleType`, `VehicleLocation`, `VehicleState` từ `src/core/types.ts`; `CONFIG` từ `src/config.ts`.
- Produces: `class VehicleStateMachine` với `type`, `dirt`, `battery`, `location`, `overchargeTimer`, `state`, `isOvercharged`, `canExport`, `scrub(dtSec)`, `placeOnCharger()`, `removeFromCharger()`, `update(dtSec)`.

- [ ] **Step 1: Viết failing test `tests/VehicleStateMachine.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { VehicleStateMachine } from '../src/core/VehicleStateMachine';

describe('VehicleStateMachine', () => {
  it('starts raw: dirt 100, battery 0', () => {
    const v = new VehicleStateMachine('bike');
    expect(v.dirt).toBe(100);
    expect(v.battery).toBe(0);
    expect(v.state).toBe('raw');
  });

  it('scrub only works when location is wash', () => {
    const v = new VehicleStateMachine('bike');
    v.scrub(1);
    expect(v.dirt).toBe(100);
    v.location = 'wash';
    v.scrub(1);
    expect(v.dirt).toBeLessThan(100);
  });

  it('scrub clamps dirt at 0 and becomes clean', () => {
    const v = new VehicleStateMachine('bike');
    v.location = 'wash';
    v.scrub(10);
    expect(v.dirt).toBe(0);
    expect(v.state).toBe('clean');
  });

  it('charging increases battery and clamps at 100', () => {
    const v = new VehicleStateMachine('bike');
    v.placeOnCharger();
    v.update(10);
    expect(v.battery).toBe(100);
    expect(v.state).toBe('charged');
  });

  it('overcharges after grace period', () => {
    const v = new VehicleStateMachine('bike');
    v.placeOnCharger();
    v.update(8);
    expect(v.state).toBe('charged');
    v.update(3.1);
    expect(v.isOvercharged).toBe(true);
    expect(v.state).toBe('overcharged');
  });

  it('removing from charger stops overcharge', () => {
    const v = new VehicleStateMachine('bike');
    v.placeOnCharger();
    v.update(12);
    expect(v.isOvercharged).toBe(true);
    v.removeFromCharger();
    expect(v.isOvercharged).toBe(false);
  });

  it('canExport requires clean + full battery', () => {
    const v = new VehicleStateMachine('bike');
    expect(v.canExport).toBe(false);
    v.location = 'wash';
    v.scrub(10);
    v.placeOnCharger();
    v.update(10);
    expect(v.canExport).toBe(true);
  });

  it('large dt does not overshoot values', () => {
    const v = new VehicleStateMachine('bike');
    v.location = 'wash';
    v.scrub(1000);
    expect(v.dirt).toBe(0);
    v.placeOnCharger();
    v.update(1000);
    expect(v.battery).toBe(100);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run tests/VehicleStateMachine.test.ts`
Expected: FAIL — "Cannot find module '../src/core/VehicleStateMachine'".

- [ ] **Step 3: Implement `src/core/VehicleStateMachine.ts`**

```ts
import { CONFIG } from '../config';
import type { VehicleLocation, VehicleState, VehicleType } from './types';

export class VehicleStateMachine {
  readonly type: VehicleType;
  dirt = 100;
  battery = 0;
  location: VehicleLocation = 'floor';
  overchargeTimer = 0;
  exported = false;

  constructor(type: VehicleType) {
    this.type = type;
  }

  get state(): VehicleState {
    if (this.exported) return 'exported';
    if (this.location === 'wash' && this.dirt > 0) return 'washing';
    if (this.location === 'charger' && this.battery < 100) return 'charging';
    if (this.isOvercharged) return 'overcharged';
    if (this.location === 'charger' && this.battery >= 100) return 'charged';
    if (this.dirt === 0 && this.battery >= 100) return 'ready';
    if (this.dirt === 0) return 'clean';
    return 'raw';
  }

  get isOvercharged(): boolean {
    return this.location === 'charger' && this.battery >= 100 && this.overchargeTimer <= 0;
  }

  get canExport(): boolean {
    return this.dirt === 0 && this.battery >= 100 && !this.exported;
  }

  scrub(dtSec: number): void {
    if (this.location !== 'wash') return;
    this.dirt = Math.max(0, this.dirt - CONFIG.washRatePerSec * dtSec);
  }

  placeOnCharger(): void {
    this.location = 'charger';
    if (this.battery >= 100) this.overchargeTimer = CONFIG.overchargeGraceSec;
  }

  removeFromCharger(): void {
    if (this.location === 'charger') this.location = 'floor';
    this.overchargeTimer = CONFIG.overchargeGraceSec;
  }

  update(dtSec: number): void {
    if (this.location !== 'charger' || this.exported) return;
    if (this.battery < 100) {
      const timeToFull = (100 - this.battery) / CONFIG.chargeRatePerSec;
      if (dtSec < timeToFull) {
        this.battery += CONFIG.chargeRatePerSec * dtSec;
        return;
      }
      this.battery = 100;
      this.overchargeTimer = CONFIG.overchargeGraceSec;
      dtSec -= timeToFull;
    }
    this.overchargeTimer = Math.max(0, this.overchargeTimer - dtSec);
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run tests/VehicleStateMachine.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/VehicleStateMachine.test.ts src/core/VehicleStateMachine.ts
git commit -m "feat: vehicle state machine with wash/charge/overcharge"
```

---

### Task 4: OrderSystem (TDD)

**Files:**
- Create: `src/core/OrderSystem.ts`
- Test: `tests/OrderSystem.test.ts`

**Interfaces:**
- Consumes: `VehicleType` từ `src/core/types.ts`.
- Produces: `interface Order { id, vehicleType, patience, maxPatience }`; `class OrderSystem` với `orders`, `update(dtSec): Order[]`, `tryFulfill(vehicleType): Order | null`, `fill()`.

- [ ] **Step 1: Viết failing test `tests/OrderSystem.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { OrderSystem } from '../src/core/OrderSystem';

const opts = { maxOrders: 3, patienceRange: [10, 10] as [number, number], random: () => 0 };

describe('OrderSystem', () => {
  it('fill spawns up to maxOrders', () => {
    const os = new OrderSystem(opts);
    os.fill();
    expect(os.orders.length).toBe(3);
  });

  it('update decrements patience and removes expired', () => {
    const os = new OrderSystem({ ...opts, maxOrders: 1 });
    os.fill();
    const expired = os.update(11);
    expect(expired.length).toBe(1);
    expect(os.orders.length).toBe(0);
  });

  it('tryFulfill matches by type and removes order', () => {
    const os = new OrderSystem({ ...opts, maxOrders: 1 });
    os.fill();
    const order = os.tryFulfill('bike');
    expect(order).not.toBeNull();
    expect(order!.vehicleType).toBe('bike');
    expect(os.orders.length).toBe(0);
  });

  it('tryFulfill returns null when no match', () => {
    const os = new OrderSystem({ ...opts, maxOrders: 1 });
    os.fill();
    expect(os.tryFulfill('vf5')).toBeNull();
  });

  it('expired order cannot be fulfilled', () => {
    const os = new OrderSystem({ ...opts, maxOrders: 1, patienceRange: [1, 1] });
    os.fill();
    os.update(2);
    expect(os.tryFulfill('bike')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run tests/OrderSystem.test.ts`
Expected: FAIL — "Cannot find module '../src/core/OrderSystem'".

- [ ] **Step 3: Implement `src/core/OrderSystem.ts`**

```ts
import type { VehicleType } from './types';

export interface Order {
  id: number;
  vehicleType: VehicleType;
  patience: number;
  maxPatience: number;
}

export interface OrderSystemOpts {
  maxOrders: number;
  patienceRange: [number, number];
  random?: () => number;
}

export class OrderSystem {
  private list: Order[] = [];
  private nextId = 1;
  private readonly opts: OrderSystemOpts;
  private readonly random: () => number;

  constructor(opts: OrderSystemOpts) {
    this.opts = opts;
    this.random = opts.random ?? Math.random;
  }

  get orders(): readonly Order[] {
    return this.list;
  }

  fill(): void {
    while (this.list.length < this.opts.maxOrders) {
      const [min, max] = this.opts.patienceRange;
      const patience = min + this.random() * (max - min);
      const vehicleType: VehicleType = this.random() < 0.6 ? 'bike' : 'vf5';
      this.list.push({ id: this.nextId++, vehicleType, patience, maxPatience: patience });
    }
  }

  update(dtSec: number): Order[] {
    const expired: Order[] = [];
    this.list = this.list.filter((o) => {
      o.patience -= dtSec;
      if (o.patience <= 0) {
        expired.push(o);
        return false;
      }
      return true;
    });
    return expired;
  }

  tryFulfill(vehicleType: VehicleType): Order | null {
    const idx = this.list.findIndex((o) => o.vehicleType === vehicleType);
    if (idx === -1) return null;
    return this.list.splice(idx, 1)[0];
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run tests/OrderSystem.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/OrderSystem.test.ts src/core/OrderSystem.ts
git commit -m "feat: order queue with patience and fulfillment"
```

---

### Task 5: ScoreSystem + interaction helper (TDD)

**Files:**
- Create: `src/core/ScoreSystem.ts`, `src/core/interaction.ts`
- Test: `tests/ScoreSystem.test.ts`, `tests/interaction.test.ts`

**Interfaces:**
- Produces: `class ScoreSystem` với `score`, `addDelivery(basePoints)`, `addPenalty(pointsPerSec, dtSec)`; `nearestWithin<T extends Point>(from, items, range): T | null`.

- [ ] **Step 1: Viết failing test `tests/ScoreSystem.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ScoreSystem } from '../src/core/ScoreSystem';

describe('ScoreSystem', () => {
  it('addDelivery adds base points', () => {
    const s = new ScoreSystem();
    s.addDelivery(100);
    expect(s.score).toBe(100);
  });

  it('addPenalty subtracts pointsPerSec * dt', () => {
    const s = new ScoreSystem();
    s.addDelivery(100);
    s.addPenalty(5, 2);
    expect(s.score).toBe(90);
  });

  it('score never goes below 0', () => {
    const s = new ScoreSystem();
    s.addPenalty(5, 100);
    expect(s.score).toBe(0);
  });
});
```

- [ ] **Step 2: Viết failing test `tests/interaction.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { nearestWithin } from '../src/core/interaction';

describe('nearestWithin', () => {
  it('returns nearest item within range', () => {
    const items = [{ x: 10, z: 0 }, { x: 50, z: 0 }];
    expect(nearestWithin({ x: 0, z: 0 }, items, 60)).toBe(items[0]);
  });

  it('returns null when nothing in range', () => {
    expect(nearestWithin({ x: 0, z: 0 }, [{ x: 100, z: 0 }], 60)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(nearestWithin({ x: 0, z: 0 }, [], 60)).toBeNull();
  });

  it('first item wins on tie', () => {
    const items = [{ x: 10, z: 0 }, { x: -10, z: 0 }];
    expect(nearestWithin({ x: 0, z: 0 }, items, 60)).toBe(items[0]);
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận fail**

Run: `npx vitest run tests/ScoreSystem.test.ts tests/interaction.test.ts`
Expected: FAIL — "Cannot find module".

- [ ] **Step 4: Implement `src/core/ScoreSystem.ts`**

```ts
export class ScoreSystem {
  score = 0;

  addDelivery(basePoints: number): void {
    this.score += basePoints;
  }

  addPenalty(pointsPerSec: number, dtSec: number): void {
    this.score = Math.max(0, this.score - pointsPerSec * dtSec);
  }
}
```

- [ ] **Step 5: Implement `src/core/interaction.ts`**

```ts
export interface Point {
  x: number;
  z: number;
}

export function nearestWithin<T extends Point>(from: Point, items: T[], range: number): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const item of items) {
    const d = Math.hypot(item.x - from.x, item.z - from.z);
    if (d <= range && d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}
```

- [ ] **Step 6: Chạy test để xác nhận pass**

Run: `npx vitest run tests/ScoreSystem.test.ts tests/interaction.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 7: Commit**

```bash
git add tests/ScoreSystem.test.ts tests/interaction.test.ts src/core/ScoreSystem.ts src/core/interaction.ts
git commit -m "feat: score system and nearest-target interaction"
```

---

### Task 6: Three.js world + stations

**Files:**
- Create: `src/game/Game.ts`, `src/entities/Station.ts`, `src/ui/label3d.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `LEVEL_1` từ `src/data/levels.ts`; `StationType` từ `src/core/types.ts`.
- Produces: `class Game` (renderer, scene, camera, stations, loop); `class Station` với `type`, `group`, `occupant`, `position`; `makeLabel(text)`, `setLabelText(sprite, text)`.

- [ ] **Step 1: Tạo `src/ui/label3d.ts`** (label 3D từ CanvasTexture)

```ts
import * as THREE from 'three';

export function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  setLabelText(sprite, text);
  return sprite;
}

export function setLabelText(sprite: THREE.Sprite, text: string): void {
  const material = sprite.material as THREE.SpriteMaterial;
  const canvas = material.map!.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  material.map!.needsUpdate = true;
}
```

- [ ] **Step 2: Tạo stub `src/entities/Vehicle.ts` + `src/entities/Station.ts`**

`src/entities/Vehicle.ts` (stub — implementation đầy đủ ở Task 9):

```ts
import * as THREE from 'three';
import type { VehicleType } from '../core/types';

export class Vehicle {
  readonly model = { location: 'floor' as string };
  readonly mesh: THREE.Mesh;

  constructor(scene: THREE.Scene, x: number, z: number, _type: VehicleType) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x2ecc71 }),
    );
    this.mesh.position.set(x, 0.25, z);
    scene.add(this.mesh);
  }
}
```

`src/entities/Station.ts`:

```ts
import * as THREE from 'three';
import type { StationType } from '../core/types';
import type { Vehicle } from './Vehicle';
import { makeLabel } from '../ui/label3d';

export class Station {
  readonly type: StationType;
  readonly group: THREE.Group;
  occupant: Vehicle | null = null;

  constructor(scene: THREE.Scene, type: StationType, x: number, z: number, color: number, label: string) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 1.8),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.5 }),
    );
    pad.position.y = 0.05;
    this.group.add(pad);

    const labelSprite = makeLabel(label);
    labelSprite.position.set(0, 1.2, 0);
    this.group.add(labelSprite);

    scene.add(this.group);
  }

  get position(): { x: number; z: number } {
    return { x: this.group.position.x, z: this.group.position.z };
  }
}
```

- [ ] **Step 3: Tạo `src/game/Game.ts`**

```ts
import * as THREE from 'three';
import { LEVEL_1 } from '../data/levels';
import { Station } from '../entities/Station';
import type { StationType } from '../core/types';

const STATION_STYLE: Record<StationType, { color: number; label: string }> = {
  intake: { color: 0x2ecc71, label: 'NHẬP XE' },
  wash: { color: 0x00bcd4, label: 'RỬA XE' },
  charger: { color: 0xf1c40f, label: 'SẠC V-GREEN' },
  export: { color: 0xe74c3c, label: 'XUẤT BẾN' },
};

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly stations: Station[] = [];

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 14, 11);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(5, 10, 5);
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 13.5),
      new THREE.MeshStandardMaterial({ color: 0x3a3a5a }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    for (const def of LEVEL_1.stations) {
      const style = STATION_STYLE[def.type];
      this.stations.push(new Station(this.scene, def.type, def.x, def.z, style.color, style.label));
    }

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  start(): void {
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
    });
  }
}
```

- [ ] **Step 4: Thay `src/main.ts` bằng bootstrap Game**

```ts
import { Game } from './game/Game';

const game = new Game(document.getElementById('game')!);
game.start();
```

- [ ] **Step 5: Verify world + resize**

Run: `npm run dev`
Expected: thấy mặt phẳng 3D + 4 trạm có pad màu và label (NHẬP XE / RỬA XE / SẠC V-GREEN / XUẤT BẾN); xoay ngang/dọc cửa sổ → canvas + camera aspect cập nhật đúng, không méo.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: three.js world, camera, lights, stations"
```

---

### Task 7: Player + camera-relative movement + dash

**Files:**
- Create: `src/entities/Player.ts`
- Modify: `src/game/Game.ts`

**Interfaces:**
- Consumes: `CONFIG` từ `src/config.ts`; `InputState` từ `src/systems/InputSystem.ts` (Task 8).
- Produces: `class Player` với `mesh`, `carrying: Vehicle | null`, `position`, `update(input, dtSec, nowMs)`.

- [ ] **Step 1: Tạo stub `src/systems/InputSystem.ts` + `src/entities/Player.ts`**

`src/systems/InputSystem.ts` (stub — implementation đầy đủ ở Task 8):

```ts
export interface InputState {
  move: { x: number; y: number };
  actionDown: boolean;
  actionJustPressed: boolean;
  dashJustPressed: boolean;
}

export class InputSystem {
  readonly state: InputState = {
    move: { x: 0, y: 0 },
    actionDown: false,
    actionJustPressed: false,
    dashJustPressed: false,
  };

  update(): void {}
}
```

`src/entities/Player.ts`:

```ts
import * as THREE from 'three';
import { CONFIG } from '../config';
import type { InputState } from '../systems/InputSystem';
import type { Vehicle } from './Vehicle';

export class Player {
  readonly mesh: THREE.Mesh;
  carrying: Vehicle | null = null;
  private facing = new THREE.Vector2(0, 1);
  private dashUntil = 0;
  private dashCooldownUntil = 0;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    this.mesh.position.set(0, 0.8, 2);
    scene.add(this.mesh);
  }

  get position(): { x: number; z: number } {
    return { x: this.mesh.position.x, z: this.mesh.position.z };
  }

  update(input: InputState, dtSec: number, nowMs: number): void {
    if (input.dashJustPressed && nowMs >= this.dashCooldownUntil) {
      this.dashUntil = nowMs + CONFIG.dashDurationMs;
      this.dashCooldownUntil = nowMs + CONFIG.dashCooldownMs;
    }

    const speed = this.carrying ? CONFIG.playerSpeed * CONFIG.carrySpeedFactor : CONFIG.playerSpeed;
    let vx: number;
    let vz: number;
    if (nowMs < this.dashUntil) {
      vx = this.facing.x * CONFIG.dashSpeed;
      vz = this.facing.y * CONFIG.dashSpeed;
    } else {
      vx = input.move.x * speed;
      vz = input.move.y * speed;
      if (input.move.x !== 0 || input.move.y !== 0) {
        this.facing.set(input.move.x, input.move.y).normalize();
      }
    }

    this.mesh.position.x = THREE.MathUtils.clamp(
      this.mesh.position.x + vx * dtSec,
      -CONFIG.mapHalfWidth,
      CONFIG.mapHalfWidth,
    );
    this.mesh.position.z = THREE.MathUtils.clamp(
      this.mesh.position.z + vz * dtSec,
      -CONFIG.mapHalfDepth,
      CONFIG.mapHalfDepth,
    );
  }
}
```

- [ ] **Step 2: Wire Player vào `Game`**

Thêm vào `Game`:

```ts
readonly player: Player;

// trong constructor, sau build stations:
this.player = new Player(this.scene);

// thêm method:
update(dtSec: number, nowMs: number): void {
  this.player.update(this.input.state, dtSec, nowMs);
}
```

Thêm import `Player`. Trong constructor: `this.input = new InputSystem();` (stub từ Step 1 — Task 8 thay bằng implementation đầy đủ).

- [ ] **Step 3: Verify movement**

Run: `npm run dev`
Expected: (sau Task 8) joystick/WASD di chuyển capsule trên mặt phẳng; dash lao nhanh 150ms rồi cooldown 2s; không ra khỏi map.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: player capsule, movement, dash"
```

---

### Task 8: InputSystem — DOM joystick + buttons + keyboard

**Files:**
- Create: `src/ui/Joystick.ts`, `src/ui/TouchButton.ts`, `src/systems/InputSystem.ts`
- Modify: `src/game/Game.ts`

**Interfaces:**
- Produces: `interface InputState { move, actionDown, actionJustPressed, dashJustPressed }`; `class InputSystem` với `state`, `update()`; `class Joystick` với `vector`; `class TouchButton` với `isDown`.

- [ ] **Step 1: Tạo `src/ui/Joystick.ts`** (DOM, pointer events)

```ts
export class Joystick {
  private el: HTMLDivElement;
  private knob: HTMLDivElement;
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 70;
  private vec = { x: 0, y: 0 };

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:fixed;left:24px;bottom:24px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.12);touch-action:none;';
    this.knob = document.createElement('div');
    this.knob.style.cssText =
      'position:absolute;left:50%;top:50%;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.35);transform:translate(-50%,-50%);';
    this.el.appendChild(this.knob);
    parent.appendChild(this.el);

    this.el.addEventListener('pointerdown', (e) => {
      this.pointerId = e.pointerId;
      this.el.setPointerCapture(e.pointerId);
      const rect = this.el.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.update(e.clientX, e.clientY);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.update(e.clientX, e.clientY);
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.vec = { x: 0, y: 0 };
      this.knob.style.transform = 'translate(-50%,-50%)';
    };
    this.el.addEventListener('pointerup', release);
    this.el.addEventListener('pointercancel', release);
  }

  get vector(): { x: number; y: number } {
    return this.vec;
  }

  private update(cx: number, cy: number): void {
    const dx = cx - this.centerX;
    const dy = cy - this.centerY;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, this.radius);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    this.knob.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
    this.vec = { x: nx * (clamped / this.radius), y: ny * (clamped / this.radius) };
  }
}
```

- [ ] **Step 2: Tạo `src/ui/TouchButton.ts`**

```ts
export class TouchButton {
  private el: HTMLButtonElement;
  private down = false;

  constructor(parent: HTMLElement, label: string, right: number, bottom: number, size: number) {
    this.el = document.createElement('button');
    this.el.textContent = label;
    this.el.style.cssText = `position:fixed;right:${right}px;bottom:${bottom}px;width:${size}px;height:${size}px;border-radius:50%;border:none;background:rgba(255,255,255,0.2);color:#fff;font-size:16px;font-weight:bold;touch-action:none;`;
    parent.appendChild(this.el);
    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.down = true;
      this.el.style.background = 'rgba(255,255,255,0.45)';
    });
    const release = () => {
      this.down = false;
      this.el.style.background = 'rgba(255,255,255,0.2)';
    };
    this.el.addEventListener('pointerup', release);
    this.el.addEventListener('pointercancel', release);
    this.el.addEventListener('pointerleave', release);
  }

  get isDown(): boolean {
    return this.down;
  }
}
```

- [ ] **Step 3: Tạo `src/systems/InputSystem.ts`**

```ts
import { Joystick } from '../ui/Joystick';
import { TouchButton } from '../ui/TouchButton';

export interface InputState {
  move: { x: number; y: number };
  actionDown: boolean;
  actionJustPressed: boolean;
  dashJustPressed: boolean;
}

export class InputSystem {
  private joystick: Joystick;
  private actionBtn: TouchButton;
  private dashBtn: TouchButton;
  private keys = new Set<string>();
  private prevAction = false;
  private prevDash = false;
  private current: InputState = {
    move: { x: 0, y: 0 },
    actionDown: false,
    actionJustPressed: false,
    dashJustPressed: false,
  };

  constructor(uiRoot: HTMLElement) {
    this.joystick = new Joystick(uiRoot);
    this.actionBtn = new TouchButton(uiRoot, 'A', 24, 40, 88);
    this.dashBtn = new TouchButton(uiRoot, 'DASH', 130, 110, 64);
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  update(): void {
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    if (mx === 0 && my === 0) {
      const v = this.joystick.vector;
      mx = v.x;
      my = v.y;
    } else {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }

    const actionDown = this.actionBtn.isDown || this.keys.has('Space');
    const dashDown = this.dashBtn.isDown || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    this.current.move = { x: mx, y: my };
    this.current.actionDown = actionDown;
    this.current.actionJustPressed = actionDown && !this.prevAction;
    this.current.dashJustPressed = dashDown && !this.prevDash;
    this.prevAction = actionDown;
    this.prevDash = dashDown;
  }

  get state(): InputState {
    return this.current;
  }
}
```

- [ ] **Step 4: Wire InputSystem vào `Game`**

Thay khai báo tạm ở Task 7:

```ts
readonly input: InputSystem;

// trong constructor:
this.input = new InputSystem(document.getElementById('ui')!);

// trong update():
this.input.update();
this.player.update(this.input.state, dtSec, nowMs);
```

- [ ] **Step 5: Verify multi-touch + dash**

Run: `npm run dev`
Expected: joystick trái di chuyển player; giữ joystick + bấm A/DASH cùng lúc vẫn nhận cả hai; trượt ngón ra ngoài joystick vẫn di chuyển theo (pointer capture); dash cooldown 2s; WASD + Space/Shift hoạt động trên desktop.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: DOM joystick, touch buttons, input system"
```

---

### Task 9: Vehicle entity + carry/drop/place

**Files:**
- Create: `src/entities/Vehicle.ts`
- Modify: `src/game/Game.ts`

**Interfaces:**
- Consumes: `VehicleStateMachine` từ Task 3; `Station` từ Task 6; `Player` từ Task 7; `nearestWithin` từ Task 5; `VEHICLES` từ Task 2.
- Produces: `class Vehicle` với `model`, `mesh`, `position`, `setPosition(x, z)`, `updateLabel()`, `dispose(scene)`.

- [ ] **Step 1: Tạo `src/entities/Vehicle.ts`**

```ts
import * as THREE from 'three';
import { VehicleStateMachine } from '../core/VehicleStateMachine';
import type { VehicleType } from '../core/types';
import { VEHICLES } from '../data/vehicles';
import { makeLabel, setLabelText } from '../ui/label3d';

export class Vehicle {
  readonly model: VehicleStateMachine;
  readonly mesh: THREE.Mesh;
  private label: THREE.Sprite;

  constructor(scene: THREE.Scene, x: number, z: number, type: VehicleType) {
    this.model = new VehicleStateMachine(type);
    const def = VEHICLES[type];
    const size: [number, number, number] = type === 'bike' ? [1.0, 0.5, 0.5] : [1.3, 0.6, 0.7];
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      new THREE.MeshStandardMaterial({ color: def.color }),
    );
    this.mesh.position.set(x, size[1] / 2, z);
    scene.add(this.mesh);
    this.label = makeLabel('');
    this.label.position.set(0, 1.0, 0);
    this.mesh.add(this.label);
  }

  get position(): { x: number; z: number } {
    return { x: this.mesh.position.x, z: this.mesh.position.z };
  }

  setPosition(x: number, z: number): void {
    this.mesh.position.x = x;
    this.mesh.position.z = z;
  }

  updateLabel(): void {
    setLabelText(this.label, `Bẩn ${Math.round(this.model.dirt)}% | Pin ${Math.round(this.model.battery)}%`);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
```

- [ ] **Step 2: Wire carry/drop/place vào `Game`**

Thêm vào `Game`:

```ts
readonly vehicles: Vehicle[] = [];

// trong update(), sau player.update():
this.handleAction();
this.updateCarried();
this.updateVehicleLabels();

private handleAction(): void {
  const s = this.input.state;
  if (!s.actionJustPressed) return;
  const player = this.player;

  if (player.carrying) {
    const station = nearestWithin(
      player.position,
      this.stations.filter((st) => st.type !== 'intake'),
      CONFIG.interactionRange,
    );
    if (station) {
      this.placeVehicle(station, player.carrying);
    } else {
      this.dropVehicle();
    }
  } else {
    const vehicle = nearestWithin(
      player.position,
      this.vehicles.filter((v) => v.model.location !== 'exported'),
      CONFIG.interactionRange,
    );
    if (vehicle) this.pickUpVehicle(vehicle);
  }
}

private pickUpVehicle(vehicle: Vehicle): void {
  for (const st of this.stations) {
    if (st.occupant === vehicle) st.occupant = null;
  }
  vehicle.model.removeFromCharger();
  vehicle.model.location = 'carried';
  this.player.carrying = vehicle;
}

private dropVehicle(): void {
  const vehicle = this.player.carrying;
  if (!vehicle) return;
  vehicle.model.location = 'floor';
  vehicle.setPosition(this.player.position.x, this.player.position.z + 0.8);
  this.player.carrying = null;
}

private placeVehicle(station: Station, vehicle: Vehicle): void {
  if (station.occupant) return;
  station.occupant = vehicle;
  vehicle.setPosition(station.position.x, station.position.z);
  this.player.carrying = null;
  if (station.type === 'wash') vehicle.model.location = 'wash';
  if (station.type === 'charger') vehicle.model.placeOnCharger();
  if (station.type === 'export') vehicle.model.location = 'export';
}

private updateCarried(): void {
  const v = this.player.carrying;
  if (v) v.setPosition(this.player.position.x, this.player.position.z);
}

private updateVehicleLabels(): void {
  for (const v of this.vehicles) v.updateLabel();
}
```

Thêm import `nearestWithin`, `Vehicle`, `CONFIG`.

- [ ] **Step 3: Verify carry/drop/place**

Run: `npm run dev`
Expected: tạm thêm 1 xe test trong constructor: `this.vehicles.push(new Vehicle(this.scene, 0, 2, 'bike'));` → bấm A gần xe để bưng (xe dính theo player), bấm A lần nữa để đặt xuống/đặt vào trạm; đứng giữa xe và trạm → ưu tiên trạm khi đang bưng xe.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: vehicle entity, carry/drop/place"
```

---

### Task 10: Wash + Charger behaviors

**Files:**
- Modify: `src/game/Game.ts`, `src/entities/Vehicle.ts`

**Interfaces:**
- Consumes: `VehicleStateMachine.scrub/update/isOvercharged` từ Task 3; `ScoreSystem.addPenalty` từ Task 5; `InputState.actionDown` từ Task 8.
- Produces: wash hold-to-scrub; charger auto-charge + overcharge penalty; `Vehicle.notifiedFull: boolean`.

- [ ] **Step 1: Thêm `notifiedFull` vào `Vehicle`**

```ts
notifiedFull = false;
```

Đồng thời trong `Game.pickUpVehicle()` (Task 9), thêm `vehicle.notifiedFull = false;` để xe nhấc ra rồi đặt lại vẫn flash chuông đúng.

- [ ] **Step 2: Wire wash + charger vào `Game.update()`**

Thêm vào `update()` sau `handleAction()`:

```ts
this.updateWash(dtSec);
this.updateChargers(dtSec);

private updateWash(dtSec: number): void {
  const s = this.input.state;
  if (!s.actionDown || this.player.carrying) return;
  const wash = this.stations.find((st) => st.type === 'wash');
  if (!wash || !wash.occupant) return;
  if (nearestWithin(this.player.position, [wash], CONFIG.interactionRange) !== wash) return;
  wash.occupant.model.scrub(dtSec);
}

private updateChargers(dtSec: number): void {
  for (const st of this.stations) {
    if (st.type !== 'charger') continue;
    const v = st.occupant;
    if (!v) continue;
    v.model.update(dtSec);
    if (v.model.battery >= 100 && !v.notifiedFull) {
      v.notifiedFull = true;
      this.flashStation(st, 0xffffff);
    }
    if (v.model.isOvercharged) {
      this.score.addPenalty(CONFIG.overchargePenaltyPerSec, dtSec);
      st.group.scale.setScalar(1 + 0.05 * Math.sin(performance.now() / 100));
    } else {
      st.group.scale.setScalar(1);
    }
  }
}

private flashStation(station: Station, color: number): void {
  const pad = station.group.children[0] as THREE.Mesh;
  const material = pad.material as THREE.MeshStandardMaterial;
  const original = material.color.getHex();
  material.color.setHex(color);
  setTimeout(() => material.color.setHex(original), 200);
}
```

Thêm `readonly score = new ScoreSystem();` vào `Game`, import `ScoreSystem`.

- [ ] **Step 3: Verify wash + charge + overcharge**

Run: `npm run dev`
Expected: đặt xe vào RỬA XE → đứng gần giữ A → label "Bẩn" giảm về 0% trong ~3s; nhả nút → dừng. Đặt xe vào SẠC V-GREEN → pin tự tăng 0→100% trong ~8s; đạt 100% → pad flash trắng; để quá 3s → trạm nhấp nháy (scale pulse), điểm trừ liên tục; nhấc xe ra → dừng phạt.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wash hold-to-scrub, charger auto-charge, overcharge penalty"
```

---

### Task 11: Intake + Export + order flow

**Files:**
- Modify: `src/game/Game.ts`, `src/ui/label3d.ts`

**Interfaces:**
- Consumes: `OrderSystem` từ Task 4; `ScoreSystem` từ Task 5; `VEHICLES` từ Task 2; `bus` từ Task 2.
- Produces: intake spawn buttons; export fulfillment; events `orders:changed`, `score:changed`.

- [ ] **Step 1: Wire intake spawn vào `Game`**

Thêm vào `Game`:

```ts
readonly orderSystem = new OrderSystem({ maxOrders: CONFIG.maxOrders, patienceRange: CONFIG.patienceRange });
private intakeCooldownUntil = 0;
private ordersEmitAccum = 0;

// trong constructor, sau stations:
this.orderSystem.fill();
bus.emit('orders:changed', this.orderSystem.orders);
this.buildIntakeButtons();

private buildIntakeButtons(): void {
  const mk = (dx: number, type: VehicleType, label: string) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText =
      'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);padding:10px 18px;border:none;border-radius:8px;background:#2ecc71;color:#fff;font-weight:bold;font-size:16px;';
    btn.style.marginLeft = `${dx}px`;
    btn.addEventListener('pointerdown', () => this.spawnVehicle(type));
    document.getElementById('ui')!.appendChild(btn);
  };
  mk(-60, 'bike', 'BIKE');
  mk(60, 'vf5', 'VF 5');
}

private spawnVehicle(type: VehicleType): void {
  const now = performance.now();
  if (now < this.intakeCooldownUntil) return;
  const intake = this.stations.find((st) => st.type === 'intake')!;
  if (intake.occupant) return;
  const v = new Vehicle(this.scene, intake.position.x, intake.position.z, type);
  this.vehicles.push(v);
  intake.occupant = v;
  this.intakeCooldownUntil = now + CONFIG.intakeCooldownMs;
}
```

- [ ] **Step 2: Wire export fulfillment vào `placeVehicle()`**

Thay nhánh export:

```ts
if (station.type === 'export') {
  vehicle.model.location = 'export';
  this.tryExport(station, vehicle);
}

private tryExport(station: Station, vehicle: Vehicle): void {
  if (!vehicle.model.canExport) {
    this.flashStation(station, 0xff0000);
    return;
  }
  const order = this.orderSystem.tryFulfill(vehicle.model.type);
  if (!order) {
    this.flashStation(station, 0xff0000);
    return;
  }
  this.score.addDelivery(VEHICLES[vehicle.model.type].basePoints);
  station.occupant = null;
  vehicle.model.exported = true;
  vehicle.model.location = 'exported';
  vehicle.dispose(this.scene);
  this.vehicles.splice(this.vehicles.indexOf(vehicle), 1);
  this.orderSystem.fill();
  bus.emit('orders:changed', this.orderSystem.orders);
  bus.emit('score:changed', this.score.score);
  this.flashStation(station, 0x00ff00);
}
```

- [ ] **Step 3: Order tick trong `update()`**

```ts
this.updateOrders(dtSec);

private updateOrders(dtSec: number): void {
  this.orderSystem.update(dtSec);
  this.orderSystem.fill();
  this.ordersEmitAccum += dtSec;
  if (this.ordersEmitAccum >= 0.25) {
    this.ordersEmitAccum = 0;
    bus.emit('orders:changed', this.orderSystem.orders);
  }
}
```

- [ ] **Step 4: Verify full loop**

Run: `npm run dev`
Expected: bấm BIKE/VF 5 → xe spawn ở NHẬP XE (cooldown 2s); bưng xe → rửa → sạc → xuất bến đúng loại đơn → điểm tăng, xe biến mất, đơn mới spawn; xuất sai (chưa sạch/chưa đầy pin/sai loại) → pad flash đỏ, xe vẫn ở đó.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: intake spawn, export fulfillment, order flow"
```

---

### Task 12: HUD + timer + game over + restart

**Files:**
- Create: `src/ui/Hud.ts`
- Modify: `src/game/Game.ts`

**Interfaces:**
- Consumes: `bus` events `orders:changed`, `score:changed`, `timer:changed`, `game:over`; `Order` từ Task 4; `VEHICLES` từ Task 2.
- Produces: HUD DOM hoàn chỉnh; restart flow.

- [ ] **Step 1: Tạo `src/ui/Hud.ts`**

```ts
import { bus } from '../systems/EventBus';
import { VEHICLES } from '../data/vehicles';
import type { Order } from '../core/OrderSystem';

export class Hud {
  private ordersEl: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private timerEl: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.ordersEl = document.createElement('div');
    this.ordersEl.style.cssText =
      'position:fixed;left:16px;top:16px;display:flex;gap:8px;font-size:14px;color:#fff;';
    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText =
      'position:fixed;right:16px;top:16px;font-size:20px;font-weight:bold;color:#fff;';
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText =
      'position:fixed;left:50%;top:16px;transform:translateX(-50%);font-size:24px;font-weight:bold;color:#fff;';
    parent.append(this.ordersEl, this.scoreEl, this.timerEl);

    bus.on('orders:changed', (orders) => this.setOrders(orders as readonly Order[]));
    bus.on('score:changed', (score) => this.setScore(score as number));
    bus.on('timer:changed', (t) => this.setTimer(t as number));
    bus.on('game:over', (score) => this.showGameOver(score as number));
  }

  private setOrders(orders: readonly Order[]): void {
    this.ordersEl.innerHTML = '';
    for (const o of orders) {
      const chip = document.createElement('div');
      chip.textContent = `${VEHICLES[o.vehicleType].label} — ${Math.ceil(o.patience)}s`;
      chip.style.cssText = `padding:6px 10px;border-radius:6px;background:${o.vehicleType === 'bike' ? '#2ecc71' : '#3498db'};color:#fff;`;
      this.ordersEl.appendChild(chip);
    }
  }

  private setScore(score: number): void {
    this.scoreEl.textContent = `Điểm: ${Math.round(score)}`;
  }

  private setTimer(t: number): void {
    this.timerEl.textContent = `${Math.ceil(t)}`;
  }

  private showGameOver(score: number): void {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:16px;';
    const title = document.createElement('div');
    title.textContent = 'HẾT GIỜ!';
    title.style.cssText = 'font-size:48px;font-weight:bold;';
    const scoreEl = document.createElement('div');
    scoreEl.textContent = `Điểm: ${Math.round(score)}`;
    scoreEl.style.cssText = 'font-size:32px;';
    const btn = document.createElement('button');
    btn.textContent = 'CHƠI LẠI';
    btn.style.cssText =
      'padding:12px 28px;font-size:24px;font-weight:bold;border:none;border-radius:10px;background:#0b5cff;color:#fff;';
    btn.addEventListener('pointerdown', () => window.location.reload());
    overlay.append(title, scoreEl, btn);
    document.getElementById('ui')!.appendChild(overlay);
  }
}
```

- [ ] **Step 2: Wire timer + game over vào `Game`**

Thêm vào `Game`:

```ts
private timeLeft = CONFIG.levelDurationSec;
private gameOver = false;

// trong constructor:
new Hud(document.getElementById('ui')!);

// đầu update():
if (this.gameOver) return;

// cuối update():
this.updateTimer(dtSec);

private updateTimer(dtSec: number): void {
  this.timeLeft -= dtSec;
  bus.emit('timer:changed', Math.max(0, this.timeLeft));
  if (this.timeLeft <= 0) {
    this.gameOver = true;
    bus.emit('game:over', this.score.score);
  }
}
```

Thêm import `Hud`, `bus`.

- [ ] **Step 3: Verify HUD + game over**

Run: `npm run dev`
Expected: HUD hiện đơn hàng + patience đếm ngược, điểm, timer; hết 120s → overlay HẾT GIỜ + điểm + nút CHƠI LẠI; bấm CHƠI LẠI → ván mới sạch (điểm 0, timer 120, đơn mới).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: HUD, timer, game over and restart"
```

---

### Task 13: Mobile polish + playtest build

**Files:**
- Modify: `index.html`, `src/main.ts`

**Interfaces:**
- Produces: bản build chơi được trên điện thoại qua LAN.

- [ ] **Step 1: Portrait overlay + chặn context menu**

Thêm vào `index.html` trong `<body>`:

```html
<div id="rotate">Xoay ngang máy để chơi</div>
```

và CSS:

```css
#rotate {
  display: none;
  position: fixed;
  inset: 0;
  background: #111;
  color: #fff;
  font: 20px sans-serif;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
@media (orientation: portrait) {
  #rotate { display: flex; }
}
```

Thêm vào `src/main.ts`:

```ts
document.addEventListener('contextmenu', (e) => e.preventDefault());
```

- [ ] **Step 2: Build production**

Run: `npm run build`
Expected: PASS, không lỗi TypeScript, output trong `dist/`.

- [ ] **Step 3: Test trên điện thoại qua LAN**

Run: `npm run preview`
Expected: mở `http://<IP-máy-tính>:4173` trên điện thoại cùng WiFi → chơi được bằng cảm ứng, landscape, không scroll/zoom, joystick + A + DASH hoạt động đồng thời.

- [ ] **Step 4: Perf check**

Expected: FPS ổn định ~60 trên máy tầm trung; không drop frame khi 3 xe + 3 đơn cùng lúc.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mobile polish, portrait overlay, production build"
```

---

## Sau MVP

- Playtest 3-5 người, ghi lại: loop có vui không, trạm nào bottleneck, tốc độ rửa/sạc có ổn không
- Tuning số trong `src/config.ts` theo feedback
- Sau đó mới sang GĐ 2 (phụ kiện, combo, chaos, cao điểm, xe hỏng, map mới) — xem design doc
- Model 3D final: concept 2D → image-to-3D → Blender → Mixamo → GLB (pipeline ở spec mục 6.6)

