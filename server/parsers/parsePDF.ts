export interface PDFParseResult {
  text: string;
  numPages: number;
  lines: string[];
}

export async function parsePDFFile(buffer: Buffer): Promise<PDFParseResult> {
  // Use dynamic import for ESM compatibility with pdf-parse
  const pdfModule = await import('pdf-parse');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (pdfModule as any).default ?? pdfModule;
  const data = await pdfParse(buffer);
  const text: string = data.text ?? '';
  const lines = text
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean);

  return {
    text,
    numPages: data.numpages ?? 0,
    lines,
  };
}
