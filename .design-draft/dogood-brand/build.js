/* Builds the DoGood mark asset package: SVG sources, PNG renders, favicon.ico. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = process.argv[2];
const C = {
  seal: "#2C6A4C",
  ink: "#12201A",
  paper: "#EDEEE4",
  plate: "#0E1A14",
};

/* ---- geometry -------------------------------------------------------------
   13 rings on a circle of radius R. Ring radius is set so neighbours overlap
   by a constant proportion, which is what makes the chain read as linked.
   The viewBox is trimmed to the artwork, so padding is the consumer's call. */
const N = 13;
const BOX = 160;
const CENTER = BOX / 2;

function ringGeometry(strokeRatio) {
  // extent = R + r + sw/2 must equal CENTER - 1 (1 unit of bleed guard)
  const rFactor = Math.sin(Math.PI / N) * 1.225; // r = R * rFactor
  const R = (CENTER - 1) / (1 + rFactor + strokeRatio / 2);
  return { R, r: R * rFactor, sw: R * strokeRatio };
}

function rings(strokeRatio) {
  const g = ringGeometry(strokeRatio);
  const out = [];
  for (let i = 0; i < N; i++) {
    const a = ((i * 360) / N - 90) * (Math.PI / 180);
    out.push(
      `    <circle cx="${(CENTER + g.R * Math.cos(a)).toFixed(3)}" cy="${(
        CENTER + g.R * Math.sin(a)
      ).toFixed(3)}" r="${g.r.toFixed(3)}"/>`
    );
  }
  return { paths: out.join("\n"), sw: g.sw };
}

/* strokeRatio 0.0552 matches the presentation deck; 0.095 is the heavy cut
   used below 48px, where the standard weight closes up into a blob. */
const WEIGHT = { standard: 0.0552, heavy: 0.095 };

/* At 16px the thirteen links stop resolving -- they antialias into a grey
   smudge -- so that size gets a reduced mark: the silhouette only, keeping
   the same outer diameter. Below 20px the link count is not readable by
   anyone, so nothing is lost by dropping it. */
function reducedSVG({ color, bg = null, inset = 1, px = null }) {
  const dim = px ? ` width="${px}" height="${px}"` : "";
  const sw = 34;
  const body = `  <circle cx="${CENTER}" cy="${CENTER}" r="${
    CENTER - 1 - sw / 2
  }" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
  const inner = bg
    ? `  <rect width="${BOX}" height="${BOX}" fill="${bg}"/>\n  <g transform="translate(${(
        (BOX * (1 - inset)) / 2
      ).toFixed(3)} ${((BOX * (1 - inset)) / 2).toFixed(3)}) scale(${inset})">\n${body}\n  </g>`
    : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}"${dim} role="img" aria-label="DoGood">\n${inner}\n</svg>\n`;
}

function markSVG({ color, weight = "standard", bg = null, inset = 1, px = null }) {
  const scale = bg ? inset : 1;
  const r = rings(WEIGHT[weight]);
  const dim = px ? ` width="${px}" height="${px}"` : "";
  const body = `  <g fill="none" stroke="${color}" stroke-width="${r.sw.toFixed(
    3
  )}">\n${r.paths}\n  </g>`;
  const inner = bg
    ? `  <rect width="${BOX}" height="${BOX}" fill="${bg}"/>\n  <g transform="translate(${(
        (BOX * (1 - scale)) / 2
      ).toFixed(3)} ${((BOX * (1 - scale)) / 2).toFixed(3)}) scale(${scale})">\n${body}\n  </g>`
    : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}"${dim} role="img" aria-label="DoGood">\n${inner}\n</svg>\n`;
}

/* ---- lockups --------------------------------------------------------------
   These carry live text: the wordmark is only correct with Libre Caslon
   Display installed. The README tells the user to convert to outlines. */
const FACE = "'Libre Caslon Display', Georgia, 'Times New Roman', serif";
const UI = "'Libre Franklin', Helvetica, Arial, sans-serif";

function lockupHorizontal() {
  const r = rings(WEIGHT.standard);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 160" role="img" aria-label="DoGood LLC">
  <g fill="none" stroke="${C.ink}" stroke-width="${r.sw.toFixed(3)}">
${r.paths}
  </g>
  <text x="196" y="94" font-family="${FACE}" font-size="80" fill="${C.ink}">Do<tspan fill="${C.seal}">Good</tspan></text>
  <text x="200" y="126" font-family="${UI}" font-size="17" font-weight="600" letter-spacing="5.5" fill="${C.ink}" opacity="0.62">LLC</text>
</svg>
`;
}

function lockupVertical() {
  const r = rings(WEIGHT.standard);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 290" role="img" aria-label="DoGood LLC">
  <g transform="translate(100 0)" fill="none" stroke="${C.ink}" stroke-width="${r.sw.toFixed(3)}">
${r.paths}
  </g>
  <text x="180" y="236" text-anchor="middle" font-family="${FACE}" font-size="76" fill="${C.ink}">Do<tspan fill="${C.seal}">Good</tspan></text>
  <text x="180" y="266" text-anchor="middle" font-family="${UI}" font-size="16" font-weight="600" letter-spacing="5.5" fill="${C.ink}" opacity="0.62">LLC</text>
</svg>
`;
}

/* ---- ICO ------------------------------------------------------------------
   PNG-compressed ICO (supported since Vista); each entry points at a whole
   PNG file rather than a DIB. */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const entries = [];
  for (const p of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(p.size >= 256 ? 0 : p.size, 0);
    e.writeUInt8(p.size >= 256 ? 0 : p.size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(p.data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += p.data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

/* ---- build ---------------------------------------------------------------- */
async function main() {
  const dirs = ["svg", "png/mark-green", "png/mark-white", "png/app-icon"];
  for (const d of dirs) fs.mkdirSync(path.join(OUT, d), { recursive: true });

  const written = [];
  const write = (rel, data) => {
    fs.writeFileSync(path.join(OUT, rel), data);
    written.push(rel);
  };

  // SVG sources
  write("svg/mark-green.svg", markSVG({ color: C.seal }));
  write("svg/mark-ink.svg", markSVG({ color: C.ink }));
  write("svg/mark-white.svg", markSVG({ color: C.paper }));
  write("svg/mark-green-small.svg", markSVG({ color: C.seal, weight: "heavy" }));
  write("svg/mark-white-small.svg", markSVG({ color: C.paper, weight: "heavy" }));
  write("svg/app-icon.svg", markSVG({ color: C.paper, bg: C.plate, inset: 0.62 }));
  write("svg/mark-reduced-white.svg", reducedSVG({ color: C.paper }));
  write("svg/mark-reduced-green.svg", reducedSVG({ color: C.seal }));
  write("svg/lockup-horizontal.svg", lockupHorizontal());
  write("svg/lockup-vertical.svg", lockupVertical());

  // PNG renders. Anything at or below 48px uses the heavy cut.
  const heavyAt = 48;
  const markSizes = [32, 64, 128, 256, 512, 1024];
  const iconSizes = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024];

  const render = async (svg, px) =>
    sharp(Buffer.from(svg)).resize(px, px).png({ compressionLevel: 9 }).toBuffer();

  for (const px of markSizes) {
    const weight = px <= heavyAt ? "heavy" : "standard";
    write(
      `png/mark-green/mark-green-${px}.png`,
      await render(markSVG({ color: C.seal, weight, px }), px)
    );
    write(
      `png/mark-white/mark-white-${px}.png`,
      await render(markSVG({ color: C.paper, weight, px }), px)
    );
  }

  const reduceBelow = 20;
  const icoParts = [];
  for (const px of iconSizes) {
    const weight = px <= heavyAt ? "heavy" : "standard";
    const svg =
      px < reduceBelow
        ? reducedSVG({ color: C.paper, bg: C.plate, inset: 0.62, px })
        : markSVG({ color: C.paper, bg: C.plate, inset: 0.62, weight, px });
    const buf = await render(svg, px);
    write(`png/app-icon/app-icon-${px}.png`, buf);
    if ([16, 32, 48].includes(px)) icoParts.push({ size: px, data: buf });
  }

  write("favicon.ico", buildIco(icoParts));

  console.log(written.length + " files written");
  for (const w of written) {
    const s = fs.statSync(path.join(OUT, w)).size;
    console.log("  " + w + "  (" + s + " b)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
