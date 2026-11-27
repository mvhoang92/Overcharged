import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:5199/';
const OUT = '/tmp/opencode/shots';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/01-initial.png` });

const log = (label, value) => console.log(`${label}: ${JSON.stringify(value)}`);

// --- 1. Spawn bike ---
await page.locator('#ui button', { hasText: 'BIKE' }).click();
await page.waitForTimeout(300);
log('VEHICLES', await page.evaluate(() => window.game.vehicles.length));

// --- 2. Pick up bike ---
await page.evaluate(() => {
  const g = window.game;
  const v = g.vehicles[0];
  g.player.mesh.position.set(v.position.x, 0.8, v.position.z);
});
await page.keyboard.press('Space');
await page.waitForTimeout(200);
log('CARRYING', await page.evaluate(() => window.game.player.carrying?.constructor.name));

// --- 3. Place on wash ---
await page.evaluate(() => {
  const g = window.game;
  const wash = g.stations.find((s) => s.type === 'wash');
  g.player.mesh.position.set(wash.position.x, 0.8, wash.position.z);
});
await page.keyboard.press('Space');
await page.waitForTimeout(200);
log('WASH_OCCUPANT', await page.evaluate(() => {
  const wash = window.game.stations.find((s) => s.type === 'wash');
  return wash.occupant ? wash.occupant.model.location : null;
}));

// --- 4. Scrub 10 taps ---
for (let i = 0; i < 10; i++) {
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(60);
}
log('DIRT_AFTER_SCRUB', await page.evaluate(() => window.game.vehicles[0].model.dirt));
await page.screenshot({ path: `${OUT}/02-washed.png` });

// --- 5. Pick up + place on charger ---
await page.keyboard.press('Space');
await page.evaluate(() => {
  const g = window.game;
  const charger = g.stations.find((s) => s.type === 'charger');
  g.player.mesh.position.set(charger.position.x, 0.8, charger.position.z);
});
await page.keyboard.press('Space');
await page.waitForTimeout(200);

// --- 6. Wait for charge ---
await page.waitForTimeout(8500);
log('BATTERY', await page.evaluate(() => window.game.vehicles[0].model.battery));
await page.screenshot({ path: `${OUT}/03-charged.png` });

// --- 7. Find matching entity on conveyor ---
let entityPos = null;
for (let attempt = 0; attempt < 20 && !entityPos; attempt++) {
  entityPos = await page.evaluate(() => {
    const g = window.game;
    const v = g.vehicles[0];
    const req = v.model.type === 'bike' ? 'bike' : 'car';
    const item = g.conveyorItems.find((i) => i.data.vehicleReq === req && i !== g.player.carrying);
    return item ? { x: item.position.x, z: item.position.z, kind: item.data.kind, tier: item.data.tier } : null;
  });
  if (!entityPos) await page.waitForTimeout(1000);
}
log('ENTITY_FOUND', entityPos);

// --- 8. Pick up entity ---
await page.evaluate((pos) => {
  window.game.player.mesh.position.set(pos.x, 0.8, pos.z);
}, entityPos);
await page.keyboard.press('Space');
await page.waitForTimeout(200);
log('CARRYING_ENTITY', await page.evaluate(() => window.game.player.carrying?.constructor.name));

// --- 9. Stand 3m left of vehicle, face right, throw ---
await page.evaluate(() => {
  const g = window.game;
  const v = g.vehicles[0];
  g.player.mesh.position.set(v.position.x - 3, 0.8, v.position.z);
});
await page.keyboard.down('KeyD');
await page.waitForTimeout(80);
await page.keyboard.up('KeyD');
await page.keyboard.press('KeyE');
await page.waitForTimeout(600);
log('LOADED', await page.evaluate(() => window.game.vehicles[0]?.model.loadedWith ?? null));
await page.screenshot({ path: `${OUT}/04-thrown-loaded.png` });

// --- 10. Pick up vehicle, place at export ---
await page.evaluate(() => {
  const g = window.game;
  const v = g.vehicles[0];
  g.player.mesh.position.set(v.position.x, 0.8, v.position.z);
});
await page.keyboard.press('Space');
await page.evaluate(() => {
  const g = window.game;
  const exp = g.stations.find((s) => s.type === 'export');
  g.player.mesh.position.set(exp.position.x, 0.8, exp.position.z);
});
await page.keyboard.press('Space');
await page.waitForTimeout(400);
log('SCORE', await page.evaluate(() => window.game.score.score));
log('COMBO', await page.evaluate(() => window.game.combo.streak));
await page.screenshot({ path: `${OUT}/05-exported.png` });

// --- 11. HUD check ---
log('HUD_TEXT', await page.evaluate(() => document.getElementById('ui')?.innerText?.replace(/\n/g, ' | ')));

log('ERRORS', errors.length ? errors : 'none');
await browser.close();
