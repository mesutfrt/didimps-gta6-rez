# 7/24 Yatay Masa Zaman Çizelgesi (Timeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Didim PlayStation salonundaki GTA VI rezervasyon sistemi için masa görünümünü 7/24 (00:00 - 24:00) yatay kaydırılabilir, tek zaman cetveline bağlı masa şeritleri (Gantt) olarak yapılandırmak; boş saate tıklandığında rezervasyon, dolu bloğa tıklandığında detay modalı açılmasını sağlamak.

**Architecture:** `lib/reservations.ts` dosyasında saat aralığı kısıtlaması 7/24'e genişletilir. `app/page.tsx` bileşeninde kapalı saat mantığı kaldırılır, 00:00 - 24:00 arası 24 saatlik yatay zaman şeridi, sol sütunda yapışkan (`sticky`) masa başlıkları ve tıklama aksiyonları (`openSlot` ve `showDetails`) bağlanır. `app/globals.css` ile mobil dokunmatik kaydırma ve blok stilleri iyileştirilir.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, Cloudflare Workers / D1 SQLite.

**Spec:** [docs/superpowers/specs/2026-11-18-table-timeline-design.md](file:///d:/GTA%206%20Rezervasyon/didim-arena/docs/superpowers/specs/2026-11-18-table-timeline-design.md)

## Global Constraints

- Node.js >= 22.13.0
- Çalışma saatleri 00:00 – 24:00 (7/24)
- Maksimum seans süresi 4 saat
- Seans gün sonunu (24:00) aşamaz (`hour + duration <= 24`)
- Geçmiş saatlere rezervasyon yapılamaz
- Masalar sol kolonda sabit kalmalıdır (`sticky left: 0`)

## Review Focus

- Gece yarısı ve erken saatler (00:00 - 06:00) rezervasyonu: Geçmiş gün/saat kontrolünün Türkiye saat diliminde (`Europe/Istanbul`) doğru çalışması.
- 23:00'da 2 saatlik seans seçilmeye çalışılması: Gün sonu sınırını (24:00) aştığı için engellenmesi.
- Ardışık dolu seanslar arasında kalan boşluk: Örneğin 14:00 ve 16:00 doluyken 15:00'a en fazla 1 saatlik rezervasyon açılması.
- Dolu bloğa dokunulduğunda doğru rezervasyon detayının modalda gösterilmesi ve iptal edilebilmesi.
- Mobilde yatay kaydırma sırasında masa başlıklarının kaybolmaması ve ekranın sağa-sola taşmaması.

---

### Task 1: Backend Validasyonu ve 7/24 Saat Kuralları

**Files:**
- Modify: `lib/reservations.ts`
- Test: `scripts/test-validation.mjs`

**Interfaces:**
- Consumes: `branches`, `validateBooking`, `clock`, `today`
- Produces: `hours = Array.from({length: 24}, (_, i) => i)`, `validateBooking` (0..23 saatleri destekleyen güncellenmiş doğrulama)

- [ ] **Step 1: Write the failing unit test for 7/24 validation in `scripts/test-validation.mjs`**

```javascript
import assert from 'node:assert/strict';
import { validateBooking, hours } from '../lib/reservations.js';

// hours must have 24 entries (0 to 23)
assert.equal(hours.length, 24);
assert.equal(hours[0], 0);
assert.equal(hours[23], 23);

// booking at 02:00 for tomorrow should be valid
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const validEarly = validateBooking({
  branch: 1, table: 1, date: tomorrow, hour: 2, duration: 2, name: 'Gece Oyuncusu', phone: '05551112233'
});
assert.equal(validEarly, null);

// booking starting at 23:00 for 2 hours exceeds midnight (25:00) -> invalid
const invalidLate = validateBooking({
  branch: 1, table: 1, date: tomorrow, hour: 23, duration: 2, name: 'Gecikmeli', phone: '05551112233'
});
assert.ok(invalidLate?.includes('24:00') || invalidLate !== null);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-validation.mjs`
Expected: FAIL (because `hours` length is 14 and `hour < 10` is rejected)

- [ ] **Step 3: Update `lib/reservations.ts` for 7/24 validation**

Update `hours` to length 24 (`i => i`), and update `validateBooking` to accept `b.hour >= 0 && b.hour <= 23 && b.hour + b.duration <= 24`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-validation.mjs`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/reservations.ts scripts/test-validation.mjs
git commit -m "feat(core): enable 7/24 slot validation and 24-hour range"
```

---

### Task 2: Masa Zaman Çizelgesi (Timeline) Bileşeninin 7/24 Düzenlenmesi ve Etkileşimleri

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `hours`, `branches`, `validateBooking`, `clock`, `today` from `lib/reservations.ts`
- Produces: 7/24 yatay kaydırılabilir masa zaman çizelgesi, `openSlot(table, hour)` boş slot tetikleyicisi, `showDetails(booking)` dolu blok modal tetikleyicisi, mevcut saate otomatik kaydırma.

- [ ] **Step 1: Update timeline state and render logic in `app/page.tsx`**

1. 24 saatlik gün döngüsü `dayHours = Array.from({length: 24}, (_, i) => i)`.
2. Kapalı saat kısıtını kaldır (`closed = false`).
3. `maximumDuration(t, h)`: `Math.min(4, 24 - h, ...active.filter(r => r.table_no === t && r.hour > h).map(r => r.hour - h))`.
4. Sayfa açıldığında veya bugün seçildiğinde timeline'ı otomatik olarak mevcut saate kaydır (`scrollLeft = Math.max(0, new Date().getHours() - 1) * 64`).
5. Her masa için tek satırda:
   - Boş saat dilimlerine tıklanınca `openSlot(table, hour)` çağrılır ve `bookingDialog` açılır.
   - Dolu saat bloklarına tıklanınca `showDetails(booking)` çağrılır ve `detailsDialog` açılır.
6. `detailsDialog` modalında: Ad Soyad, Telefon, Masa No, Seans aralığı, Toplam tutar ve "Rezervasyonu iptal et" butonu bulunur.

- [ ] **Step 2: Verify TypeScript types and build**

Run: `node scripts/run-framework.mjs build`
Expected: PASS with 0 build errors.

- [ ] **Step 3: Commit changes**

```bash
git add app/page.tsx
git commit -m "feat(ui): implement 24/7 horizontal timeline with slot & detail modals"
```

---

### Task 3: Mobil Dokunmatik Deneyimi ve Çizelge Stillerinin İyileştirilmesi

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: CSS selectors for `.timeline`, `.timeline-inner`, `.table-label`, `.time-slot`, `.reservation-block`, `.day-picker`, `dialog`.
- Produces: Akıcı yatay kaydırma, yapışkan masa sütunu, şık GTA VI / PlayStation koyu-açık kontrastı, yüksek dokunmatik hedef boyutları.

- [ ] **Step 1: Polish `.timeline` and `.reservation-block` styles in `app/globals.css`**

1. Zaman çizelgesi genişliğini 24 saat x 64px = 1536px (toplam 1616px) olarak netleştir.
2. Sol masa sütununu (`.table-label`) `position: sticky; left: 0; z-index: 3;` yaparak sağa kaydırırken masa isimlerinin ekranda sabit kalmasını sağla.
3. `.reservation-block`: Didim PlayStation koyu lacivert tonu (`#172d46`), hover efekti, beyaz belirgin yazı, kırpılmayan metin ve dokunma derinliği.
4. `.time-slot`: Boş saatlerde belirgin ızgara çizgileri, hover ve aktif dokunma rengi.
5. `dialog` (Rezervasyon ve Detay modalı): Temiz form alanları, net butonlar, mobil uyumlu padding ve kapatma butonu.

- [ ] **Step 2: Verify build and styling consistency**

Run: `node scripts/run-framework.mjs build`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add app/globals.css
git commit -m "style(timeline): polish horizontal scrolling, sticky table labels and reservation blocks"
```

---

### Task 4: Uçtan Uca Entegrasyon Testi ve Doğrulama

**Files:**
- Modify: `scripts/test-reservations.mjs`
- Test: `scripts/test-reservations.mjs`

- [ ] **Step 1: Update API integration test `scripts/test-reservations.mjs`**

1. Erken saat (örneğin 03:00) rezervasyonunun başarılı kaydedildiğini doğrula (artık 400 değil 201 dönmeli).
2. 23:00'da 2 saatlik rezervasyon denemesinin 400 döndüğünü doğrula (gece yarısını aştığı için).
3. Çakışma kontrolü (409 Conflict) ve iptal mekanizmasının çalıştığını doğrula.

- [ ] **Step 2: Run the full test suite**

Run: `node scripts/test-validation.mjs`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add scripts/test-reservations.mjs
git commit -m "test: update integration tests for 24/7 reservation behavior"
```
