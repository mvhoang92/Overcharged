# Overcharged MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bản chơi được single-player của Overcharged — nhận xe, rửa, sạc, xuất bến — chạy trên mobile browser landscape.

**Architecture:** Phaser 3 + TypeScript + Vite. Logic thuần (VehicleStateMachine, OrderSystem, ScoreSystem, nearestWithin) nằm trong `src/core/`, test bằng Vitest, không import Phaser. Phaser layer (`scenes/`, `entities/`, `ui/`, `systems/`) chỉ render + input, gọi core.

**Tech Stack:** Phaser 3.80+, TypeScript 5.6, Vite 5.4, Vitest 2.1.

**Spec:** `docs/superpowers/specs/2026-11-27-overcharged-design.md`

## Global Constraints

- Mobile landscape, touch-first; keyboard WASD/arrows + Space/Shift fallback cho desktop dev
- Placeholder art: texture generate bằng Phaser Graphics, không asset ngoài
- Không backend, không co-op, không voucher, không combo (MVP)
- UI text tiếng Việt
- 60fps target; không allocate object trong update loop
- Data-driven: `src/data/vehicles.ts`, `src/data/levels.ts`
- dt clamp 0.1s trong `GameScene.update`

## Review Focus

1. **Multi-touch đồng thời** (joystick + action + dash): ngón trượt ra ngoài vùng joystick không được mất input — Task 7 verification.
2. **dt lớn khi tab background:** dirt/battery/overcharge clamp, penalty không double-count — Task 3 + Task 5 tests.
3. **Order hết hạn cùng frame với fulfill:** fulfill sau update trả null — Task 4 test.
4. **Action context giữa xe và trạm:** chọn mục tiêu gần nhất, ưu tiên trạm khi đang bưng xe — Task 8 test.
5. **Clamp 0-100:** dirt/battery không âm/vượt — Task 3 tests.

---

### Task 1: Scaffold project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/UIScene.ts`

**Interfaces:**
- Produces: `npm run dev` chạy Phaser với 3 scene stub; `npm test` chạy Vitest; `npm run build` build production.

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
    "phaser": "^3.80.1"
  },
  "devDependencies": {
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

- [ ] **Step 3: Tạo `index.html`** (viewport mobile, không zoom, landscape)

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0b5cff" />
    <title>Overcharged: Trạm Sạc Bão Táp</title>
    <style>
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #111; }
      #game { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Tạo `src/main.ts` + 3 scene stub**

`src/main.ts`:

```ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, GameScene, UIScene],
});
```

`src/scenes/BootScene.ts`:

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Game');
  }
}
```

`src/scenes/GameScene.ts`:

```ts
import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(): void {
    this.add.text(640, 360, 'Overcharged MVP', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
  }
}
```

`src/scenes/UIScene.ts`:

```ts
import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }
}
```

- [ ] **Step 5: Cài dependencies và chạy dev server**

Run: `npm install && npm run dev`
Expected: Vite serve, mở browser thấy text "Overcharged MVP" giữa màn hình.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Phaser 3 + TS + Vite + Vitest"
```

---

### Task 2: Core types, config, data, EventBus

**Files:**
- Create: `src/core/types.ts`, `src/config.ts`, `src/data/vehicles.ts`, `src/data/levels.ts`, `src/systems/EventBus.ts`

**Interfaces:**
- Produces: `VehicleType`, `VehicleLocation`, `VehicleState`, `StationType`, `VehicleDef`, `LevelDef`; `CONFIG`; `VEHICLES`; `LEVEL_1`; `bus` (Phaser.Events.EventEmitter).

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
  stations: Array<{ type: StationType; x: number; y: number }>;
}
```

- [ ] **Step 2: Tạo `src/config.ts`**

```ts
export const CONFIG = {
  playerSpeed: 220,
  dashSpeed: 520,
  dashDurationMs: 150,
  dashCooldownMs: 2000,
  carrySpeedFactor: 0.8,
  washRatePerSec: 34,
  chargeRatePerSec: 12.5,
  overchargeGraceSec: 3,
  overchargePenaltyPerSec: 5,
  intakeCooldownMs: 2000,
  interactionRange: 70,
  levelDurationSec: 120,
  maxOrders: 3,
  patienceRange: [60, 90] as [number, number],
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
    { type: 'intake', x: 140, y: 140 },
    { type: 'wash', x: 140, y: 580 },
    { type: 'charger', x: 640, y: 120 },
    { type: 'export', x: 1140, y: 140 },
  ],
};
```

- [ ] **Step 5: Tạo `src/systems/EventBus.ts`**

```ts
import Phaser from 'phaser';

export const bus = new Phaser.Events.EventEmitter();
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

### Task 5: ScoreSystem (TDD)

**Files:**
- Create: `src/core/ScoreSystem.ts`
- Test: `tests/ScoreSystem.test.ts`

**Interfaces:**
- Produces: `class ScoreSystem` với `score`, `addDelivery(basePoints)`, `addPenalty(pointsPerSec, dtSec)`.

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

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run tests/ScoreSystem.test.ts`
Expected: FAIL — "Cannot find module '../src/core/ScoreSystem'".

- [ ] **Step 3: Implement `src/core/ScoreSystem.ts`**

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

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run tests/ScoreSystem.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/ScoreSystem.test.ts src/core/ScoreSystem.ts
git commit -m "feat: score system with delivery and penalty"
```

---

### Task 6: BootScene textures + GameScene map + Station base

**Files:**
- Modify: `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`
- Create: `src/entities/stations/Station.ts`, `src/entities/stations/IntakeStation.ts`, `src/entities/stations/WashStation.ts`, `src/entities/stations/ChargerStation.ts`, `src/entities/stations/ExportStation.ts`

**Interfaces:**
- Consumes: `LEVEL_1` từ `src/data/levels.ts`; `StationType` từ `src/core/types.ts`.
- Produces: textures `player`, `bike`, `vf5`; `class Station` (Container) với `stationType`, `occupant: Vehicle | null`, `anchor`; 4 subclass `IntakeStation`, `WashStation`, `ChargerStation`, `ExportStation` (constructor `(scene, x, y)`).

- [ ] **Step 1: Generate placeholder textures trong `BootScene.create()`**

```ts
create(): void {
  const g = this.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(0xffffff, 1);
  g.fillCircle(16, 16, 16);
  g.generateTexture('player', 32, 32);
  g.clear();

  g.fillStyle(0x2ecc71, 1);
  g.fillRoundedRect(0, 0, 44, 24, 6);
  g.generateTexture('bike', 44, 24);
  g.clear();

  g.fillStyle(0x3498db, 1);
  g.fillRoundedRect(0, 0, 56, 30, 8);
  g.generateTexture('vf5', 56, 30);
  g.clear();

  g.destroy();
  this.scene.start('Game');
}
```

- [ ] **Step 2: Tạo stub `src/entities/Vehicle.ts` + `src/entities/stations/Station.ts`**

`src/entities/Vehicle.ts` (stub — model/label thêm ở Task 8):

```ts
import Phaser from 'phaser';
import type { VehicleType } from '../core/types';

export class Vehicle extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, type: VehicleType) {
    super(scene, x, y, type);
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }
}
```

`src/entities/stations/Station.ts`:

```ts
import Phaser from 'phaser';
import type { StationType } from '../../core/types';
import type { Vehicle } from '../Vehicle';

export class Station extends Phaser.GameObjects.Container {
  readonly stationType: StationType;
  occupant: Vehicle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: StationType, label: string, color: number) {
    super(scene, x, y);
    this.stationType = type;
    const rect = scene.add.rectangle(0, 0, 120, 90, color, 0.3).setStrokeStyle(2, color);
    const text = scene.add.text(0, -58, label, { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    this.add([rect, text]);
    scene.add.existing(this);
  }

  get anchor(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
```

- [ ] **Step 3: Tạo 4 subclass (rỗng, behavior ở task sau)**

`src/entities/stations/IntakeStation.ts`:

```ts
import Phaser from 'phaser';
import { Station } from './Station';

export class IntakeStation extends Station {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'intake', 'NHẬP XE', 0x2ecc71);
  }
}
```

`src/entities/stations/WashStation.ts`:

```ts
import Phaser from 'phaser';
import { Station } from './Station';

export class WashStation extends Station {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'wash', 'RỬA XE', 0x00bcd4);
  }
}
```

`src/entities/stations/ChargerStation.ts`:

```ts
import Phaser from 'phaser';
import { Station } from './Station';

export class ChargerStation extends Station {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'charger', 'SẠC V-GREEN', 0xf1c40f);
  }
}
```

`src/entities/stations/ExportStation.ts`:

```ts
import Phaser from 'phaser';
import { Station } from './Station';

export class ExportStation extends Station {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'export', 'XUẤT BẾN', 0xe74c3c);
  }
}
```

- [ ] **Step 4: GameScene — floor grid + stations từ LEVEL_1**

```ts
import Phaser from 'phaser';
import { LEVEL_1 } from '../data/levels';
import { Station } from '../entities/stations/Station';
import { IntakeStation } from '../entities/stations/IntakeStation';
import { WashStation } from '../entities/stations/WashStation';
import { ChargerStation } from '../entities/stations/ChargerStation';
import { ExportStation } from '../entities/stations/ExportStation';

export class GameScene extends Phaser.Scene {
  private stations: Station[] = [];

  constructor() {
    super('Game');
  }

  create(): void {
    this.buildFloor();
    this.buildStations();
  }

  private buildFloor(): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x2a2a4a, 1);
    for (let x = 0; x <= 1280; x += 80) g.lineBetween(x, 0, x, 720);
    for (let y = 0; y <= 720; y += 80) g.lineBetween(0, y, 1280, y);
  }

  private buildStations(): void {
    for (const def of LEVEL_1.stations) {
      let station: Station;
      switch (def.type) {
        case 'intake': station = new IntakeStation(this, def.x, def.y); break;
        case 'wash': station = new WashStation(this, def.x, def.y); break;
        case 'charger': station = new ChargerStation(this, def.x, def.y); break;
        case 'export': station = new ExportStation(this, def.x, def.y); break;
      }
      this.stations.push(station);
    }
  }
}
```

- [ ] **Step 5: Verify visually**

Run: `npm run dev`
Expected: thấy grid nền + 4 trạm có nhãn NHẬP XE / RỬA XE / SẠC V-GREEN / XUẤT BẾN.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: placeholder textures, floor grid, station base classes"
```

---

### Task 7: Player + VirtualJoystick + TouchButton + InputSystem + dash

**Files:**
- Create: `src/entities/Player.ts`, `src/ui/VirtualJoystick.ts`, `src/ui/TouchButton.ts`, `src/systems/InputSystem.ts`
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `CONFIG` từ `src/config.ts`.
- Produces: `interface InputState { move, actionDown, actionJustPressed, dashJustPressed }`; `class InputSystem` với `state`, `update()`; `class Player` với `carrying: Vehicle | null`, `update(input, dtSec)`; `class VirtualJoystick` với `vector`; `class TouchButton` với `isDown`.

- [ ] **Step 1: Tạo `src/ui/VirtualJoystick.ts`**

```ts
import Phaser from 'phaser';

export class VirtualJoystick {
  private knob: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;
  private center: Phaser.Math.Vector2;
  private radius: number;
  private vec = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number) {
    this.center = new Phaser.Math.Vector2(x, y);
    this.radius = radius;
    scene.add.circle(x, y, radius, 0xffffff, 0.15).setScrollFactor(0);
    this.knob = scene.add.circle(x, y, radius * 0.45, 0xffffff, 0.35).setScrollFactor(0);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.pointerId !== null || p.x > scene.scale.width / 2) return;
      this.pointerId = p.id;
      this.updateKnob(p);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      this.updateKnob(p);
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointerId) return;
      this.pointerId = null;
      this.knob.setPosition(this.center.x, this.center.y);
      this.vec.set(0, 0);
    });
  }

  get vector(): { x: number; y: number } {
    return { x: this.vec.x, y: this.vec.y };
  }

  private updateKnob(p: Phaser.Input.Pointer): void {
    const dx = p.x - this.center.x;
    const dy = p.y - this.center.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, this.radius);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    this.knob.setPosition(this.center.x + nx * clamped, this.center.y + ny * clamped);
    this.vec.set(nx * (clamped / this.radius), ny * (clamped / this.radius));
  }
}
```

- [ ] **Step 2: Tạo `src/ui/TouchButton.ts`**

```ts
import Phaser from 'phaser';

export class TouchButton {
  private circle: Phaser.GameObjects.Arc;
  private down = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, label: string) {
    this.circle = scene.add.circle(x, y, radius, 0xffffff, 0.2).setScrollFactor(0).setInteractive();
    scene.add.text(x, y, label, { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0);
    this.circle.on('pointerdown', () => {
      this.down = true;
      this.circle.setFillStyle(0xffffff, 0.45);
    });
    const release = () => {
      this.down = false;
      this.circle.setFillStyle(0xffffff, 0.2);
    };
    this.circle.on('pointerup', release);
    this.circle.on('pointerout', release);
  }

  get isDown(): boolean {
    return this.down;
  }
}
```

- [ ] **Step 3: Tạo `src/systems/InputSystem.ts`**

```ts
import Phaser from 'phaser';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { TouchButton } from '../ui/TouchButton';

export interface InputState {
  move: { x: number; y: number };
  actionDown: boolean;
  actionJustPressed: boolean;
  dashJustPressed: boolean;
}

export class InputSystem {
  private joystick: VirtualJoystick;
  private actionBtn: TouchButton;
  private dashBtn: TouchButton;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private prevAction = false;
  private prevDash = false;
  private current: InputState = {
    move: { x: 0, y: 0 },
    actionDown: false,
    actionJustPressed: false,
    dashJustPressed: false,
  };

  constructor(scene: Phaser.Scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.joystick = new VirtualJoystick(scene, 160, h - 160, 90);
    this.actionBtn = new TouchButton(scene, w - 120, h - 120, 56, 'A');
    this.dashBtn = new TouchButton(scene, w - 240, h - 200, 44, 'DASH');
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,SPACE,SHIFT,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(): void {
    const k = this.keys;
    let mx = 0;
    let my = 0;
    if (k.A.isDown || k.LEFT.isDown) mx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) mx += 1;
    if (k.W.isDown || k.UP.isDown) my -= 1;
    if (k.S.isDown || k.DOWN.isDown) my += 1;
    if (mx === 0 && my === 0) {
      const v = this.joystick.vector;
      mx = v.x;
      my = v.y;
    } else {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }

    const actionDown = this.actionBtn.isDown || k.SPACE.isDown;
    const dashDown = this.dashBtn.isDown || k.SHIFT.isDown;

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

- [ ] **Step 4: Tạo `src/entities/Player.ts`**

```ts
import Phaser from 'phaser';
import { CONFIG } from '../config';
import type { InputState } from '../systems/InputSystem';
import type { Vehicle } from './Vehicle';

export class Player extends Phaser.Physics.Arcade.Sprite {
  carrying: Vehicle | null = null;
  private facing = new Phaser.Math.Vector2(0, 1);
  private dashUntil = 0;
  private dashCooldownUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(16);
  }

  update(input: InputState, _dtSec: number): void {
    const now = this.scene.time.now;
    if (input.dashJustPressed && now >= this.dashCooldownUntil) {
      this.dashUntil = now + CONFIG.dashDurationMs;
      this.dashCooldownUntil = now + CONFIG.dashCooldownMs;
    }

    const speed = this.carrying ? CONFIG.playerSpeed * CONFIG.carrySpeedFactor : CONFIG.playerSpeed;
    if (now < this.dashUntil) {
      this.setVelocity(this.facing.x * CONFIG.dashSpeed, this.facing.y * CONFIG.dashSpeed);
    } else {
      this.setVelocity(input.move.x * speed, input.move.y * speed);
      if (input.move.x !== 0 || input.move.y !== 0) {
        this.facing.set(input.move.x, input.move.y).normalize();
      }
    }
  }
}
```

- [ ] **Step 5: Wire vào GameScene**

Thêm vào `GameScene`:

```ts
private player!: Player;
private inputSystem!: InputSystem;

// trong create():
this.player = new Player(this, 640, 400);
this.inputSystem = new InputSystem(this);

// thêm method update():
update(_time: number, delta: number): void {
  const dt = Math.min(delta / 1000, 0.1);
  this.inputSystem.update();
  this.player.update(this.inputSystem.state, dt);
}
```

- [ ] **Step 6: Verify multi-touch + dash**

Run: `npm run dev`
Expected: joystick trái di chuyển player; giữ joystick + bấm A/DASH cùng lúc vẫn nhận cả hai; trượt ngón ra ngoài joystick vẫn di chuyển theo; dash có cooldown 2s; WASD + Space/Shift hoạt động trên desktop.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: player movement, virtual joystick, touch buttons, dash"
```

---

### Task 8: Vehicle entity + carry/drop + interaction helper (TDD)

**Files:**
- Create: `src/core/interaction.ts`
- Test: `tests/interaction.test.ts`
- Modify: `src/entities/Vehicle.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `VehicleStateMachine` từ Task 3; `Station` từ Task 6; `Player` từ Task 7.
- Produces: `class Vehicle` (Sprite) với `model: VehicleStateMachine`, `label: Text`; `nearestWithin<T>(from, items, range): T | null`.

- [ ] **Step 1: Viết failing test `tests/interaction.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { nearestWithin } from '../src/core/interaction';

describe('nearestWithin', () => {
  it('returns nearest item within range', () => {
    const items = [{ x: 10, y: 0 }, { x: 50, y: 0 }];
    expect(nearestWithin({ x: 0, y: 0 }, items, 60)).toBe(items[0]);
  });

  it('returns null when nothing in range', () => {
    expect(nearestWithin({ x: 0, y: 0 }, [{ x: 100, y: 0 }], 60)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(nearestWithin({ x: 0, y: 0 }, [], 60)).toBeNull();
  });

  it('first item wins on tie', () => {
    const items = [{ x: 10, y: 0 }, { x: -10, y: 0 }];
    expect(nearestWithin({ x: 0, y: 0 }, items, 60)).toBe(items[0]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `npx vitest run tests/interaction.test.ts`
Expected: FAIL — "Cannot find module '../src/core/interaction'".

- [ ] **Step 3: Implement `src/core/interaction.ts`**

```ts
export interface Point {
  x: number;
  y: number;
}

export function nearestWithin<T extends Point>(from: Point, items: T[], range: number): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const item of items) {
    const d = Math.hypot(item.x - from.x, item.y - from.y);
    if (d <= range && d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `npx vitest run tests/interaction.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Tạo `src/entities/Vehicle.ts`**

```ts
import Phaser from 'phaser';
import { VehicleStateMachine } from '../core/VehicleStateMachine';
import type { VehicleType } from '../core/types';

export class Vehicle extends Phaser.Physics.Arcade.Sprite {
  readonly model: VehicleStateMachine;
  readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, type: VehicleType) {
    super(scene, x, y, type);
    this.model = new VehicleStateMachine(type);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.label = scene.add.text(x, y - 30, '', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
  }
}
```

- [ ] **Step 6: Wire carry/drop/place vào GameScene**

Thêm vào `GameScene`:

```ts
private vehicles: Vehicle[] = [];

// trong create(), sau buildStations():
this.vehicles = [];

// trong update(), sau player.update():
this.handleAction();
this.updateCarried();
this.updateVehicleLabels();

private handleAction(): void {
  const s = this.inputSystem.state;
  if (!s.actionJustPressed) return;
  const player = this.player;

  if (player.carrying) {
    const station = nearestWithin(
      player,
      this.stations.filter((st) => st.stationType !== 'intake'),
      CONFIG.interactionRange,
    );
    if (station) {
      this.placeVehicle(station, player.carrying);
    } else {
      this.dropVehicle();
    }
  } else {
    const vehicle = nearestWithin(
      player,
      this.vehicles.filter((v) => v.model.location === 'floor'),
      CONFIG.interactionRange,
    );
    if (vehicle) this.pickUpVehicle(vehicle);
  }
}

private pickUpVehicle(vehicle: Vehicle): void {
  this.player.carrying = vehicle;
  vehicle.model.location = 'carried';
  vehicle.setVelocity(0, 0);
}

private dropVehicle(): void {
  const vehicle = this.player.carrying;
  if (!vehicle) return;
  vehicle.model.location = 'floor';
  vehicle.setPosition(this.player.x, this.player.y + 30);
  this.player.carrying = null;
}

private placeVehicle(station: Station, vehicle: Vehicle): void {
  if (station.occupant) return;
  station.occupant = vehicle;
  vehicle.setPosition(station.anchor.x, station.anchor.y);
  vehicle.setVelocity(0, 0);
  this.player.carrying = null;
  if (station.stationType === 'wash') vehicle.model.location = 'wash';
  if (station.stationType === 'charger') vehicle.model.placeOnCharger();
  if (station.stationType === 'export') vehicle.model.location = 'export';
}

private updateCarried(): void {
  const v = this.player.carrying;
  if (v) v.setPosition(this.player.x, this.player.y - 40);
}

private updateVehicleLabels(): void {
  for (const v of this.vehicles) {
    v.label.setPosition(v.x, v.y - 30);
    v.label.setText(`Bẩn ${Math.round(v.model.dirt)}% | Pin ${Math.round(v.model.battery)}%`);
  }
}
```

Thêm import: `import { nearestWithin } from '../core/interaction';`, `import { Vehicle } from '../entities/Vehicle';`, `import { CONFIG } from '../config';`.

- [ ] **Step 7: Verify carry/drop/place**

Run: `npm run dev`
Expected: chưa có xe để test — tạm thời thêm 1 xe test trong `create()`: `this.vehicles.push(new Vehicle(this, 640, 500, 'bike'));` → bấm A gần xe để bưng, bấm A lần nữa để đặt xuống/đặt vào trạm; đứng giữa xe và trạm → ưu tiên trạm khi đang bưng xe.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: vehicle entity, carry/drop/place, nearest-target interaction"
```

---

### Task 9: WashStation — giữ nút để cọ

**Files:**
- Modify: `src/entities/stations/WashStation.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `Station` từ Task 6; `VehicleStateMachine.scrub` từ Task 3; `InputState.actionDown` từ Task 7.
- Produces: `WashStation.scrub(dtSec)`.

- [ ] **Step 1: Thêm behavior vào `WashStation`**

```ts
scrub(dtSec: number): void {
  if (this.occupant) this.occupant.model.scrub(dtSec);
}
```

- [ ] **Step 2: Wire vào GameScene**

Thêm vào `update()` sau `handleAction()`:

```ts
this.updateWash(dt);

private updateWash(dt: number): void {
  const s = this.inputSystem.state;
  if (!s.actionDown || this.player.carrying) return;
  const wash = this.stations.find((st) => st.stationType === 'wash') as WashStation | undefined;
  if (!wash || !wash.occupant) return;
  if (nearestWithin(this.player, [wash], CONFIG.interactionRange) !== wash) return;
  wash.scrub(dt);
}
```

Thêm import `WashStation`.

- [ ] **Step 3: Verify wash**

Run: `npm run dev`
Expected: đặt xe vào RỬA XE → đứng gần giữ A → label "Bẩn" giảm dần về 0% trong ~3s; nhả nút → dừng; bỏ đi → dừng.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wash station hold-to-scrub"
```

---

### Task 10: ChargerStation — auto sạc + quá sạc phạt điểm

**Files:**
- Modify: `src/entities/stations/ChargerStation.ts`, `src/entities/Vehicle.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `VehicleStateMachine.update/placeOnCharger/isOvercharged` từ Task 3; `ScoreSystem.addPenalty` từ Task 5.
- Produces: `ChargerStation.update(dtSec)`; `Vehicle.notifiedFull: boolean`.

- [ ] **Step 1: Thêm behavior vào `ChargerStation`**

```ts
update(dtSec: number): void {
  if (this.occupant) this.occupant.model.update(dtSec);
}
```

- [ ] **Step 2: Thêm `notifiedFull` vào `Vehicle`**

```ts
notifiedFull = false;
```

- [ ] **Step 3: Wire vào GameScene**

Thêm `private score = new ScoreSystem();` vào GameScene. Thêm vào `update()` sau `updateWash(dt)`:

```ts
this.updateChargers(dt);

private updateChargers(dt: number): void {
  for (const st of this.stations) {
    if (st.stationType !== 'charger') continue;
    const charger = st as ChargerStation;
    charger.update(dt);
    const v = charger.occupant;
    if (!v) {
      charger.setAlpha(1);
      continue;
    }
    if (v.model.battery >= 100 && !v.notifiedFull) {
      v.notifiedFull = true;
      this.flashStation(charger, 0xffffff);
    }
    if (v.model.isOvercharged) {
      this.score.addPenalty(CONFIG.overchargePenaltyPerSec, dt);
      charger.setAlpha(0.6 + 0.4 * Math.sin(this.time.now / 100));
    } else {
      charger.setAlpha(1);
    }
  }
}

private flashStation(station: Station, color: number): void {
  const rect = station.getAt(0) as Phaser.GameObjects.Rectangle;
  const original = rect.fillColor;
  rect.setFillStyle(color, 0.6);
  this.time.delayedCall(200, () => rect.setFillStyle(original, 0.3));
}
```

Thêm import `ChargerStation`, `ScoreSystem`.

- [ ] **Step 4: Verify charge + overcharge**

Run: `npm run dev`
Expected: đặt xe vào SẠC V-GREEN → pin tự tăng 0→100% trong ~8s; đạt 100% → trạm flash trắng; để quá 3s → trạm nhấp nháy đỏ, điểm trừ liên tục; nhấc xe ra → dừng phạt.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: charger auto-charge, overcharge grace and penalty"
```

---

### Task 11: IntakeStation + ExportStation + order flow

**Files:**
- Modify: `src/entities/stations/IntakeStation.ts`, `src/entities/stations/ExportStation.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `OrderSystem` từ Task 4; `ScoreSystem` từ Task 5; `VEHICLES` từ Task 2; `bus` từ Task 2.
- Produces: `IntakeStation.canSpawn(now)`, `markSpawned(now)`; order flow hoàn chỉnh; events `orders:changed`, `score:changed`.

- [ ] **Step 1: Thêm behavior vào `IntakeStation`**

```ts
private cooldownUntil = 0;

canSpawn(now: number): boolean {
  return now >= this.cooldownUntil && !this.occupant;
}

markSpawned(now: number): void {
  this.cooldownUntil = now + CONFIG.intakeCooldownMs;
}
```

Thêm import `CONFIG`.

- [ ] **Step 2: Wire Intake buttons + spawn vào GameScene**

Thêm `private orderSystem = new OrderSystem({ maxOrders: CONFIG.maxOrders, patienceRange: CONFIG.patienceRange });` và trong `create()`:

```ts
this.orderSystem.fill();
this.buildIntakeButtons();
bus.emit('orders:changed', this.orderSystem.orders);

private buildIntakeButtons(): void {
  const intake = this.stations.find((st) => st.stationType === 'intake')!;
  const mk = (dx: number, type: VehicleType, label: string) => {
    const btn = this.add
      .text(intake.x + dx, intake.y + 70, label, { fontSize: '16px', color: '#ffffff', backgroundColor: '#2ecc71' })
      .setOrigin(0.5)
      .setPadding(8, 4, 8, 4)
      .setInteractive();
    btn.on('pointerdown', () => this.spawnVehicle(type));
  };
  mk(-40, 'bike', 'BIKE');
  mk(40, 'vf5', 'VF 5');
}

private spawnVehicle(type: VehicleType): void {
  const intake = this.stations.find((st) => st.stationType === 'intake')!;
  if (!intake.canSpawn(this.time.now)) return;
  const v = new Vehicle(this, intake.anchor.x, intake.anchor.y, type);
  this.vehicles.push(v);
  intake.occupant = v;
  intake.markSpawned(this.time.now);
}
```

- [ ] **Step 3: Wire Export + fulfill vào GameScene**

Trong `placeVehicle()`, thay nhánh export:

```ts
if (station.stationType === 'export') {
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
  vehicle.label.destroy();
  vehicle.destroy();
  this.vehicles = this.vehicles.filter((v) => v !== vehicle);
  this.orderSystem.fill();
  bus.emit('orders:changed', this.orderSystem.orders);
  bus.emit('score:changed', this.score.score);
  this.flashStation(station, 0x00ff00);
}
```

- [ ] **Step 4: Order tick trong update**

Thêm vào `update()`:

```ts
this.updateOrders(dt);

private updateOrders(dt: number): void {
  this.orderSystem.update(dt);
  this.orderSystem.fill();
  bus.emit('orders:changed', this.orderSystem.orders);
}
```

- [ ] **Step 5: Verify full loop**

Run: `npm run dev`
Expected: bấm BIKE/VF 5 ở NHẬP XE → xe spawn (cooldown 2s); bưng xe → rửa → sạc → xuất bến đúng loại đơn → điểm tăng, xe biến mất, đơn mới spawn; xuất sai (chưa sạch/chưa đầy pin/sai loại) → trạm flash đỏ, xe vẫn ở đó.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: intake spawn, export fulfillment, order flow"
```

---

### Task 12: UIScene — HUD + game over + restart

**Files:**
- Modify: `src/scenes/UIScene.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `bus` events `orders:changed`, `score:changed`, `timer:changed`, `game:over`; `Order` từ Task 4; `VEHICLES` từ Task 2.
- Produces: HUD hoàn chỉnh; restart flow.

- [ ] **Step 1: Implement `UIScene`**

```ts
import Phaser from 'phaser';
import { bus } from '../systems/EventBus';
import { VEHICLES } from '../data/vehicles';
import type { Order } from '../core/OrderSystem';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private orderTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('UI');
  }

  create(): void {
    this.scoreText = this.add.text(1260, 20, 'Điểm: 0', { fontSize: '24px', color: '#ffffff' }).setOrigin(1, 0);
    this.timerText = this.add.text(640, 20, '120', { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5, 0);

    bus.on('score:changed', this.onScore, this);
    bus.on('timer:changed', this.onTimer, this);
    bus.on('orders:changed', this.onOrders, this);
    bus.on('game:over', this.onGameOver, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off('score:changed', this.onScore, this);
      bus.off('timer:changed', this.onTimer, this);
      bus.off('orders:changed', this.onOrders, this);
      bus.off('game:over', this.onGameOver, this);
    });
  }

  private onScore(score: number): void {
    this.scoreText.setText(`Điểm: ${Math.round(score)}`);
  }

  private onTimer(t: number): void {
    this.timerText.setText(`${Math.ceil(t)}`);
  }

  private onOrders(orders: readonly Order[]): void {
    while (this.orderTexts.length < orders.length) {
      this.orderTexts.push(this.add.text(20, 20 + this.orderTexts.length * 36, '', { fontSize: '18px', color: '#ffffff' }));
    }
    while (this.orderTexts.length > orders.length) {
      this.orderTexts.pop()!.destroy();
    }
    orders.forEach((o, i) => {
      this.orderTexts[i].setText(`${VEHICLES[o.vehicleType].label} — ${Math.ceil(o.patience)}s`);
    });
  }

  private onGameOver(score: number): void {
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7);
    this.add.text(640, 300, 'HẾT GIỜ!', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(640, 370, `Điểm: ${Math.round(score)}`, { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    const btn = this.add
      .text(640, 460, 'CHƠI LẠI', { fontSize: '28px', color: '#ffffff', backgroundColor: '#0b5cff' })
      .setOrigin(0.5)
      .setPadding(16, 8, 16, 8)
      .setInteractive();
    btn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.start('Game');
    });
  }
}
```

- [ ] **Step 2: Wire timer + game over vào GameScene**

Thêm `private timeLeft = CONFIG.levelDurationSec;` và `private gameOver = false;`. Trong `create()`: `this.scene.launch('UI');`. Thêm vào `update()` đầu tiên:

```ts
if (this.gameOver) return;
```

Thêm cuối `update()`:

```ts
this.updateTimer(dt);

private updateTimer(dt: number): void {
  this.timeLeft -= dt;
  bus.emit('timer:changed', Math.max(0, this.timeLeft));
  if (this.timeLeft <= 0) {
    this.gameOver = true;
    this.physics.pause();
    bus.emit('game:over', this.score.score);
  }
}
```

Thêm import `bus`.

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
- Sau đó mới sang GĐ 2 (phụ kiện, combo, chaos, map mới) — xem design doc

