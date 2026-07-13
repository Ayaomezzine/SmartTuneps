import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProductCatalog } from '@/lib/product-catalog';
import { getSessionFromRequest } from '@/lib/session';

const ALLOWED = new Set(['.csv', '.xlsx', '.xls']);

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Catalog file is required' }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: 'Only CSV/XLSX/XLS files are accepted' }, { status: 400 });
  }

  const targetDir = path.join(process.cwd(), 'data', 'catalog');
  await mkdir(targetDir, { recursive: true });

  const safeBaseName = path.basename(file.name).replace(/[^a-zA-Z0-9_.-]+/g, '-');
  const targetPath = path.join(targetDir, `${Date.now()}-${safeBaseName}`);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, bytes);

  const records = await getProductCatalog();
  return NextResponse.json({ success: true, file: safeBaseName, productCount: records.length });
}
