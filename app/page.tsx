'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Gamepad2,
  CalendarDays,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Plus,
  Edit2,
  NotebookPen,
  Trash2,
} from 'lucide-react';
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
  note?: string;
  total: number;
  status: string;
};

type NoteItem = {
  id: string;
  content: string;
  created: string;
  status: string;
};

export default function Home() {
  const [branch, setBranch] = useState(1);
  const [date, setDate] = useState(today());
  const [hour, setHour] = useState(18);
  const [duration, setDuration] = useState(2);
  const [table, setTable] = useState<number | null>(null);
  const [view, setView] = useState<'plan' | 'bookings' | 'notes'>('plan');
  const [rows, setRows] = useState<Booking[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [cancel, setCancel] = useState<string | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);

  // Düzenleme durumu
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editTable, setEditTable] = useState(1);
  const [editDate, setEditDate] = useState(today());
  const [editHour, setEditHour] = useState(18);
  const [editDuration, setEditDuration] = useState(2);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNote, setEditNote] = useState('');

  // Hızlı rezervasyon (+) durumu
  const [quickBranch, setQuickBranch] = useState(1);
  const [quickTable, setQuickTable] = useState(1);
  const [quickDate, setQuickDate] = useState(today());
  const [quickHour, setQuickHour] = useState(18);
  const [quickDuration, setQuickDuration] = useState(2);

  const request = useRef(0);
  const bookingDialog = useRef<HTMLDialogElement>(null);
  const quickDialog = useRef<HTMLDialogElement>(null);
  const editDialog = useRef<HTMLDialogElement>(null);
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

  async function fetchNotes() {
    setNotesLoading(true);
    try {
      const r = await fetch('/api/notes');
      const data: any = await r.json();
      if (r.ok) setNotes(data);
    } catch {
      // sessizce geç
    } finally {
      setNotesLoading(false);
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
    } else if (view === 'notes') {
      fetchNotes();
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

  function openQuickAdd() {
    setQuickBranch(branch);
    setQuickTable(1);
    setQuickDate(date);
    setQuickHour(Math.min(20, Math.max(0, new Date().getHours())));
    setQuickDuration(2);
    setFormError('');
    quickDialog.current?.showModal();
  }

  function openEdit(r: Booking) {
    setEditingBooking(r);
    setEditTable(r.table_no);
    setEditDate(r.date);
    setEditHour(r.hour);
    setEditDuration(r.duration);
    setEditName(r.name);
    setEditPhone(r.phone);
    setEditNote(r.note || '');
    setFormError('');
    if (detailsDialog.current?.open) detailsDialog.current.close();
    editDialog.current?.showModal();
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
      (r.name + ' ' + r.phone + ' ' + (r.note || '')).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))
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
          note: form.get('note'),
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

  async function quickReserve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: quickBranch,
          table: quickTable,
          date: quickDate,
          hour: quickHour,
          duration: quickDuration,
          name: form.get('name'),
          phone: form.get('phone'),
          note: form.get('note'),
        }),
      });
      const data: any = await r.json();
      if (!r.ok) throw Error(data.error);
      quickDialog.current?.close();
      setNotice('Rezervasyon oluşturuldu.');
      if (quickDate === date && quickBranch === branch) {
        await refresh();
      } else {
        setDate(quickDate);
        setBranch(quickBranch);
      }
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingBooking) return;
    setBusy(true);
    setFormError('');
    try {
      const r = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBooking.id,
          branch: editingBooking.branch,
          table: editTable,
          date: editDate,
          hour: editHour,
          duration: editDuration,
          name: editName,
          phone: editPhone,
          note: editNote,
        }),
      });
      const data: any = await r.json();
      if (!r.ok) throw Error(data.error);
      editDialog.current?.close();
      setEditingBooking(null);
      setNotice('Rezervasyon başarıyla güncellendi.');
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

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setBusy(true);
    try {
      const r = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });
      if (!r.ok) throw Error('Not eklenemedi.');
      setNewNote('');
      await fetchNotes();
      setNotice('Not kaydedildi.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(id: string) {
    try {
      const r = await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw Error('Not silinemedi.');
      await fetchNotes();
    } catch (e) {
      setError((e as Error).message);
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
        <span className="game-label">GTA VI · Salon Yönetimi</span>
      </header>

      <main>
        <nav aria-label="Ana menü" className="main-nav">
          <button className={view === 'plan' ? 'active' : ''} onClick={() => setView('plan')}>
            <Gamepad2 size={18} /> Masa takvimi
          </button>
          <button className={view === 'bookings' ? 'active' : ''} onClick={() => setView('bookings')}>
            <CalendarDays size={18} /> Rezervasyonlar
          </button>
          <button className={view === 'notes' ? 'active' : ''} onClick={() => setView('notes')}>
            <NotebookPen size={18} /> Notlar {notes.length > 0 && <span className="badge-count">{notes.length}</span>}
          </button>
        </nav>

        <div className="intro">
          <h1>
            {view === 'plan' ? '7/24 Masa Planı' : view === 'bookings' ? 'Rezervasyonlar' : 'Salon Not Defteri'}
          </h1>
          <p>
            {view === 'plan'
              ? 'Boş saate dokunup rezervasyon açın. Dolu bloğa dokunarak düzenleyin veya inceleyin.'
              : view === 'bookings'
              ? 'Seçili şubenin kayıtları. Düzenleme veya iptal işlemini buradan da yapabilirsiniz.'
              : 'Vardiya notları, müşteri talepleri ve teknik hatırlatmalar.'}
          </p>
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

        {/* Notlar sekmesi hariç şube ve tarih seçimini göster */}
        {view !== 'notes' && (
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
        )}

        {view === 'plan' && (
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
                              {clock(r.hour)}–{clock(r.hour + r.duration)} {r.note ? `· 📝 ${r.note}` : ''}
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
            <p className="hint">Boş saate dokunarak rezervasyon yapın, dolu bloğa dokunarak düzenleyin veya inceleyin.</p>
          </section>
        )}

        {view === 'bookings' && (
          <section className="reservations">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Rezervasyon ara"
                placeholder="İsim, telefon veya not ara"
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
                  Masa {r.table_no} <span>·</span> {clock(r.hour)}–{clock(r.hour + r.duration)} ({r.duration} saat)
                </p>
                {r.note && <div className="reservation-note">📝 {r.note}</div>}
                <div className="reservation-bottom">
                  <a href={`tel:${r.phone.replace(/[^+\d]/g, '')}`}>{r.phone}</a>
                  <strong>{r.total} ₺</strong>
                  {r.status === 'confirmed' && (
                    <div className="booking-card-actions">
                      <button className="edit-btn" onClick={() => openEdit(r)}>
                        <Edit2 size={13} /> Düzenle
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setCancel(r.id);
                          setFormError('');
                          cancelDialog.current?.showModal();
                        }}
                      >
                        İptal et
                      </button>
                    </div>
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

        {view === 'notes' && (
          <section className="notes-section">
            <form onSubmit={addNote} className="note-form">
              <label htmlFor="note-input">Yeni Salon Notu / Hatırlatma</label>
              <textarea
                id="note-input"
                rows={3}
                required
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Örn: Masa 3'ün 2. kolu şarjda. Ahmet Bey saat 20:00'de PS5 için arayacak..."
              />
              <button disabled={busy} type="submit" className="primary note-submit">
                <Plus size={16} /> Not Ekle
              </button>
            </form>

            <div className="section-heading" style={{ marginTop: '28px' }}>
              <h2>Kayıtlı Notlar</h2>
              <span>{notes.length} not</span>
            </div>

            {notesLoading && <p className="hint">Notlar yükleniyor…</p>}

            <div className="notes-list">
              {notes.map((n) => (
                <div key={n.id} className="note-card">
                  <div className="note-header">
                    <span className="note-time">
                      {new Intl.DateTimeFormat('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(n.created))}
                    </span>
                    <button
                      className="note-delete"
                      onClick={() => deleteNote(n.id)}
                      aria-label="Notu sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="note-content">{n.content}</p>
                </div>
              ))}

              {!notesLoading && notes.length === 0 && (
                <div className="empty">
                  <NotebookPen size={30} />
                  <p>Henüz salon notu eklenmedi. Vardiya notlarınızı ve hatırlatmalarınızı buraya yazabilirsiniz.</p>
                </div>
              )}
            </div>
          </section>
        )}

        <footer>Şube, masa ve ücret bilgileri Didim PlayStation salonuna aittir.</footer>
      </main>

      {/* YÜZEN (+) BUTONU (Floating Action Button) */}
      <button className="fab" onClick={openQuickAdd} aria-label="Hızlı Rezervasyon Ekle" title="Hızlı Rezervasyon Ekle">
        <Plus size={26} />
      </button>

      {/* HIZLI REZERVASYON MODALI (FAB) */}
      <dialog ref={quickDialog} onCancel={(e) => { if (busy) e.preventDefault(); }} aria-labelledby="quick-title">
        <button className="close" disabled={busy} onClick={() => quickDialog.current?.close()} aria-label="Kapat">
          <X size={22} />
        </button>
        <h2 id="quick-title">Hızlı Rezervasyon</h2>
        <p className="summary">Gezinmeden doğrudan masa ve saat seçin.</p>
        <form onSubmit={quickReserve}>
          <div className="form-grid-2">
            <label>
              Şube
              <select value={quickBranch} onChange={(e) => setQuickBranch(Number(e.target.value))}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Masa
              <select value={quickTable} onChange={(e) => setQuickTable(Number(e.target.value))}>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((t) => (
                  <option key={t} value={t}>
                    Masa {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Tarih
            <input
              type="date"
              required
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
            />
          </label>

          <div className="form-grid-2">
            <label>
              Başlangıç Saati
              <select value={quickHour} onChange={(e) => setQuickHour(Number(e.target.value))}>
                {dayHours.map((h) => (
                  <option key={h} value={h}>
                    {clock(h)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Süre
              <select value={quickDuration} onChange={(e) => setQuickDuration(Number(e.target.value))}>
                {[1, 2, 3, 4].map((d) => (
                  <option key={d} value={d} disabled={quickHour + d > 24}>
                    {d} saat ({clock(quickHour)}–{clock(quickHour + d)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Ad soyad
            <input name="name" required minLength={2} maxLength={80} placeholder="Müşteri adı ve soyadı" />
          </label>

          <label>
            Telefon
            <input name="phone" type="tel" inputMode="tel" required placeholder="05xx xxx xx xx" />
          </label>

          <label>
            Rezervasyon Notu (Opsiyonel)
            <input name="note" placeholder="Örn: 2 kol, kulaklık, kapora vb." />
          </label>

          <div className="total">
            <span>Salonda ödenecek</span>
            <strong>{branches.find((x) => x.id === quickBranch)!.price * quickDuration} ₺</strong>
          </div>

          {formError && (
            <p className="error" role="alert">
              {formError}
            </p>
          )}

          <button disabled={busy} className="primary" type="submit">
            {busy ? 'Kaydediliyor…' : 'Rezervasyonu Oluştur'} <Check size={18} />
          </button>
        </form>
      </dialog>

      {/* REZERVASYON DÜZENLEME MODALI */}
      <dialog ref={editDialog} onCancel={(e) => { if (busy) e.preventDefault(); }} aria-labelledby="edit-title">
        <button className="close" disabled={busy} onClick={() => editDialog.current?.close()} aria-label="Kapat">
          <X size={22} />
        </button>
        <h2 id="edit-title">Rezervasyonu Düzenle</h2>
        <p className="summary">Masa, saat veya misafir bilgilerini güncelleyin.</p>
        {editingBooking && (
          <form onSubmit={saveEdit}>
            <div className="form-grid-2">
              <label>
                Masa
                <select value={editTable} onChange={(e) => setEditTable(Number(e.target.value))}>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((t) => (
                    <option key={t} value={t}>
                      Masa {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tarih
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </label>
            </div>

            <div className="form-grid-2">
              <label>
                Başlangıç Saati
                <select value={editHour} onChange={(e) => setEditHour(Number(e.target.value))}>
                  {dayHours.map((h) => (
                    <option key={h} value={h}>
                      {clock(h)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Süre
                <select value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))}>
                  {[1, 2, 3, 4].map((d) => (
                    <option key={d} value={d} disabled={editHour + d > 24}>
                      {d} saat ({clock(editHour)}–{clock(editHour + d)})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Ad soyad
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </label>

            <label>
              Telefon
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                required
              />
            </label>

            <label>
              Rezervasyon Notu
              <input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Örn: Kulaklık istendi, kapora vb."
              />
            </label>

            <div className="total">
              <span>Güncellenmiş Tutar</span>
              <strong>{branches.find((x) => x.id === editingBooking.branch)!.price * editDuration} ₺</strong>
            </div>

            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}

            <button disabled={busy} className="primary" type="submit">
              {busy ? 'Güncelleniyor…' : 'Değişiklikleri Kaydet'} <Check size={18} />
            </button>
          </form>
        )}
      </dialog>

      {/* NORMAL BOŞ SLOT REZERVASYON MODALI */}
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
          <label>
            Not (Opsiyonel)
            <input name="note" placeholder="Örn: Ek kol, kapora alındı..." />
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

      {/* REZERVASYON DETAY MODALI */}
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
            {detail.note && (
              <div className="detail-note-box">
                <span className="field-label">Rezervasyon Notu</span>
                <p>{detail.note}</p>
              </div>
            )}
            <div className="total">
              <span>Toplam Ücret</span>
              <strong>{detail.total} ₺</strong>
            </div>
            <div className="dialog-actions">
              <button className="secondary" onClick={() => openEdit(detail)}>
                <Edit2 size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
                Düzenle
              </button>
              <button
                className="secondary detail-cancel"
                onClick={() => {
                  detailsDialog.current?.close();
                  setCancel(detail.id);
                  setFormError('');
                  cancelDialog.current?.showModal();
                }}
              >
                İptal et
              </button>
            </div>
          </>
        )}
      </dialog>

      {/* REZERVASYON İPTAL ONAY MODALI */}
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
