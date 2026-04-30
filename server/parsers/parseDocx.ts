import mammoth from "mammoth";

export interface DocxParseResult {
  text: string;
  html: string;
  lines: string[];
}

export async function parseDocxFile(buffer: Buffer): Promise<DocxParseResult> {
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);

  const text = textResult.value ?? '';
  const lines = text
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean);

  return {
    text,
    html: htmlResult.value ?? '',
    lines,
  };
}
