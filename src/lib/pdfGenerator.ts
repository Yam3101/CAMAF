// CAMAF — PDF Generator — genera actas de alta y baja de activos fijos.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Asset, User } from "../types";

const pageWidth = 842;
const pageHeight = 595;
const margin = 36;
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
	pageNumber: number;
};

export async function generarPDFAlta(
	activos: Asset[],
	usuario?: User,
): Promise<void> {
	await generarActa({
		tipo: "alta",
		titulo: "ACTA DE ALTA DE ACTIVOS FIJOS",
		activos,
		usuario,
	});
}

export async function generarPDFBaja(
	activos: Asset[],
	motivo: string,
	usuario?: User,
): Promise<void> {
	await generarActa({
		tipo: "baja",
		titulo: "ACTA DE BAJA DE ACTIVOS FIJOS",
		activos,
		motivo,
		usuario,
	});
}

async function generarActa({
	tipo,
	titulo,
	activos,
	motivo,
	usuario,
}: {
	tipo: PdfKind;
	titulo: string;
	activos: Asset[];
	motivo?: string;
	usuario?: User;
}) {
	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const bold = await doc.embedFont(StandardFonts.HelveticaBold);
	const context: PdfContext = {
		doc,
		page: doc.addPage([pageWidth, pageHeight]),
		font,
		bold,
		pageNumber: 1,
	};

	const fecha = new Date();
	const folio = `${tipo.toUpperCase()}-${fecha.getTime()}`;
	let y = drawHeader(context, titulo, folio, fecha);

	if (usuario) {
		y = drawAssignment(context, usuario, y);
	}

	if (motivo) {
		y = drawReason(context, motivo, y);
	}

	y = drawAssetsTable(context, activos, tipo, y);
	drawSignatures(context, y);
	drawFooter(context);

	const bytes = await doc.save();
	downloadPdf(bytes, `${tipo}-activos-${formatDateForFile(fecha)}.pdf`);
}

function drawHeader(
	context: PdfContext,
	titulo: string,
	folio: string,
	fecha: Date,
): number {
	const { page, font, bold } = context;
	page.drawText("CAMAF", {
		x: margin,
		y: pageHeight - 48,
		size: 20,
		font: bold,
		color: headerGreen,
	});
	page.drawText("Mayakoba - Control de Activos", {
		x: margin,
		y: pageHeight - 68,
		size: 10,
		font,
		color: mutedInk,
	});
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

function drawAssignment(context: PdfContext, usuario: User, y: number): number {
	const { page, font, bold } = context;
	page.drawText("Asignación", { x: margin, y, size: 11, font: bold, color: darkInk });
	y -= 18;
	page.drawText(`Asignado a: ${usuario.nombre}`, {
		x: margin,
		y,
		size: 9,
		font,
		color: darkInk,
	});
	page.drawText(`Rol: ${usuario.rol}    Área: ${usuario.areaNombre ?? "N/A"}`, {
		x: margin + 280,
		y,
		size: 9,
		font,
		color: darkInk,
	});
	y -= 16;
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
	const lines = wrapText(motivo || "N/A", 120);
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
		if (y < 118) {
			drawFooter(context);
			context.page = context.doc.addPage([pageWidth, pageHeight]);
			context.pageNumber += 1;
			y = drawTableHeader(context, tipo, pageHeight - 44);
		}

		const row = [
			String(index + 1),
			asset.numeroSerie ?? "N/A",
			asset.nombre,
			asset.tipo,
			[asset.marca, asset.modelo].filter(Boolean).join(" / ") || "N/A",
			asset.status,
			asset.areaNombre ?? "N/A",
			asset.fechaAdquisicion ?? "N/A",
			tipo === "baja" ? "Según revisión" : "N/A",
		];

		drawTableRow(context, row, y);
		y -= 24;
	});

	return y - 18;
}

function drawTableHeader(context: PdfContext, tipo: PdfKind, y: number): number {
	const headers =
		tipo === "baja"
			? ["No.", "Serie", "Nombre", "Categoría", "Marca/Modelo", "Estado", "Área", "Fecha", "Condición"]
			: ["No.", "Serie", "Nombre", "Categoría", "Marca/Modelo", "Estado", "Área", "Fecha", "Costo"];

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
		page.drawText(truncate(cell, index === 2 ? 22 : 16), {
			x: columnX(index),
			y,
			size: 7,
			font,
			color: darkInk,
		});
	});
}

function drawSignatures(context: PdfContext, y: number): void {
	const { page, font } = context;
	const startY = Math.max(y - 16, 58);
	const columns = [
		{ label: "Responsable de entrega", x: margin },
		{ label: "Firma y sello", x: margin + 260 },
		{ label: "Recibido por", x: margin + 520 },
	];

	columns.forEach((column) => {
		page.drawLine({
			start: { x: column.x, y: startY },
			end: { x: column.x + 190, y: startY },
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

function drawFooter(context: PdfContext): void {
	const { page, font } = context;
	page.drawText("Documento generado por CAMAF Mayakoba", {
		x: margin,
		y: 24,
		size: 8,
		font,
		color: mutedInk,
	});
	page.drawText(`Página ${context.pageNumber}`, {
		x: pageWidth - margin - 50,
		y: 24,
		size: 8,
		font,
		color: mutedInk,
	});
}

function columnX(index: number): number {
	const positions = [36, 60, 132, 248, 330, 442, 506, 610, 704];
	return positions[index] ?? margin;
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
	return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
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
