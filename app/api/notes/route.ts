import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  if (!env.DB) return json({ error: 'Veritabanına bağlanılamadı.' }, 503);
  try {
    const data = await env.DB.prepare('SELECT * FROM notes ORDER BY created DESC').all();
    return json(data.results);
  } catch (e) {
    return json({ error: 'Notlar alınamadı: ' + (e as Error).message }, 500);
  }
}

export async function POST(req: Request) {
  if (!env.DB) return json({ error: 'Veritabanına bağlanılamadı.' }, 503);

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Geçersiz veri.' }, 400);
  }

  if (!b || typeof b.content !== 'string' || !b.content.trim()) {
    return json({ error: 'Not içeriği boş olamaz.' }, 400);
  }

  const id = crypto.randomUUID();
  const created = new Date().toISOString();
  const content = b.content.trim();

  try {
    await env.DB.prepare('INSERT INTO notes (id, content, created, status) VALUES (?, ?, ?, ?)').bind(
      id,
      content,
      created,
      'active'
    ).run();
    return json({ id, content, created, status: 'active' }, 201);
  } catch (e) {
    return json({ error: 'Not kaydedilemedi: ' + (e as Error).message }, 500);
  }
}

export async function DELETE(req: Request) {
  if (!env.DB) return json({ error: 'Veritabanına bağlanılamadı.' }, 503);

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Geçersiz veri.' }, 400);
  }

  if (typeof b?.id !== 'string') return json({ error: 'Not ID gerekli.' }, 400);

  try {
    await env.DB.prepare('DELETE FROM notes WHERE id=?').bind(b.id).run();
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'Not silinemedi: ' + (e as Error).message }, 500);
  }
}
