import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_SCREENS,
  SCREENSHOT_DIR,
  SCREENSHOT_HEIGHT,
  SCREENSHOT_SCALE,
  SCREENSHOT_WIDTH,
} from "@/lib/product-screens";

/**
 * T3.5. The section's acceptance criterion — no layout shift on tab change —
 * rests on one fact the component cannot check for itself: every screenshot is
 * the same size. `aspect-[8/5]` holds the frame open, but a file captured at a
 * different viewport would then be letterboxed or cropped, which is a visual
 * regression nobody would notice until the next capture.
 *
 * So this reads the WebP headers off disk. It also pins the callout rules, so
 * "labels, not paragraphs" survives the next person editing the copy.
 */

/** Intrinsic size of a WebP, from its RIFF chunk header. */
function webpSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buf.toString("ascii", 8, 12)).toBe("WEBP");
  const chunk = buf.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    // 24-bit little-endian canvas dimensions, stored minus one.
    return {
      width: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
      height: (buf.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }
  if (chunk === "VP8 ") {
    // Lossy: 14 bits each, after the 3-byte start code and the 0x9d012a sync.
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    // Lossless: 14 bits each, packed into the four bytes after the signature.
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  throw new Error(`${file}: unrecognised WebP chunk ${chunk}`);
}

describe("product screens", () => {
  it("names four screens with unique ids", () => {
    expect(PRODUCT_SCREENS).toHaveLength(4);
    expect(new Set(PRODUCT_SCREENS.map((s) => s.id)).size).toBe(4);
  });

  it("gives every screen two or three callouts", () => {
    for (const screen of PRODUCT_SCREENS) {
      expect(screen.callouts.length, screen.id).toBeGreaterThanOrEqual(2);
      expect(screen.callouts.length, screen.id).toBeLessThanOrEqual(3);
      for (const callout of screen.callouts) {
        // A label, not a paragraph: no sentence-ending punctuation and short
        // enough to sit on one line of a three-column row.
        expect(callout, screen.id).not.toMatch(/[.!?]$/);
        expect(callout.length, callout).toBeLessThanOrEqual(48);
      }
    }
  });

  it("describes every screenshot for a screen reader", () => {
    for (const screen of PRODUCT_SCREENS) {
      expect(screen.alt.length, screen.id).toBeGreaterThan(40);
      expect(screen.route.startsWith("/"), screen.id).toBe(true);
      expect(screen.tab.length, screen.id).toBeLessThanOrEqual(16);
    }
  });
});

describe("screenshot files", () => {
  it("has one file per screen, all captured at the same 2x size", () => {
    const expected = {
      width: SCREENSHOT_WIDTH * SCREENSHOT_SCALE,
      height: SCREENSHOT_HEIGHT * SCREENSHOT_SCALE,
    };
    for (const screen of PRODUCT_SCREENS) {
      const file = join(process.cwd(), SCREENSHOT_DIR, `${screen.id}.webp`);
      expect(existsSync(file), `${file} — run \`npm run gen:screenshots\``).toBe(true);
      expect(webpSize(file), screen.id).toEqual(expected);
    }
  });
});
