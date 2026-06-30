import {
	PDFDocument,
	PageSizes,
	StandardFonts,
	rgb,
	type PDFFont,
	type PDFImage,
	type PDFPage,
} from "pdf-lib";
import logoPdfMayakoba from "../assets/brand/logopdfmayakoba.png";
import type { Asset } from "../types";

const [pageWidth, pageHeight] = PageSizes.A4;
const margin = 40;
const headerGreen = rgb(0.063, 0.725, 0.506);
const darkInk = rgb(0.02, 0.06, 0.11);
const mutedInk = rgb(0.35, 0.42, 0.52);
const lineColor = rgb(0.84, 0.88, 0.92);

type PdfKind = "alta" | "baja";

type PdfContext = {
	doc: PDFDocument;
	page: PDFPage;
	font: PDFFont;
	bold: PDFFont;
	logo: PDFImage | null;
};

export async function generarPDFAlta(
	activos: Asset[],
	asignadoA?: string,
): Promise<void> {
	await generarActa({
		tipo: "alta",
		titulo: "ACTA DE ALTA DE ACTIVOS FIJOS",
		activos,
		asignadoA,
	});
}

export async function generarPDFBaja(
	activos: Asset[],
	motivo: string,
	asignadoA?: string,
): Promise<void> {
	await generarActa({
		tipo: "baja",
		titulo: "ACTA DE BAJA DE ACTIVOS FIJOS",
		activos,
		motivo,
		asignadoA,
	});
}

async function generarActa({
	tipo,
	titulo,
	activos,
	motivo,
	asignadoA,
}: {
	tipo: PdfKind;
	titulo: string;
	activos: Asset[];
	motivo?: string;
	asignadoA?: string;
}) {
	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const bold = await doc.embedFont(StandardFonts.HelveticaBold);
	const context: PdfContext = {
		doc,
		page: doc.addPage([pageWidth, pageHeight]),
		font,
		bold,
		logo: await loadHeaderLogo(doc),
	};

	const fecha = new Date();
	const folio = `${tipo.toUpperCase()}-${fecha.getTime()}`;
	let y = drawHeader(context, titulo, folio, fecha);

	if (asignadoA) y = drawAssignment(context, asignadoA, y);
	if (motivo) y = drawReason(context, motivo, y);

	y = drawAssetsTable(context, activos, tipo, y);
	drawSignatures(context, y);
	drawFooters(context.doc, context.font);

	const bytes = await doc.save();
	downloadPdf(bytes, `${tipo}-activos-${formatDateForFile(fecha)}.pdf`);
}

async function loadHeaderLogo(doc: PDFDocument): Promise<PDFImage | null> {
	try {
		const response = await fetch(logoPdfMayakoba);
		const bytes = await response.arrayBuffer();
		return await doc.embedPng(bytes);
	} catch {
		return null;
	}
}

function drawHeader(
	context: PdfContext,
	titulo: string,
	folio: string,
	fecha: Date,
): number {
	const { page, font, bold, logo } = context;
	const textX = logo ? margin + 104 : margin;

	if (logo) {
		const logoWidth = 120;
		const logoHeight = (logo.height / logo.width) * logoWidth;
		page.drawImage(logo, {
			x: margin,
			y: pageHeight - 82,
			width: logoWidth,
			height: logoHeight,
		});
	}

	page.drawText(titulo, {
		x: margin,
		y: pageHeight - 104,
		size: 17,
		font: bold,
		color: darkInk,
	});
	page.drawText(`Fecha de generación: ${formatDate(fecha)}`, {
		x: margin,
		y: pageHeight - 126,
		size: 9,
		font,
		color: mutedInk,
	});
	page.drawText(`Folio: ${folio}`, {
		x: pageWidth - margin - 170,
		y: pageHeight - 126,
		size: 9,
		font: bold,
		color: darkInk,
	});
	page.drawLine({
		start: { x: margin, y: pageHeight - 146 },
		end: { x: pageWidth - margin, y: pageHeight - 146 },
		thickness: 1,
		color: lineColor,
	});
	return pageHeight - 170;
}

function drawAssignment(
	context: PdfContext,
	asignadoA: string,
	y: number,
): number {
	const { page, font, bold } = context;
	page.drawText("Asignación", {
		x: margin,
		y,
		size: 11,
		font: bold,
		color: darkInk,
	});
	y -= 18;
	page.drawText(`Asignado a: ${asignadoA}`, {
		x: margin,
		y,
		size: 9,
		font,
		color: darkInk,
	});
	y -= 18;
	page.drawText(`Fecha de asignación: ${formatDate(new Date())}`, {
		x: margin,
		y,
		size: 9,
		font,
		color: mutedInk,
	});
	return y - 24;
}

function drawReason(context: PdfContext, motivo: string, y: number): number {
	const { page, font, bold } = context;
	page.drawText("Motivo general de baja", {
		x: margin,
		y,
		size: 11,
		font: bold,
		color: darkInk,
	});
	y -= 18;
	const lines = wrapText(motivo || "N/A", 78);
	page.drawRectangle({
		x: margin,
		y: y - lines.length * 12 - 10,
		width: pageWidth - margin * 2,
		height: lines.length * 12 + 18,
		borderColor: lineColor,
		borderWidth: 1,
		color: rgb(0.98, 0.99, 1),
	});
	lines.forEach((line, index) => {
		page.drawText(line, {
			x: margin + 10,
			y: y - index * 12,
			size: 9,
			font,
			color: darkInk,
		});
	});
	return y - lines.length * 12 - 34;
}

function drawAssetsTable(
	context: PdfContext,
	activos: Asset[],
	tipo: PdfKind,
	y: number,
): number {
	y = drawTableHeader(context, tipo, y);

	activos.forEach((asset, index) => {
		if (y < 132) {
			context.page = context.doc.addPage(PageSizes.A4);
			y = drawTableHeader(context, tipo, pageHeight - 56);
		}

		const row = [
			String(index + 1),
			asset.numeroSerie ?? "N/A",
			asset.nombre,
			asset.tipo,
			[asset.marca, asset.modelo].filter(Boolean).join(" / ") || "N/A",
			asset.status,
			asset.areaNombre ?? "N/A",
			asset.asignadoA ?? "N/A",
			tipo === "baja" ? "Según revisión" : asset.unidad,
		];

		drawTableRow(context, row, y);
		y -= 28;
	});

	return y - 18;
}

function drawTableHeader(
	context: PdfContext,
	tipo: PdfKind,
	y: number,
): number {
	const headers =
		tipo === "baja"
			? [
					"No.",
					"Serie",
					"Nombre",
					"Categoría",
					"Marca/Modelo",
					"Estado",
					"Área",
					"Asignado",
					"Condición",
				]
			: [
					"No.",
					"Serie",
					"Nombre",
					"Categoría",
					"Marca/Modelo",
					"Estado",
					"Área",
					"Asignado",
					"Unidad",
				];

	const { page, bold } = context;
	page.drawRectangle({
		x: margin,
		y: y - 7,
		width: pageWidth - margin * 2,
		height: 20,
		color: rgb(0.94, 0.98, 0.96),
	});
	headers.forEach((header, index) => {
		page.drawText(header, {
			x: columnX(index),
			y,
			size: 7,
			font: bold,
			color: darkInk,
		});
	});
	return y - 24;
}

function drawTableRow(context: PdfContext, row: string[], y: number): void {
	const { page, font } = context;
	page.drawLine({
		start: { x: margin, y: y - 8 },
		end: { x: pageWidth - margin, y: y - 8 },
		thickness: 0.5,
		color: lineColor,
	});
	row.forEach((cell, index) => {
		page.drawText(truncate(cell, columnMaxLength(index)), {
			x: columnX(index),
			y,
			size: 6.5,
			font,
			color: darkInk,
		});
	});
}

function drawSignatures(context: PdfContext, y: number): void {
	const { page, font } = context;
	const startY = Math.max(y - 18, 78);
	const columns = [
		{ label: "Responsable de entrega", x: margin },
		{ label: "Firma y sello", x: margin + 174 },
		{ label: "Recibido por", x: margin + 348 },
	];

	columns.forEach((column) => {
		page.drawLine({
			start: { x: column.x, y: startY },
			end: { x: column.x + 138, y: startY },
			thickness: 1,
			color: lineColor,
		});
		page.drawText(column.label, {
			x: column.x,
			y: startY - 14,
			size: 8,
			font,
			color: mutedInk,
		});
	});
}

function drawFooters(doc: PDFDocument, font: PDFFont): void {
	const pages = doc.getPages();
	pages.forEach((page, index) =>
		drawFooter(page, font, index + 1, pages.length),
	);
}

function drawFooter(
	page: PDFPage,
	font: PDFFont,
	pageNumber: number,
	totalPages: number,
): void {
	page.drawText("Documento generado por CAMAF Mayakoba", {
		x: margin,
		y: 24,
		size: 8,
		font,
		color: mutedInk,
	});
	page.drawText(`Página ${pageNumber} de ${totalPages}`, {
		x: pageWidth - margin - 86,
		y: 24,
		size: 8,
		font,
		color: mutedInk,
	});
}

function columnX(index: number): number {
	const positions = [40, 62, 118, 214, 282, 366, 416, 482, 532];
	return positions[index] ?? margin;
}

function columnMaxLength(index: number): number {
	const lengths = [3, 12, 20, 12, 16, 10, 12, 13, 10];
	return lengths[index] ?? 12;
}

function wrapText(text: string, maxLength: number): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let current = "";

	words.forEach((word) => {
		const next = current ? `${current} ${word}` : word;
		if (next.length > maxLength) {
			if (current) lines.push(current);
			current = word;
		} else {
			current = next;
		}
	});

	if (current) lines.push(current);
	return lines.length ? lines : ["N/A"];
}

function truncate(value: string, maxLength: number): string {
	return value.length > maxLength
		? `${value.slice(0, maxLength - 1)}...`
		: value;
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("es-MX", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
}

function formatDateForFile(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function downloadPdf(bytes: Uint8Array, filename: string): void {
	const arrayBuffer = bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
	const blob = new Blob([arrayBuffer], { type: "application/pdf" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
