import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractPdfTextFromUrl } from '@/lib/crawler';
import { getSessionFromRequest } from '@/lib/session';
import { pdfExtractSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = pdfExtractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const extracted = await extractPdfTextFromUrl(parsed.data.url);
  const consultationId = typeof body.consultationId === 'string' ? body.consultationId : null;

  if (consultationId) {
    await prisma.document.create({
      data: {
        consultationId,
        url: parsed.data.url,
        fileName: parsed.data.fileName ?? null,
        extractedText: extracted.text
      }
    });

    await prisma.consultation.update({
      where: { id: consultationId },
      data: { pdfText: extracted.text }
    }).catch(() => undefined);
  }

  return NextResponse.json({ success: true, pages: extracted.pages, textLength: extracted.text.length });
}
