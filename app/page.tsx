'use client';
import { useEffect, useState, useRef } from 'react';
import { Gamepad2, CalendarDays, Check, X, ChevronLeft, ChevronRight, Search, Clock } from 'lucide-react';
import { branches, today, clock } from '../lib/reservations';

type Booking = {
  id: string;
  branch: number;
  table_no: number;
  date: string;
  hour: number;
  duration: number;
  name: string;
  phone: string;
  total: number;
  status: string;
};

export default function Home() {
  const [branch, setBranch] = useState(1);
  const [date, setDate] = useState(today());
  const [hour, setHour] = useState(18);
  const [duration, setDuration] = useState(2);
  const [table, setTable] = useState<number | null>(null);
  const [view, setView] = useState<'plan' | 'bookings'>('plan');
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [cancel, setCancel] = useState<string | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);

  const request = useRef(0);
  const bookingDialog = useRef<HTMLDialogElement>(null);
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const detailsDialog = useRef<HTMLDialogElement>(null);
  const timeline = useRef<HTMLDivElement>(null);

  const dayHours = Array.from({ length: 24 }, (_, i) => i);
  const current = branches.find((b) => b.id === branch)!;

  async function refresh() {
    const seq = ++request.current;
    setLoading(true);
    try {
      const r = await fetch(`/api/reservations?date=${date}`);
      const data: any = await r.json();
      if (seq !== request.current) return;
      if (!r.ok) throw Error(data.error);
      setRows(data);
      setError('');
    } catch (e) {
      if (seq === request.current) setError((e as Error).message);
    } finally {
      if (seq === request.current) setLoading(false);
    }
  }

  function scrollToCurrentHour(smooth = true) {
    if (!timeline.current) return;
    const currentHour = new Date().getHours();
    const targetHour = date === today() ? Math.max(0, currentHour - 1) : 10;
    timeline.current.scrollTo({ left: targetHour * 64, behavior: smooth ? 'smooth' : 'auto' });
  }

  useEffect(() => {
    setTable(null);
    refresh();
    return () => {
      request.current++;
    };
  }, [date]);

  useEffect(() => {
    setTable(null);
  }, [branch]);

  useEffect(() => {
    if (view === 'plan') {
      scrollToCurrentHour(false);
    }
  }, [view, date]);

  const active = rows.filter((r) => r.branch === branch && r.date === date && r.status === 'confirmed');

  const maximumDuration = (t: number, h: number) => {
    const laterBookings = active.filter((r) => r.table_no === t && r.hour > h).map((r) => r.hour - h);
    return Math.min(4, 24 - h, ...laterBookings);
  };

  function openSlot(t: number, h: number) {
    setTable(t);
    setHour(h);
    setDuration(Math.min(2, maximumDuration(t, h)));
    setFormError('');
    bookingDialog.current?.showModal();
  }

  function shiftDate(amount: number) {
    const d = new Date(date + 'T12:00:00+03:00');
    d.setUTCDate(d.getUTCDate() + amount);
    setDate(d.toISOString().slice(0, 10));
  }

  function showDetails(r: Booking) {
    setDetail(r);
    detailsDialog.current?.showModal();
  }

  const selected = rows.filter(
    (r) =>
      r.branch === branch &&
      r.date === date &&
      (r.name + ' ' + r.phone).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))
  );

  async function reserve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          table,
          date,
          hour,
          duration,
          name: form.get('name'),
          phone: form.get('phone'),
        }),
      });
      const data: any = await r.json();
      if (!r.ok) throw Error(data.error);
      bookingDialog.current?.close();
      setTable(null);
      setNotice('Rezervasyon kaydedildi.');
      await refresh();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking() {
    setBusy(true);
    setFormError('');
    try {
      const r = await fetch('/api/reservations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cancel }),
      });
      if (!r.ok) throw Error(((await r.json()) as { error: string }).error);
      cancelDialog.current?.close();
      setCancel(null);
      setNotice('Rezervasyon iptal edildi.');
      await refresh();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const formattedDateTitle = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date(date + 'T12:00:00+03:00'));

  return (
    <div className="app">
      <header>
        <a href="/" aria-label="Didim PlayStation ana sayfa">
          <img src="/didim-playstation.png" width="451" height="264" alt="Didim PlayStation" />
        </a>
        <span className="game-label">GTA VI · 7/24 Rezervasyon</span>
      </header>

      <main>
        <nav aria-label="Ana menü">
          <button className={view === 'plan' ? 'active' : ''} onClick={() => setView('plan')}>
            <Gamepad2 size={18} /> Masa takvimi
          </button>
          <button className={view === 'bookings' ? 'active' : ''} onClick={() => setView('bookings')}>
            <CalendarDays size={18} /> Rezervasyonlar
          </button>
        </nav>

        <div className="intro">
          <h1>{view === 'plan' ? '7/24 Masa Planı' : 'Rezervasyonlar'}</h1>
          <p>{view === 'plan' ? 'Boş saate dokun, rezervasyon oluştur. Dolu bloğa dokun, detayı gör.' : 'Seçili şubenin günlük kayıtları.'}</p>
        </div>

        {notice && (
          <div className="notice" role="status">
            <Check size={18} />
            {notice}
            <button onClick={() => setNotice('')} aria-label="Bildirimi kapat">
              <X size={18} />
            </button>
          </div>
        )}

        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={refresh}>Yeniden dene</button>
          </div>
        )}

        <section className="selection" aria-label="Şube ve zaman">
          <div className="field-label">Şube</div>
          <div className="branches">
            {branches.map((b) => (
              <button
                aria-pressed={branch === b.id}
                key={b.id}
                className={branch === b.id ? 'selected' : ''}
                onClick={() => setBranch(b.id)}
              >
                {b.name}
                {branch === b.id && <Check size={17} />}
              </button>
            ))}
          </div>

          <div className="day-picker">
            <button aria-label="Önceki gün" onClick={() => shiftDate(-1)}>
              <ChevronLeft size={21} />
            </button>
            <label>
              <span className="date-readable">{formattedDateTitle}</span>
              <input
                type="date"
                value={date}
                required
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </label>
            <button aria-label="Sonraki gün" onClick={() => shiftDate(1)}>
              <ChevronRight size={21} />
            </button>
          </div>
        </section>

        {view === 'plan' ? (
          <section className="schedule" aria-label="Günlük masa takvimi">
            <div className="schedule-heading">
              <div className="legend">
                <span>
                  <i />
                  Boş
                </span>
                <span>
                  <i className="booked" />
                  Dolu
                </span>
              </div>
              <span className="price-tag">{current.price} ₺ / saat · 7/24 Açık</span>
            </div>

            <div className="timeline" ref={timeline} tabIndex={0} aria-label="Saatleri görmek için yana kaydırın">
              <div className="timeline-inner">
                <div className="time-row">
                  <div className="table-label corner">Masa</div>
                  <div className="hour-labels">
                    {dayHours.map((h) => (
                      <span key={h}>{clock(h)}</span>
                    ))}
                    <span className="midnight">24:00</span>
                  </div>
                </div>

                {Array.from({ length: current.tables }, (_, i) => i + 1).map((t) => (
                  <div className="schedule-row" key={t}>
                    <div className="table-label">
                      <Gamepad2 size={18} />
                      <strong>Masa {t}</strong>
                    </div>

                    <div className="day-track">
                      {dayHours.map((h) => {
                        const reserved = active.some((r) => r.table_no === t && r.hour <= h && r.hour + r.duration > h);
                        const past = new Date(date + 'T' + clock(h) + ':00+03:00').getTime() <= Date.now();
                        return (
                          <button
                            key={h}
                            className={'time-slot ' + (past ? 'past-slot' : '')}
                            disabled={past || reserved || loading || !!error}
                            aria-label={`Masa ${t}, ${clock(h)}–${clock(h + 1)}, ${reserved ? 'dolu' : past ? 'geçmiş saat' : 'boş'}`}
                            onClick={() => openSlot(t, h)}
                          >
                            {!past && !reserved && !loading && !error && <span>+</span>}
                          </button>
                        );
                      })}

                      {active
                        .filter((r) => r.table_no === t)
                        .map((r) => (
                          <button
                            key={r.id}
                            className="reservation-block"
                            style={{ left: r.hour * 64 + 3, width: r.duration * 64 - 6 }}
                            onClick={() => showDetails(r)}
                            aria-label={`Masa ${t}, ${r.name}, ${clock(r.hour)}–${clock(r.hour + r.duration)}, detaylar`}
                          >
                            <strong>{r.name}</strong>
                            <small>
                              {clock(r.hour)}–{clock(r.hour + r.duration)}
                            </small>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="schedule-help">
              <span>← 00:00 – 24:00 Saatleri yana kaydırın →</span>
              <button onClick={() => scrollToCurrentHour(true)}>
                <Clock size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                Şu anki saate dön
              </button>
            </div>

            {loading && (
              <p className="hint" role="status">
                Rezervasyonlar yükleniyor…
              </p>
            )}
            <p className="hint">Boş saate dokunarak rezervasyon yapın, dolu bloğa dokunarak ayrıntıları inceleyin.</p>
          </section>
        ) : (
          <section className="reservations">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Rezervasyon ara"
                placeholder="İsim veya telefon ara"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="section-heading">
              <h2>Günün kayıtları</h2>
              <span>{selected.length} rezervasyon</span>
            </div>
            {selected.map((r) => (
              <article className={`reservation ${r.status === 'cancelled' ? 'cancelled' : ''}`} key={r.id}>
                <div className="reservation-top">
                  <strong>{r.name}</strong>
                  <span className="status">{r.status === 'confirmed' ? 'Onaylandı' : 'İptal edildi'}</span>
                </div>
                <p>
                  Masa {r.table_no} <span>·</span> {clock(r.hour)}–{clock(r.hour + r.duration)}
                </p>
                <div className="reservation-bottom">
                  <a href={`tel:${r.phone.replace(/[^+\d]/g, '')}`}>{r.phone}</a>
                  <strong>{r.total} ₺</strong>
                  {r.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        setCancel(r.id);
                        setFormError('');
                        cancelDialog.current?.showModal();
                      }}
                    >
                      İptal et
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!selected.length && (
              <div className="empty">
                <CalendarDays size={30} />
                <p>
                  {loading
                    ? 'Yükleniyor…'
                    : error
                    ? 'Kayıtlar alınamadı.'
                    : query
                    ? 'Eşleşen rezervasyon yok.'
                    : 'Bu tarihte rezervasyon yok.'}
                </p>
              </div>
            )}
          </section>
        )}

        <footer>Şube, masa ve ücret bilgileri Didim PlayStation salonuna aittir.</footer>
      </main>

      {/* Rezervasyon Ekleme Modalı */}
      <dialog ref={bookingDialog} onCancel={(e) => { if (busy) e.preventDefault(); }} aria-labelledby="booking-title">
        <button className="close" disabled={busy} onClick={() => bookingDialog.current?.close()} aria-label="Kapat">
          <X size={22} />
        </button>
        <h2 id="booking-title">Rezervasyonu tamamla</h2>
        <p className="summary">
          {current.name} · Masa {table}
          <br />
          {date} · {clock(hour)}–{clock(hour + duration)}
        </p>
        <form onSubmit={reserve}>
          <label>
            Süre
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[1, 2, 3, 4]
                .filter((d) => table && d <= maximumDuration(table, hour))
                .map((d) => (
                  <option key={d} value={d}>
                    {d} saat · {clock(hour)}–{clock(hour + d)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Ad soyad
            <input autoFocus autoComplete="name" name="name" required minLength={2} maxLength={80} placeholder="Adınız soyadınız" />
          </label>
          <label>
            Telefon
            <input autoComplete="tel" name="phone" type="tel" inputMode="tel" required placeholder="05xx xxx xx xx" />
          </label>
          <div className="total">
            <span>Salonda ödenecek</span>
            <strong>{current.price * duration} ₺</strong>
          </div>
          {formError && (
            <p className="error" role="alert">
              {formError}
            </p>
          )}
          <button disabled={busy} className="primary" type="submit">
            {busy ? 'Kaydediliyor…' : 'Rezervasyonu onayla'} <Check size={18} />
          </button>
        </form>
      </dialog>

      {/* Rezervasyon Detay Modalı */}
      <dialog ref={detailsDialog} aria-labelledby="detail-title">
        <button className="close" onClick={() => detailsDialog.current?.close()} aria-label="Detayı kapat">
          <X size={22} />
        </button>
        <h2 id="detail-title">Rezervasyon detayı</h2>
        {detail && (
          <>
            <p className="summary">
              {current.name} · Masa {detail.table_no}
              <br />
              {detail.date} · {clock(detail.hour)}–{clock(detail.hour + detail.duration)} ({detail.duration} saat)
            </p>
            <div className="detail-person">
              <strong>{detail.name}</strong>
              <a href={'tel:' + detail.phone.replace(/[^+\d]/g, '')}>{detail.phone}</a>
            </div>
            <div className="total">
              <span>Toplam Ücret</span>
              <strong>{detail.total} ₺</strong>
            </div>
            <button
              className="secondary detail-cancel"
              onClick={() => {
                detailsDialog.current?.close();
                setCancel(detail.id);
                setFormError('');
                cancelDialog.current?.showModal();
              }}
            >
              Rezervasyonu iptal et
            </button>
          </>
        )}
      </dialog>

      {/* Rezervasyon İptal Onay Modalı */}
      <dialog ref={cancelDialog} onCancel={(e) => { if (busy) e.preventDefault(); }} aria-labelledby="cancel-title">
        <h2 id="cancel-title">Rezervasyon iptal edilsin mi?</h2>
        <p className="summary">Masa yeniden diğer oyuncular için müsait olacak.</p>
        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}
        <div className="dialog-actions">
          <button className="secondary" disabled={busy} onClick={() => cancelDialog.current?.close()}>
            Vazgeç
          </button>
          <button className="primary" disabled={busy} onClick={cancelBooking}>
            {busy ? 'İptal ediliyor…' : 'İptal et'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
