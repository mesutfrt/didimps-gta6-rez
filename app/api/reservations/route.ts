import { env } from 'cloudflare:workers';
import { branches, validateBooking } from '../../../lib/reservations';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function guard(req: Request, write = false) {
  if (write) {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) {
      return json({ error: 'Geçersiz istek origin.' }, 403);
    }
  }
  if (!env.DB) return json({ error: 'Veritabanına bağlanılamadı.' }, 503);
  return null;
}

export async function GET(req: Request) {
  const error = await guard(req);
  if (error) return error;

  const date = new URL(req.url).searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: 'Tarih gerekli.' }, 400);
  }

  const data = await env.DB!.prepare('SELECT * FROM bookings WHERE date = ? ORDER BY hour, table_no').bind(date).all();
  return json(data.results);
}

export async function POST(req: Request) {
  const error = await guard(req, true);
  if (error) return error;

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Geçersiz veri.' }, 400);
  }

  if (!b || typeof b !== 'object') return json({ error: 'Geçersiz veri.' }, 400);

  const invalid = validateBooking(b);
  if (invalid) return json({ error: invalid }, 400);

  const id = crypto.randomUUID();
  const db = env.DB!;
  const total = branches.find((x) => x.id === b.branch)!.price * b.duration;
  const note = typeof b.note === 'string' ? b.note.trim() : '';

  try {
    await db.batch([
      db
        .prepare(
          'INSERT INTO bookings (id,branch,table_no,date,hour,duration,name,phone,note,total,status,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )
        .bind(id, b.branch, b.table, b.date, b.hour, b.duration, b.name.trim(), b.phone, note, total, 'confirmed', new Date().toISOString()),
      ...Array.from({ length: b.duration }, (_, i) =>
        db
          .prepare('INSERT INTO slots (id,booking,branch,table_no,date,hour) VALUES (?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), id, b.branch, b.table, b.date, b.hour + i)
      ),
    ]);
    return json({ id, total }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE constraint')) {
      return json({ error: 'Bu masa seçilen saatlerde dolu. Başka bir masa seçin.' }, 409);
    }
    return json({ error: 'Rezervasyon kaydedilemedi. Tekrar deneyin.' }, 500);
  }
}

export async function PATCH(req: Request) {
  const error = await guard(req, true);
  if (error) return error;

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Geçersiz veri.' }, 400);
  }

  if (!b || typeof b?.id !== 'string') return json({ error: 'Rezervasyon ID gerekli.' }, 400);

  const invalid = validateBooking(b);
  if (invalid) return json({ error: invalid }, 400);

  const db = env.DB!;
  const note = typeof b.note === 'string' ? b.note.trim() : '';
  const total = branches.find((x) => x.id === b.branch)!.price * b.duration;

  try {
    await db.batch([
      // 1. Delete previous slots for this booking
      db.prepare('DELETE FROM slots WHERE booking=?').bind(b.id),
      // 2. Insert new slots (fails with UNIQUE constraint if another booking already holds this slot)
      ...Array.from({ length: b.duration }, (_, i) =>
        db
          .prepare('INSERT INTO slots (id,booking,branch,table_no,date,hour) VALUES (?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), b.id, b.branch, b.table, b.date, b.hour + i)
      ),
      // 3. Update bookings record
      db
        .prepare(
          'UPDATE bookings SET branch=?, table_no=?, date=?, hour=?, duration=?, name=?, phone=?, note=?, total=? WHERE id=?'
        )
        .bind(b.branch, b.table, b.date, b.hour, b.duration, b.name.trim(), b.phone, note, total, b.id),
    ]);
    return json({ ok: true, id: b.id, total });
  } catch (e) {
    if (String(e).includes('UNIQUE constraint')) {
      return json({ error: 'Bu masa seçilen saatlerde dolu. Başka bir masa veya saat seçin.' }, 409);
    }
    return json({ error: 'Rezervasyon güncellenemedi.' }, 500);
  }
}

export async function DELETE(req: Request) {
  const error = await guard(req, true);
  if (error) return error;

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Geçersiz veri.' }, 400);
  }

  if (typeof b?.id !== 'string') return json({ error: 'Rezervasyon gerekli.' }, 400);

  const db = env.DB!;
  await db.batch([
    db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").bind(b.id),
    db.prepare('DELETE FROM slots WHERE booking=?').bind(b.id),
  ]);
  return json({ ok: true });
}
