export function normalizar(str: string): string {
	return str
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.replace(/[^A-Z0-9\s]/g, " ")
		.replace(/\s+/g, " ");
}

export function esSimilar(a: string, b: string, umbral = 0.75): boolean {
	const left = normalizar(a);
	const right = normalizar(b);
	if (!left || !right) return false;
	if (left === right) return true;

	const maxLength = Math.max(left.length, right.length);
	if (maxLength === 0) return true;

	const distance = levenshtein(left, right);
	const similarity = 1 - distance / maxLength;
	return similarity > umbral;
}

export function buscarSimilares(texto: string, lista: string[]): string[] {
	const normalizedText = normalizar(texto);
	if (!normalizedText) return [];

	return lista
		.map((item) => ({
			item,
			score: similarityScore(normalizedText, normalizar(item)),
		}))
		.filter(({ item, score }) => normalizar(item) !== normalizedText && score > 0.75)
		.sort((a, b) => b.score - a.score)
		.slice(0, 5)
		.map(({ item }) => item);
}

function similarityScore(a: string, b: string): number {
	if (!a || !b) return 0;
	if (a === b) return 1;
	return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

function levenshtein(a: string, b: string): number {
	const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
	const current = Array.from({ length: b.length + 1 }, () => 0);

	for (let i = 1; i <= a.length; i += 1) {
		current[0] = i;
		for (let j = 1; j <= b.length; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			current[j] = Math.min(
				current[j - 1] + 1,
				previous[j] + 1,
				previous[j - 1] + cost,
			);
		}
		for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
	}

	return previous[b.length];
}
