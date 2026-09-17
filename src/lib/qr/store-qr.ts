import QRCode from "qrcode";

const QR_SIZE = 512;
const LOGO_SIZE = 96;
const EXPORT_WIDTH = 640;
const EXPORT_HEIGHT = 760;

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function generateStoreQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: QR_SIZE,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

/** Composes QR + centered logo + store name for PDF / print. */
export async function composeStoreQrExport(input: {
  url: string;
  storeName: string;
  logoUrl?: string | null;
}): Promise<string> {
  const qrDataUrl = await generateStoreQrDataUrl(input.url);
  const qrImage = await loadImage(qrDataUrl);
  if (!qrImage) throw new Error("Failed to render QR");

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  const qrX = (EXPORT_WIDTH - QR_SIZE) / 2;
  const qrY = 48;
  ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  const logoPad = 10;
  const badgeSize = LOGO_SIZE + logoPad * 2;
  const badgeX = qrX + (QR_SIZE - badgeSize) / 2;
  const badgeY = qrY + (QR_SIZE - badgeSize) / 2;

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 16);
  ctx.fill();

  if (input.logoUrl) {
    const logo = await loadImage(input.logoUrl);
    if (logo) {
      const lx = badgeX + logoPad;
      const ly = badgeY + logoPad;
      ctx.save();
      roundRect(ctx, lx, ly, LOGO_SIZE, LOGO_SIZE, 12);
      ctx.clip();
      drawCover(ctx, logo, lx, ly, LOGO_SIZE);
      ctx.restore();
    } else {
      drawInitials(ctx, input.storeName, badgeX + logoPad, badgeY + logoPad, LOGO_SIZE);
    }
  } else {
    drawInitials(ctx, input.storeName, badgeX + logoPad, badgeY + logoPad, LOGO_SIZE);
  }

  ctx.fillStyle = "#0f172a";
  ctx.font = "600 28px Tajawal, Cairo, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const nameY = qrY + QR_SIZE + 56;
  truncateText(ctx, input.storeName, EXPORT_WIDTH / 2, nameY, EXPORT_WIDTH - 64);

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

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  const scale = Math.max(size / img.width, size / img.height);
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
) {
  ctx.fillStyle = "#ecf6f0";
  roundRect(ctx, x, y, size, size, 12);
  ctx.fill();
  ctx.fillStyle = "#3A7A56";
  ctx.font = `700 ${Math.round(size * 0.36)}px Tajawal, Cairo, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const initial = name.trim().charAt(0) || "د";
  ctx.fillText(initial, x + size / 2, y + size / 2);
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
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
