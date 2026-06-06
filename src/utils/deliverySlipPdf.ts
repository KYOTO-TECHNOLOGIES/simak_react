import { jsPDF } from "jspdf";
import boardHeaderImg from "../assets/BOARD-1.png";

/** Page 50cm × 25cm; slip content 45cm × 25cm (2.5cm side margins). */
const PAGE_W_MM = 500;
const PAGE_H_MM = 250;
const MARGIN_X_MM = 25;
const CONTENT_W_MM = 450;
const HEADER_TOP_MARGIN_MM = 5;
const HEADER_MAX_H_MM = 95;
const PAD_X_MM = 4;

export type DeliverySlipOrder = {
  orderNumber: string;
  createdAt: string;
  shippingAddress: {
    fullName: string;
    phoneNumber: string;
    streetAddress: string;
    area: string;
    city: string;
    emirate: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    productUnitDisplay?: string | null;
  }>;
};

function formatOrderDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatItemQty(item: DeliverySlipOrder["items"][number]): string {
  const unit = item.productUnitDisplay === "100g" ? "x 100g" : (item.productUnitDisplay || "");
  return `${item.quantity}${unit ? ` ${unit}` : ""}`.trim();
}

function loadImageAsset(src: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error("Failed to load slip header image"));
    img.src = src;
  });
}

function fitImageInBox(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number
): { width: number; height: number } {
  const scale = Math.min(maxW / imgW, maxH / imgH);
  return { width: imgW * scale, height: imgH * scale };
}

function drawDivider(doc: jsPDF, y: number, weight = 0.4): void {
  doc.setLineWidth(weight);
  doc.line(MARGIN_X_MM + PAD_X_MM, y, MARGIN_X_MM + CONTENT_W_MM - PAD_X_MM, y);
}

export async function generateDeliverySlipPdf(order: DeliverySlipOrder): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PAGE_W_MM, PAGE_H_MM],
  });

  const headerAsset = await loadImageAsset(boardHeaderImg);
  const headerSize = fitImageInBox(
    headerAsset.width,
    headerAsset.height,
    CONTENT_W_MM,
    HEADER_MAX_H_MM
  );
  const headerX = MARGIN_X_MM + (CONTENT_W_MM - headerSize.width) / 2;
  const headerY = HEADER_TOP_MARGIN_MM;
  doc.addImage(
    headerAsset.dataUrl,
    "PNG",
    headerX,
    headerY,
    headerSize.width,
    headerSize.height
  );

  const left = MARGIN_X_MM + PAD_X_MM;
  const right = MARGIN_X_MM + CONTENT_W_MM - PAD_X_MM;
  let y = headerY + headerSize.height + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(order.orderNumber, left, y);
  doc.text(formatOrderDate(order.createdAt), right, y, { align: "right" });

  y += 6;
  drawDivider(doc, y, 0.5);
  y += 10;

  doc.setFontSize(24);
  doc.text(order.shippingAddress.fullName.toUpperCase(), left, y);
  y += 9;

  const addressParts = [
    order.shippingAddress.streetAddress,
    order.shippingAddress.area,
    order.shippingAddress.city,
    order.shippingAddress.emirate,
  ].filter(Boolean);

  if (addressParts.length > 0) {
    doc.setFontSize(18);
    const address = addressParts.join(", ");
    const addressLines = doc.splitTextToSize(address, CONTENT_W_MM - PAD_X_MM * 2);
    doc.text(addressLines.slice(0, 2), left, y);
    y += addressLines.length > 1 ? 14 : 8;
  }

  doc.setFontSize(20);
  doc.text(order.shippingAddress.phoneNumber, left, y);
  y += 6;
  drawDivider(doc, y, 0.5);
  y += 10;

  doc.setFontSize(19);
  doc.text("ITEM", left, y);
  doc.text("QTY", right, y, { align: "right" });
  y += 4;
  drawDivider(doc, y, 0.2);
  y += 8;

  doc.setFontSize(18);
  for (const item of order.items) {
    if (y > PAGE_H_MM - 12) break;
    const name = (item.productName || "Item").toUpperCase();
    const nameLines = doc.splitTextToSize(name, CONTENT_W_MM - 50);
    doc.text(nameLines, left, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatItemQty(item), right, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    y += Math.max(nameLines.length * 7, 8);
  }

  return doc;
}

export async function downloadDeliverySlipPdf(
  order: DeliverySlipOrder,
  filename: string
): Promise<void> {
  const doc = await generateDeliverySlipPdf(order);
  doc.save(filename);
}
