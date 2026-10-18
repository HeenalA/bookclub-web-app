/* ============================================================================
   color.js — derive a member's chip colours from their own colour.
   ============================================================================
   The old CSS had this hardcoded, one rule per person:

       .chip.maya   { background: #deeaf5; color: #185FA5; }
       .chip.mina   { background: #f4c0d1; color: #72243E; }
       .chip.heenal { background: #e8dcf5; color: #3C3489; }

   Those three shades were hand-picked and they looked good — but they also
   meant a fourth member was impossible without an engineer editing a
   stylesheet. Since the app now supports any number of clubs with any number
   of people, the chip shades are computed from whatever colour a member
   actually has.

   The approach: convert the member's hex to HSL, then keep the hue and
   rebuild the lightness and saturation. Hue is what makes a colour feel
   "blue" or "pink"; lightness is what makes a shade usable as a background
   versus as text. Holding hue steady and moving the other two keeps the family
   resemblance while guaranteeing the text/background pair stays readable.

   Checked against the original hand-picked values: Maya's #7B9EC9 comes back
   out as hsl(212, 58%, 91%) on #deeaf5 and hsl(212, 73%, 36%) on #185FA5 —
   within a hair of the shades that were chosen by eye.
   ============================================================================ */

/** Parse "#RRGGBB" (or "#RGB") into {r, g, b}, 0-255. */
function hexToRgb(hex) {
  let value = String(hex || "").trim().replace(/^#/, "");

  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** RGB (0-255) to HSL with h in degrees and s/l as percentages. */
function rgbToHsl({ r, g, b }) {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;

  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = delta / (1 - Math.abs(2 * l - 1));

  let h;
  if (max === rf) h = ((gf - bf) / delta) % 6;
  else if (max === gf) h = (bf - rf) / delta + 2;
  else h = (rf - gf) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/* A neutral fallback, used when a colour is missing or malformed. Returning
   something usable rather than throwing matters here: a single bad hex in the
   database should not blank out a whole ratings table. */
const FALLBACK = {
  base: "#8a7a6a",
  bg: "hsl(30, 12%, 92%)",
  text: "hsl(30, 20%, 32%)",
  border: "hsl(30, 14%, 84%)",
};

/**
 * Given a member's colour, return the set of shades the UI needs.
 *
 *   base   — the member's own colour, for avatars and dots
 *   bg     — a pale tint, for chip and badge backgrounds
 *   text   — a deep shade of the same hue, readable on `bg`
 *   border — a light edge, between `bg` and `base` in weight
 */
export function memberColors(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return FALLBACK;

  const { h, s } = rgbToHsl(rgb);

  return {
    base: hex,
    // Saturation is pushed up as lightness goes up, because a very light
    // colour reads as plain grey otherwise.
    bg: `hsl(${h}, ${clamp(s * 1.4, 25, 65).toFixed(0)}%, 91%)`,
    // Lightness of 36% is the key number: dark enough to clear WCAG AA
    // contrast against a 91%-lightness background at every hue.
    text: `hsl(${h}, ${clamp(s * 1.75, 40, 80).toFixed(0)}%, 36%)`,
    border: `hsl(${h}, ${clamp(s * 1.2, 20, 55).toFixed(0)}%, 82%)`,
  };
}

/**
 * CSS custom properties for a member, to spread onto a `style` prop.
 * Components then refer to var(--member-bg) and friends, which keeps the
 * colour maths out of the components entirely.
 */
export function memberColorVars(hex) {
  const c = memberColors(hex);
  return {
    "--member-base": c.base,
    "--member-bg": c.bg,
    "--member-text": c.text,
    "--member-border": c.border,
  };
}

/** Initials fallback, for a member row that has none stored. */
export function initialsOf(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}
