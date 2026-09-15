// Visual documentation export for GymMice. Read-only against the running
// Expo web dev server — does not modify app code, UI, or functionality.
//
// Usage: node scripts/src/gymmice-screenshots.mjs
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'http://localhost:18115';
const OUT_DIR = path.resolve('artifacts/screenshots');
const VIEWPORT = { width: 402, height: 874 };
const CLICK_TIMEOUT = 3000;

const HIDE_CHROME_CSS = `
  * { caret-color: transparent !important; }
  ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
  html, body { scrollbar-width: none !important; }
`;

const captured = [];
const skipped = [];
let n = 1;
const num = () => String(n++).padStart(2, '0');

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function settle(page, ms = 800) {
  await page.waitForTimeout(ms);
}

async function shoot(page, filename, notes) {
  const filePath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filePath, timeout: 10000 });
  console.log(`  -> ${filename}${notes ? '  (' + notes + ')' : ''}`);
  captured.push({ filename, filePath, label: notes || filename.replace(/\.png$/, '') });
}

async function safeClickText(page, text, exact = true) {
  try {
    await page.getByText(text, { exact }).first().click({ timeout: CLICK_TIMEOUT });
    return true;
  } catch (e) {
    skipped.push(`click "${text}" failed: ${e.message.split('\n')[0]}`);
    return false;
  }
}

async function safeClickPoint(page, x, y, label) {
  try {
    await page.mouse.click(x, y);
    return true;
  } catch (e) {
    skipped.push(`click point for "${label}" failed: ${e.message.split('\n')[0]}`);
    return false;
  }
}

async function goto(page, p) {
  await page.goto(`${BASE_URL}${p}`, { waitUntil: 'load', timeout: 20000 });
  await page.addStyleTag({ content: HIDE_CHROME_CSS }).catch(() => {});
}

async function setDarkMode(page, on) {
  await goto(page, '/(tabs)/profile');
  await settle(page, 700);
  try {
    const toggle = page.getByRole('switch').last();
    await toggle.waitFor({ state: 'visible', timeout: 8000 });
    const checked = await toggle.getAttribute('aria-checked');
    const currentlyOn = checked === 'true';
    if (currentlyOn !== on) {
      await toggle.click({ timeout: CLICK_TIMEOUT });
      await settle(page, 400);
    }
  } catch (e) {
    skipped.push(`dark mode toggle (${on ? 'ON' : 'OFF'}) failed: ${e.message.split('\n')[0]}`);
  }
}

async function step(fn, label) {
  try {
    await fn();
  } catch (e) {
    skipped.push(`${label}: ${e.message.split('\n')[0]}`);
    console.log(`  !! skipped: ${label} (${e.message.split('\n')[0]})`);
  }
}

async function run() {
  await ensureDir(OUT_DIR);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.addStyleTag({ content: HIDE_CHROME_CSS }).catch(() => {});

  try {
    console.log('Pass 1/2: LIGHT MODE');
    await step(() => setDarkMode(page, false), 'ensure light mode');

    await step(async () => {
      await goto(page, '/');
      await settle(page, 1200);
      await shoot(page, `${num()}-splash-light.png`, 'Splash');
    }, 'splash light');

    await step(async () => {
      await goto(page, '/signin');
      await settle(page);
      await shoot(page, `${num()}-signin-light.png`, 'Sign In');
    }, 'signin light');

    await step(async () => {
      await goto(page, '/signup');
      await settle(page);
      await shoot(page, `${num()}-signup-light.png`, 'Sign Up');
    }, 'signup light');

    await step(async () => {
      await goto(page, '/onboarding');
      await settle(page);
      await shoot(page, `${num()}-onboarding-step1-light.png`, 'Onboarding - Step 1');
    }, 'onboarding step1 light');

    for (const stepIdx of [2, 3, 4, 5]) {
      await step(async () => {
        // Every step's own CTA reads "Continue" until you're actually on the
        // last step; "Let's go" only appears on step 5 itself (finishing, not
        // reached here since step 5 IS the palette picker we want to shoot).
        await safeClickText(page, 'Continue', true);
        await settle(page, 500);
        await shoot(page, `${num()}-onboarding-step${stepIdx}-light.png`, `Onboarding - Step ${stepIdx}`);
      }, `onboarding step${stepIdx} light`);
    }

    await step(async () => {
      await goto(page, '/(tabs)');
      await settle(page, 1200);
      await shoot(page, `${num()}-home-light.png`, 'Home');
    }, 'home light');

    await step(async () => {
      await goto(page, '/(tabs)/social');
      await settle(page);
      await shoot(page, `${num()}-social-light.png`, 'Social Feed');
    }, 'social light');

    await step(async () => {
      // FAB is the bottom-right floating "+" button.
      await safeClickPoint(page, VIEWPORT.width - 40, VIEWPORT.height - 195, 'social FAB');
      await settle(page, 500);
      await shoot(page, `${num()}-social-create-post-light.png`, 'Social - Create Post modal');
    }, 'social create post light');

    await step(async () => {
      await goto(page, '/(tabs)/profile');
      await settle(page);
      await shoot(page, `${num()}-profile-light.png`, 'Profile');
    }, 'profile light');

    await step(async () => {
      await safeClickText(page, 'Color palette', true);
      await settle(page, 400);
      await shoot(page, `${num()}-profile-palette-light.png`, 'Profile - Color Palette');
    }, 'profile palette light');

    await step(async () => {
      await goto(page, '/schedule');
      await settle(page, 900);
      await shoot(page, `${num()}-schedule-week-light.png`, 'Schedule - Week');
    }, 'schedule week light');

    await step(async () => {
      await safeClickText(page, 'Month', true);
      await settle(page, 500);
      await shoot(page, `${num()}-schedule-month-light.png`, 'Schedule - Month');
    }, 'schedule month light');

    await step(async () => {
      await goto(page, '/analytics');
      await settle(page, 900);
      await shoot(page, `${num()}-analytics-push-light.png`, 'Analytics - Push');
    }, 'analytics push light');

    await step(async () => {
      await safeClickText(page, 'Pull', true);
      await settle(page, 400);
      await shoot(page, `${num()}-analytics-pull-light.png`, 'Analytics - Pull');
    }, 'analytics pull light');

    await step(async () => {
      await safeClickText(page, 'Legs', true);
      await settle(page, 400);
      await shoot(page, `${num()}-analytics-legs-light.png`, 'Analytics - Legs');
    }, 'analytics legs light');

    await step(async () => {
      await goto(page, '/nutrition');
      await settle(page, 900);
      await shoot(page, `${num()}-nutrition-light.png`, 'Nutrition');
    }, 'nutrition light');

    await step(async () => {
      await goto(page, '/shop');
      await settle(page, 900);
      await shoot(page, `${num()}-shop-light.png`, 'Shop');
    }, 'shop light');

    await step(async () => {
      await goto(page, '/pumpmatch');
      await settle(page, 1200);
      await shoot(page, `${num()}-pumpmatch-collapsed-light.png`, 'Pump Match - Collapsed');
    }, 'pumpmatch collapsed light');

    await step(async () => {
      // Info button is the middle circular control in the bottom action row.
      await safeClickPoint(page, VIEWPORT.width / 2, VIEWPORT.height - 52, 'pumpmatch info button');
      await settle(page, 600);
      await shoot(page, `${num()}-pumpmatch-expanded-light.png`, 'Pump Match - Expanded');
    }, 'pumpmatch expanded light');

    await step(async () => {
      await goto(page, '/dms');
      await settle(page, 900);
      await shoot(page, `${num()}-dms-light.png`, 'Direct Messages');
    }, 'dms light');

    await step(async () => {
      // Tap the first conversation row to open a real chat[name] route.
      await safeClickPoint(page, VIEWPORT.width / 2, 200, 'first DM conversation');
      await settle(page, 700);
      await shoot(page, `${num()}-chat-light.png`, 'Chat');
    }, 'chat light');

    console.log('\nPass 2/2: DARK MODE');
    await step(() => setDarkMode(page, true), 'enable dark mode');

    const darkSimple = [
      ['/', 1200, 'splash', 'Splash'],
      ['/signin', 900, 'signin', 'Sign In'],
      ['/signup', 900, 'signup', 'Sign Up'],
      ['/onboarding', 900, 'onboarding-step1', 'Onboarding - Step 1'],
      ['/(tabs)', 1200, 'home', 'Home'],
      ['/(tabs)/social', 900, 'social', 'Social Feed'],
      ['/(tabs)/profile', 900, 'profile', 'Profile'],
    ];
    for (const [route, wait, label, title] of darkSimple) {
      await step(async () => {
        await goto(page, route);
        await settle(page, wait);
        await shoot(page, `${num()}-${label}-dark.png`, `${title} (dark)`);
      }, `${label} dark`);
    }

    await step(async () => {
      await goto(page, '/schedule');
      await settle(page, 900);
      await shoot(page, `${num()}-schedule-week-dark.png`, 'Schedule - Week (dark)');
    }, 'schedule week dark');
    await step(async () => {
      await safeClickText(page, 'Month', true);
      await settle(page, 500);
      await shoot(page, `${num()}-schedule-month-dark.png`, 'Schedule - Month (dark)');
    }, 'schedule month dark');

    await step(async () => {
      await goto(page, '/analytics');
      await settle(page, 900);
      await shoot(page, `${num()}-analytics-push-dark.png`, 'Analytics - Push (dark)');
    }, 'analytics push dark');
    await step(async () => {
      await safeClickText(page, 'Pull', true);
      await settle(page, 400);
      await shoot(page, `${num()}-analytics-pull-dark.png`, 'Analytics - Pull (dark)');
    }, 'analytics pull dark');
    await step(async () => {
      await safeClickText(page, 'Legs', true);
      await settle(page, 400);
      await shoot(page, `${num()}-analytics-legs-dark.png`, 'Analytics - Legs (dark)');
    }, 'analytics legs dark');

    await step(async () => {
      await goto(page, '/nutrition');
      await settle(page, 900);
      await shoot(page, `${num()}-nutrition-dark.png`, 'Nutrition (dark)');
    }, 'nutrition dark');

    await step(async () => {
      await goto(page, '/shop');
      await settle(page, 900);
      await shoot(page, `${num()}-shop-dark.png`, 'Shop (dark)');
    }, 'shop dark');

    await step(async () => {
      await goto(page, '/pumpmatch');
      await settle(page, 1200);
      await shoot(page, `${num()}-pumpmatch-collapsed-dark.png`, 'Pump Match - Collapsed (dark)');
    }, 'pumpmatch collapsed dark');
    await step(async () => {
      await safeClickPoint(page, VIEWPORT.width / 2, VIEWPORT.height - 52, 'pumpmatch info button (dark)');
      await settle(page, 600);
      await shoot(page, `${num()}-pumpmatch-expanded-dark.png`, 'Pump Match - Expanded (dark)');
    }, 'pumpmatch expanded dark');

    await step(async () => {
      await goto(page, '/dms');
      await settle(page, 900);
      await shoot(page, `${num()}-dms-dark.png`, 'Direct Messages (dark)');
    }, 'dms dark');
    await step(async () => {
      await safeClickPoint(page, VIEWPORT.width / 2, 200, 'first DM conversation (dark)');
      await settle(page, 700);
      await shoot(page, `${num()}-chat-dark.png`, 'Chat (dark)');
    }, 'chat dark');
  } finally {
    await browser.close().catch(() => {});
  }

  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({ captured, skipped }, null, 2));
  console.log(`\nCaptured ${captured.length} screenshots, ${skipped.length} skipped -> ${OUT_DIR}`);
  console.log('DONE');
}

run().catch((e) => {
  console.error('FATAL', e);
  process.exitCode = 1;
});
