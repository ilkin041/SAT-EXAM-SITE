/**
 * Photographs four real screens for the landing page's `ScreenshotTabs` (T3.5).
 *
 *   npm run dev                          # or `npm run build && npm start`
 *   npm run db:seed-screenshot-fixture
 *   npm run gen:screenshots
 *
 * Writes `src/assets/screenshots/*.webp` at 2× — 1440×900 CSS pixels, device scale
 * factor 2, so 2880×1800 of actual pixels. All four are the same size on
 * purpose: `ScreenshotTabs` puts them in one fixed-ratio frame and identical
 * intrinsic dimensions are what makes switching tabs shift nothing.
 *
 * Why this is hand-rolled CDP instead of Playwright: the repo has no browser
 * automation dependency and this is the only thing that would need one. Node
 * has had a global `WebSocket` since 22, Chrome speaks the DevTools protocol
 * over one, and `Page.captureScreenshot` encodes WebP directly — so the whole
 * pipeline is a few hundred lines and zero new packages. If Playwright arrives
 * for the Phase 7 test-interface coverage, this is a fine thing to port onto it.
 *
 * Two details worth keeping:
 *
 *  - **Reduced motion is emulated**, which is not about accessibility here: the
 *    global `prefers-reduced-motion` block collapses every intro animation to
 *    its final frame, so a capture cannot catch a card at opacity 0.3. Light
 *    scheme is forced for the same reason — a screenshot has one theme and the
 *    landing page's frame is built around the light one.
 *  - **The student and the admin get separate browser contexts.** One profile
 *    means one cookie jar, and logging in twice would just replace the session.
 *
 * Configuration, all optional:
 *   SCREENSHOT_BASE_URL   default http://localhost:3000
 *   SCREENSHOT_ADMIN_EMAIL / SCREENSHOT_ADMIN_PASSWORD
 *                         default admin@example.com / admin123 (prisma/seed.ts)
 *   CHROME_PATH           an explicit Chrome/Edge binary
 *   SCREENSHOT_QUALITY    WebP quality, default 86
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// ---------- Configuration ----------

const BASE_URL = (process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const ADMIN_EMAIL = process.env.SCREENSHOT_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SCREENSHOT_ADMIN_PASSWORD ?? "admin123";
const STUDENT_EMAIL = "jordan.avery@example.com";
const STUDENT_PASSWORD = "screenshots123";
const QUALITY = Number(process.env.SCREENSHOT_QUALITY ?? 86);

/** Must match `SCREENSHOT_WIDTH` / `SCREENSHOT_HEIGHT` in `screenshot-tabs.tsx`. */
const VIEWPORT = { width: 1440, height: 900, scale: 2 };

/**
 * `src/assets/`, not `public/`: the component imports these statically, which
 * is what gives it intrinsic dimensions and a blur placeholder for free. A copy
 * under `public/` would also be served raw at its own URL — the same bytes
 * shipped twice, one of them unoptimised.
 */
const OUT_DIR = resolve(process.cwd(), "src/assets/screenshots");

/** Fixed ids from `seed-screenshot-fixture.ts`. */
const LIVE_ATTEMPT_ID = "screens-attempt-live";
const REVIEW_ATTEMPT_ID = "screens-attempt-review";
const REPORT_ATTEMPT_ID = "screens-attempt-report";
const EDITOR_QUESTION_ID = "demo-math-linear-equation";

/** One preparation step, run in order between navigation and the shutter. */
type Step =
  | { click: string }
  /** Clicks the first button whose visible text matches exactly. */
  | { clickText: string }
  | { sleep: number }
  | { scrollTo: number };

interface Shot {
  file: string;
  as: "student" | "admin";
  path: string;
  steps?: Step[];
  /**
   * Must be on the page when the shutter opens. Checked **last**, after every
   * step, because "it was there a second ago" is not the claim — the highlight
   * in particular is applied by an effect and a later re-render takes it away.
   */
  waitFor: string;
}

const SHOTS: Shot[] = [
  {
    // The differentiator shot: the passage highlight and the struck-through
    // choice, both seeded, plus the eliminator circles which need the ABC
    // toggle switched on.
    //
    // The choreography is not decoration. `ResumingSplash` covers the whole
    // screen for the first second of a resumed attempt, so nothing before
    // 1.4s is photographable. And `AnnotatedPassage` draws its highlight in an
    // effect when the annotation fetch resolves, after which a re-render of
    // the passage strips the wrapper out again — a defect in the test
    // interface, reported rather than papered over here. So: let the splash
    // clear, toggle the eliminator, step forward and back to remount the
    // passage, and shoot the moment the highlight reappears.
    file: "test-interface.webp",
    as: "student",
    path: `/test/attempt/${LIVE_ATTEMPT_ID}`,
    steps: [
      { sleep: 1500 },
      { click: '[title="Toggle answer eliminator"]' },
      { clickText: "Next" },
      { sleep: 400 },
      { clickText: "Back" },
    ],
    waitFor: "[data-annotation-id]",
  },
  {
    file: "score-report.webp",
    as: "student",
    path: `/results/${REPORT_ATTEMPT_ID}`,
    steps: [{ sleep: 700 }],
    waitFor: '[role="img"]',
  },
  {
    file: "answer-review.webp",
    as: "student",
    path: `/results/${REVIEW_ATTEMPT_ID}/review`,
    steps: [{ sleep: 700 }],
    waitFor: "main",
  },
  {
    file: "for-tutors.webp",
    as: "admin",
    path: `/admin/questions/${EDITOR_QUESTION_ID}`,
    steps: [{ sleep: 900 }],
    waitFor: "form",
  },
];

// ---------- Minimal CDP client ----------

type Json = Record<string, unknown>;

class Cdp {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (v: Json) => void; reject: (e: Error) => void }
  >();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(String(event.data)) as {
        id?: number;
        result?: Json;
        error?: { message: string };
      };
      if (typeof msg.id !== "number") return; // an event; nothing here waits on one
      const waiter = this.pending.get(msg.id);
      if (!waiter) return;
      this.pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(msg.error.message));
      else waiter.resolve(msg.result ?? {});
    };
  }

  static async connect(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise<void>((res, rej) => {
      ws.onopen = () => res();
      ws.onerror = () => rej(new Error(`Could not open a DevTools socket at ${url}`));
    });
    return new Cdp(ws);
  }

  send(method: string, params: Json = {}, sessionId?: string): Promise<Json> {
    const id = this.nextId++;
    const payload: Json = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 60_000);
    });
  }

  close() {
    this.ws.close();
  }
}

// ---------- Chrome ----------

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

function findChrome(): string {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome or Edge binary found. Set CHROME_PATH to one.\nLooked in:\n  " +
        CHROME_CANDIDATES.join("\n  "),
    );
  }
  return found;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function launchChrome(port: number, profileDir: string): Promise<ChildProcess> {
  const child = spawn(
    findChrome(),
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      // Chrome 111+ rejects a DevTools socket carrying an Origin it was not
      // told to allow. Node's WebSocket sends none, but the flag costs nothing
      // and turns a silent handshake failure into a working connection.
      "--remote-allow-origins=*",
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--font-render-hinting=none",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  // Poll the HTTP endpoint rather than guessing at a startup delay.
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return child;
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  child.kill();
  throw new Error("Chrome did not open a DevTools port within 20s.");
}

// ---------- Page helpers ----------

class Page {
  constructor(
    private cdp: Cdp,
    private sessionId: string,
  ) {}

  private send(method: string, params: Json = {}) {
    return this.cdp.send(method, params, this.sessionId);
  }

  async prepare() {
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Emulation.setDeviceMetricsOverride", {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: VIEWPORT.scale,
      mobile: false,
    });
    // Light theme and settled animations — see the header note.
    await this.send("Emulation.setEmulatedMedia", {
      media: "screen",
      features: [
        { name: "prefers-color-scheme", value: "light" },
        { name: "prefers-reduced-motion", value: "reduce" },
      ],
    });
  }

  async goto(path: string) {
    await this.send("Page.navigate", { url: `${BASE_URL}${path}` });
    // `Page.loadEventFired` would need an event subscription; polling
    // readyState is shorter and just as reliable for a settled capture.
    await this.waitForExpression("document.readyState === 'complete'", 30_000, path);
  }

  async evaluate<T>(expression: string): Promise<T> {
    const res = (await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })) as { result?: { value?: T }; exceptionDetails?: { text?: string } };
    if (res.exceptionDetails) {
      throw new Error(`Evaluate failed: ${res.exceptionDetails.text ?? "unknown"}`);
    }
    return res.result?.value as T;
  }

  async waitForExpression(expression: string, timeoutMs: number, label: string) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.evaluate<boolean>(`!!(${expression})`)) return;
      // Tight, because one of the things this waits for is on screen only
      // briefly — see the note on the test-interface shot.
      await sleep(60);
    }
    throw new Error(`Timed out waiting for \`${expression}\` (${label})`);
  }

  waitFor(selector: string, label: string, timeoutMs = 30_000) {
    return this.waitForExpression(
      `document.querySelector(${JSON.stringify(selector)})`,
      timeoutMs,
      label,
    );
  }

  /**
   * Sets a React-controlled input. Assigning `.value` alone updates the DOM and
   * leaves React's state behind, so the form submits empty — go through the
   * prototype setter and dispatch the event React listens for.
   */
  async fill(selector: string, value: string) {
    await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error("no element for " + ${JSON.stringify(selector)});
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value").set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
  }

  async click(selector: string) {
    await this.waitFor(selector, `click ${selector}`, 15_000);
    const clicked = await this.evaluate<boolean>(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Nothing matched ${selector}`);
  }

  /** Clicks the first enabled button whose trimmed text matches exactly. */
  async clickText(text: string) {
    const expression = `Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent.trim() === ${JSON.stringify(text)} && !b.disabled
    )`;
    await this.waitForExpression(expression, 15_000, `button "${text}"`);
    await this.evaluate(`(${expression}.click(), true)`);
  }

  async run(step: Step) {
    if ("click" in step) return this.click(step.click);
    if ("clickText" in step) return this.clickText(step.clickText);
    if ("scrollTo" in step) return this.scrollTo(step.scrollTo);
    return sleep(step.sleep);
  }

  async scrollTo(y: number) {
    await this.evaluate(`(window.scrollTo({ top: ${y}, behavior: "instant" }), true)`);
  }

  /**
   * Fills a field and confirms the value survived a tick.
   *
   * `readyState === "complete"` happens before React hydrates, and a value
   * written into an unhydrated input is discarded the moment hydration renders
   * the component's own (empty) state over it. The form then submits blank and
   * the server answers "Invalid email or password", which is a maddening thing
   * to debug. Writing until it sticks is the fix.
   */
  private async fillWhenHydrated(selector: string, value: string, label: string) {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      await this.fill(selector, value);
      await sleep(250);
      const current = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(selector)}).value`,
      );
      if (current === value) return;
    }
    throw new Error(`${label} never held its value — is the page hydrating?`);
  }

  async login(email: string, password: string) {
    await this.goto("/login");
    await this.waitFor('input[type="email"]', "login form");
    await this.fillWhenHydrated('input[type="email"]', email, "Email");
    await this.fillWhenHydrated(
      'input[autocomplete="current-password"]',
      password,
      "Password",
    );
    await this.click('button[type="submit"]');

    // Ask the session endpoint rather than watching the URL. The form calls
    // `signIn(..., { redirect: false })` and then `router.push`, and that push
    // does not always land — but the cookie is set either way, which is the
    // only thing the next `goto` needs. Watching `location.pathname` made a
    // successful sign-in look like a failure.
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      const current = await this.evaluate<string | null>(
        `fetch("/api/auth/session").then(r => r.json()).then(s => s?.user?.email ?? null)`,
      );
      if (current === email) return;
      const error = await this.evaluate<string | null>(
        `(document.querySelector('[role="alert"]')?.textContent ?? null)`,
      );
      if (error) throw new Error(`Sign-in refused for ${email}: ${error.trim()}`);
      await sleep(300);
    }
    throw new Error(`Sign-in for ${email} never produced a session.`);
  }

  async capture(file: string) {
    const res = (await this.send("Page.captureScreenshot", {
      format: "webp",
      quality: QUALITY,
      captureBeyondViewport: false,
    })) as { data?: string };
    if (!res.data) throw new Error(`Empty screenshot for ${file}`);
    const buffer = Buffer.from(res.data, "base64");
    writeFileSync(join(OUT_DIR, file), buffer);
    return buffer.byteLength;
  }
}

// ---------- Main ----------

async function main() {
  // Fail on a missing server before spending 20 seconds on a browser.
  try {
    const res = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    if (res.status >= 500) throw new Error(`${BASE_URL} answered ${res.status}`);
  } catch (err) {
    throw new Error(
      `No server at ${BASE_URL}. Start one with \`npm run dev\`, or set ` +
        `SCREENSHOT_BASE_URL.\n  ${(err as Error).message}`,
    );
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const profileDir = mkdtempSync(join(tmpdir(), "sat-screenshots-"));
  const port = 9333;
  const chrome = await launchChrome(port, profileDir);

  let cdp: Cdp | undefined;
  try {
    const version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as {
      webSocketDebuggerUrl: string;
    };
    cdp = await Cdp.connect(version.webSocketDebuggerUrl);

    // One context per identity: a single profile is a single cookie jar, and
    // the admin login would evict the student's session.
    const pages = new Map<"student" | "admin", Page>();
    for (const [role, email, password] of [
      ["student", STUDENT_EMAIL, STUDENT_PASSWORD],
      ["admin", ADMIN_EMAIL, ADMIN_PASSWORD],
    ] as const) {
      const { browserContextId } = (await cdp.send("Target.createBrowserContext")) as {
        browserContextId: string;
      };
      const { targetId } = (await cdp.send("Target.createTarget", {
        url: "about:blank",
        browserContextId,
      })) as { targetId: string };
      const { sessionId } = (await cdp.send("Target.attachToTarget", {
        targetId,
        flatten: true,
      })) as { sessionId: string };
      const page = new Page(cdp, sessionId);
      await page.prepare();
      await page.login(email, password);
      console.log(`  ✓ signed in as ${email}`);
      pages.set(role, page);
    }

    let total = 0;
    for (const shot of SHOTS) {
      const page = pages.get(shot.as)!;
      await page.goto(shot.path);
      for (const step of shot.steps ?? []) await page.run(step);
      await page.waitFor(shot.waitFor, shot.file);
      const bytes = await page.capture(shot.file);
      total += bytes;
      console.log(
        `  ✓ ${shot.file.padEnd(22)} ${(bytes / 1024).toFixed(0).padStart(5)} kB  ${shot.path}`,
      );
    }

    console.log(
      `\n4 screenshots at ${VIEWPORT.width * VIEWPORT.scale}×${
        VIEWPORT.height * VIEWPORT.scale
      }, ${(total / 1024).toFixed(0)} kB of source in src/assets/screenshots/.\n` +
        "next/image re-encodes these per request — what a visitor downloads is smaller.",
    );
  } finally {
    cdp?.close();
    chrome.kill();
    // Give Chrome a moment to release the profile before removing it.
    await sleep(500);
    rmSync(profileDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(`\n${(err as Error).message}\n`);
  process.exitCode = 1;
});
