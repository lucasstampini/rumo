// Gera as fotos de demonstração em public/cars/ a partir do SVG do carro do protótipo.
// Sem hotlink de terceiros (SPEC §9). Rodar: node scripts/gen-car-svgs.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "cars");

export const CAR_COLORS = {
  onix: "#c8102e",
  hb20: "#e5e7eb",
  kwid: "#f2a516",
  polo: "#1f3a8a",
  tcross: "#1b2420",
  mobi: "#ffffff",
  corolla: "#7b8580",
  argo: "#159a58",
};

function car(color) {
  const light = ["#ffffff", "#e5e7eb"].includes(color);
  return `<ellipse cx="100" cy="74" rx="90" ry="5" fill="rgba(16,35,26,.12)"/>
  <path d="M10 60 Q7 45 22 41 L50 37 Q70 18 97 16 L128 16 Q150 17 164 35 L184 41 Q195 45 192 60 Z" fill="${color}" stroke="${light ? "#9aa7a0" : "rgba(0,0,0,.25)"}" stroke-width="1.5"/>
  <path d="M62 37 Q77 23 96 21 L110 21 L110 37 Z M116 21 L128 21 Q144 22 155 37 L116 37 Z" fill="#cfe3ee"/>
  <rect x="88" y="44" width="10" height="3" rx="1.5" fill="rgba(0,0,0,.25)"/>
  <rect x="180" y="45" width="10" height="5" rx="2" fill="#f7d36b"/>
  <circle cx="52" cy="60" r="13" fill="#1d2722"/><circle cx="52" cy="60" r="6" fill="#a9b4ae"/>
  <circle cx="152" cy="60" r="13" fill="#1d2722"/><circle cx="152" cy="60" r="6" fill="#a9b4ae"/>`;
}

// 1: lateral sobre o verde claro da marca. 2: espelhado, na rua.
function photo(color, variant) {
  if (variant === 1) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Carro">
  <rect width="800" height="500" fill="#e3f4ea"/>
  <circle cx="640" cy="110" r="150" fill="#d3ecdd"/>
  <g transform="translate(90 95) scale(3.1)">${car(color)}</g>
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Carro">
  <rect width="800" height="500" fill="#e9efe7"/>
  <rect y="0" width="800" height="250" fill="#dfeaf0"/>
  <rect x="60" y="120" width="150" height="170" rx="6" fill="#cfe6d2"/>
  <rect x="250" y="80" width="190" height="210" rx="6" fill="#d9e4dc"/>
  <rect x="520" y="140" width="220" height="150" rx="6" fill="#cfe6d2"/>
  <rect y="290" width="800" height="210" fill="#c9d3cc"/>
  <rect y="388" width="800" height="8" fill="#f6dc8c"/>
  <g transform="translate(710 150) scale(-3.1 3.1)">${car(color)}</g>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
for (const [slug, color] of Object.entries(CAR_COLORS)) {
  writeFileSync(join(OUT, `${slug}-1.svg`), photo(color, 1));
  writeFileSync(join(OUT, `${slug}-2.svg`), photo(color, 2));
}
console.log(`OK: ${Object.keys(CAR_COLORS).length * 2} imagens em public/cars/`);
