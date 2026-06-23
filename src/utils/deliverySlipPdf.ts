import { jsPDF } from "jspdf";
import boardHeaderImg from "../assets/newbord.jpeg";

/** Page 50cm × 25cm; slip content 45cm × 25cm (2.5cm side margins). */
const PAGE_W_MM = 500;
const PAGE_H_MM = 250;
const MARGIN_X_MM = 25;
const CONTENT_W_MM = 450;
const HEADER_TOP_MARGIN_MM = 5;
const HEADER_MAX_H_MM = 95;
const HEADER_SIDE_INSET_MM = 10;
const PAD_X_MM = 4;
const FOOTER_TEXT = "Thank you for shopping with us";

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

type DeliverySlipItem = DeliverySlipOrder["items"][number];

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
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const index = (y * canvas.width + x) * 4;
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const a = pixels[index + 3];
          const isVisible = a > 20 && !(r > 245 && g > 245 && b > 245);
          if (!isVisible) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      if (maxX >= minX && maxY >= minY) {
        const cropPadding = 20;
        minX = Math.max(0, minX - cropPadding);
        minY = Math.max(0, minY - cropPadding);
        maxX = Math.min(canvas.width - 1, maxX + cropPadding);
        maxY = Math.min(canvas.height - 1, maxY + cropPadding);
      } else {
        minX = 0;
        minY = 0;
        maxX = canvas.width - 1;
        maxY = canvas.height - 1;
      }

      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      const croppedCtx = croppedCanvas.getContext("2d");
      if (!croppedCtx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      croppedCtx.drawImage(
        canvas,
        minX,
        minY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );
      resolve({
        dataUrl: croppedCanvas.toDataURL("image/png"),
        width: cropWidth,
        height: cropHeight,
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

function drawBox(doc: jsPDF, x: number, y: number, w: number, h: number, weight = 0.45): void {
  doc.setLineWidth(weight);
  doc.rect(x, y, w, h);
}

function renderSlipPage(
  doc: jsPDF,
  order: DeliverySlipOrder,
  headerAsset: { dataUrl: string; width: number; height: number },
  item?: DeliverySlipItem
): void {
  const headerSize = fitImageInBox(
    headerAsset.width,
    headerAsset.height,
    CONTENT_W_MM - HEADER_SIDE_INSET_MM * 2,
    HEADER_MAX_H_MM * 0.8
  );
  const headerX = MARGIN_X_MM + (CONTENT_W_MM - headerSize.width) / 2;
  const headerY = HEADER_TOP_MARGIN_MM + 2;
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
  const contentWidth = right - left;
  let y = headerY + headerSize.height + 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text(order.orderNumber, left, y);
  doc.setFontSize(18);
  doc.text(formatOrderDate(order.createdAt), right, y - 1, { align: "right" });

  y += 8;
  drawDivider(doc, y, 0.5);
  y += 8;

  const addressParts = [
    order.shippingAddress.streetAddress,
    order.shippingAddress.area,
    order.shippingAddress.city,
    order.shippingAddress.emirate,
  ].filter(Boolean);

  const addressBoxX = left;
  const addressBoxY = y;
  const addressBoxW = contentWidth;
  const addressPad = 6;
  const addressTextW = addressBoxW - addressPad * 2;
  const customerName = order.shippingAddress.fullName || "Customer";
  const phoneNumber = order.shippingAddress.phoneNumber || "-";
  const nameLines = doc.splitTextToSize(customerName.toUpperCase(), addressTextW);
  const addressLines = doc.splitTextToSize(addressParts.join(", "), addressTextW);
  const phoneLines = doc.splitTextToSize(phoneNumber, addressTextW);
  const addressBoxH =
    addressPad +
    nameLines.length * 10 +
    (addressLines.length > 0 ? addressLines.length * 7 + 2 : 0) +
    phoneLines.length * 8 +
    addressPad;

  drawBox(doc, addressBoxX, addressBoxY, addressBoxW, addressBoxH, 0.45);

  let textY = addressBoxY + addressPad + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text(nameLines, addressBoxX + addressPad, textY);
  textY += nameLines.length * 10;

  if (addressLines.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(15);
    doc.text(addressLines, addressBoxX + addressPad, textY);
    textY += addressLines.length * 7 + 2;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(phoneLines, addressBoxX + addressPad, textY);
  y = addressBoxY + addressBoxH + 8;

  const qtyColW = 60;
  const itemColW = contentWidth - qtyColW;
  const headerRowH = 14;

  drawBox(doc, left, y, contentWidth, headerRowH, 0.5);
  doc.line(left + itemColW, y, left + itemColW, y + headerRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("ITEM", left + 4, y + 9);
  doc.text("QTY", right - 4, y + 9, { align: "right" });
  y += headerRowH;

  const slipItem: DeliverySlipItem = item ?? {
    productName: "Item",
    quantity: 0,
    productUnitDisplay: null,
  };
  const qty = formatItemQty(slipItem);
  const name = (slipItem.productName || "Item").toUpperCase();
  const nameLines = doc.splitTextToSize(name, itemColW - 10);
  const rowH = Math.max(16, nameLines.length * 7 + 8);

  drawBox(doc, left, y, contentWidth, rowH, 0.35);
  doc.line(left + itemColW, y, left + itemColW, y + rowH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(nameLines, left + 4, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.text(qty, right - 4, y + rowH / 2 + 2, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(FOOTER_TEXT, MARGIN_X_MM + CONTENT_W_MM / 2, PAGE_H_MM - 12, {
    align: "center",
  });
}

export async function generateDeliverySlipPdf(order: DeliverySlipOrder): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PAGE_W_MM, PAGE_H_MM],
  });

  const headerAsset = await loadImageAsset(boardHeaderImg);
  const items = order.items.length > 0 ? order.items : [undefined];

  items.forEach((item, index) => {
    if (index > 0) {
      doc.addPage([PAGE_W_MM, PAGE_H_MM], "landscape");
    }
    renderSlipPage(doc, order, headerAsset, item);
  });

  return doc;
}

export async function downloadDeliverySlipPdf(
  order: DeliverySlipOrder,
  filename: string
): Promise<void> {
  const doc = await generateDeliverySlipPdf(order);
  doc.save(filename);
}
