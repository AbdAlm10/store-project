import { appConfig } from "@/config/app";
import QRCode from "qrcode";

/**
 * Print-ready stand insert — 10×15 cm (A6 / cashier standard).
 * Canvas 1200×1800 ≈ 300 DPI.
 */
export const QR_STAND_WIDTH = 1200;
export const QR_STAND_HEIGHT = 1800;
export const QR_STAND_PRINT_MM = { width: 100, height: 150 } as const;

export const QR_STAND_DEFAULT_COLOR = appConfig.brand.greenDark;
export const QR_STAND_DEFAULT_LOGO_BG = appConfig.brand.sand;

/** Layout matching the stand wireframe (headline → logo → QR → powered-by). */
const HEADLINE = "امسح الباركود لرؤية المنتجات";
const POWERED_BY = "مدعوم بواسطة";
const DUKKAN_WORDMARK = "/brand/dukkan-wordmark.png";

const QR_PIXELS = 860;
const LOGO_SIZE = 148;

export type ComposeStoreQrOptions = {
  url: string;
  storeName: string;
  logoUrl?: string | null;
  standColor?: string;
  logoBg?: string;
};

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function normalizeHex(value: string | undefined | null, fallback: string): string {
  const raw = (value ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9A-Fa-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex, QR_STAND_DEFAULT_COLOR).slice(1);
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function mixHex(hex: string, toward: "black" | "white", amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const t = toward === "white" ? 255 : 0;
  const mix = (c: number) =>
    Math.round(c + (t - c) * Math.min(1, Math.max(0, amount)));
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(mix(r))}${to(mix(g))}${to(mix(b))}`;
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export async function generateStoreQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: QR_PIXELS,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

/**
 * Wireframe layout (top → bottom):
 * 1. Headline
 * 2. Circular store logo
 * 3. Large rounded QR
 * 4. «مدعوم بواسطة» + Dukkan wordmark
 */
export async function composeStoreQrExport(
  input: ComposeStoreQrOptions,
): Promise<string> {
  const standColor = normalizeHex(input.standColor, QR_STAND_DEFAULT_COLOR);
  const logoBg = normalizeHex(input.logoBg, QR_STAND_DEFAULT_LOGO_BG);

  const qrDataUrl = await generateStoreQrDataUrl(input.url);
  const [qrImage, wordmark] = await Promise.all([
    loadImage(qrDataUrl),
    loadImage(DUKKAN_WORDMARK),
  ]);
  if (!qrImage) throw new Error("Failed to render QR");

  const canvas = document.createElement("canvas");
  canvas.width = QR_STAND_WIDTH;
  canvas.height = QR_STAND_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Background gradient from store / brand color
  const gradient = ctx.createLinearGradient(0, 0, 0, QR_STAND_HEIGHT);
  gradient.addColorStop(0, mixHex(standColor, "black", 0.45));
  gradient.addColorStop(0.55, mixHex(standColor, "black", 0.15));
  gradient.addColorStop(1, mixHex(standColor, "white", 0.06));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, QR_STAND_WIDTH, QR_STAND_HEIGHT);

  const font =
    '"IBM Plex Sans Arabic", Tajawal, Cairo, system-ui, sans-serif';
  const cx = QR_STAND_WIDTH / 2;

  // —— 1) Headline ——
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 60px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(HEADLINE, cx, 150);

  // —— 2) Logo plate (rounded square) + store name ——
  const logoY = 240;
  const logoX = cx - LOGO_SIZE / 2;

  ctx.fillStyle = rgba("#000000", 0.16);
  roundRect(ctx, logoX - 6, logoY - 6, LOGO_SIZE + 12, LOGO_SIZE + 12, 28);
  ctx.fill();
  ctx.fillStyle = logoBg;
  roundRect(ctx, logoX, logoY, LOGO_SIZE, LOGO_SIZE, 24);
  ctx.fill();

  const inset = 14;
  const logoInner = LOGO_SIZE - inset * 2;
  if (input.logoUrl) {
    const logo = await loadImage(input.logoUrl);
    if (logo) {
      ctx.save();
      roundRect(
        ctx,
        logoX + inset,
        logoY + inset,
        logoInner,
        logoInner,
        16,
      );
      ctx.clip();
      drawContain(ctx, logo, logoX + inset, logoY + inset, logoInner);
      ctx.restore();
    } else {
      drawInitials(
        ctx,
        input.storeName,
        logoX + inset,
        logoY + inset,
        logoInner,
        standColor,
      );
    }
  } else {
    drawInitials(
      ctx,
      input.storeName,
      logoX + inset,
      logoY + inset,
      logoInner,
      standColor,
    );
  }

  const nameY = logoY + LOGO_SIZE + 42;
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 38px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  truncateText(ctx, input.storeName, cx, nameY, QR_STAND_WIDTH - 160);

  // —— 3) Large QR (rounded card) ——
  const qrPad = 36;
  const qrCard = QR_PIXELS + qrPad * 2;
  const qrX = (QR_STAND_WIDTH - qrCard) / 2;
  const qrY = 520;

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX, qrY, qrCard, qrCard, 48);
  ctx.fill();
  ctx.drawImage(qrImage, qrX + qrPad, qrY + qrPad, QR_PIXELS, QR_PIXELS);

  // —— 4) Powered by + wordmark (same line, larger) ——
  const footerY = 1620;
  ctx.font = `600 55px ${font}`;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const labelW = ctx.measureText(POWERED_BY).width;
  const markH = 80;
  const markW = wordmark
    ? Math.round((wordmark.width / wordmark.height) * markH)
    : 0;
  const gap = 16;
  const rowW = labelW + (wordmark ? gap + markW : 0);
  let x = cx - rowW / 2;

  // RTL visual order: wordmark then «مدعوم بواسطة» (reads as مدعوم بواسطة دكّان)
  if (wordmark) {
    ctx.drawImage(wordmark, x, footerY - markH / 2, markW, markH);
    x += markW + gap;
  }
  ctx.textAlign = "left";
  ctx.fillText(POWERED_BY, x, footerY);

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
}

function drawInitials(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  accent: string,
) {
  ctx.fillStyle = mixHex(accent, "white", 0.82);
  roundRect(ctx, x, y, size, size, 14);
  ctx.fill();
  ctx.fillStyle = mixHex(accent, "black", 0.25);
  ctx.font = `700 ${Math.round(size * 0.42)}px "IBM Plex Sans Arabic", Tajawal, Cairo, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.trim().charAt(0) || "د", x + size / 2, y + size / 2 + 2);
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  ctx.textAlign = "center";
  let output = text;
  if (ctx.measureText(output).width <= maxWidth) {
    ctx.fillText(output, x, y);
    return;
  }
  while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  ctx.fillText(`${output}…`, x, y);
}
