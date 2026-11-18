# Tasarım Belgesi: 7/24 Yatay Masa Zaman Çizelgesi (Timeline)

## 1. Amaç ve İhtiyaç
Didim PlayStation salonundaki GTA VI rezervasyon sistemi için masa görünümünü, kullanıcının el çizimine uygun olarak 00:00 - 24:00 (7/24) saatlerini kapsayan, yatay kaydırılabilir, tek bir ortak zaman cetveli üzerinde alt alta dizilmiş masa şeritleri (Gantt görünümü) şeklinde yapılandırmak.

## 2. Kapsam ve Kurallar
- **Hedefler:**
  - 00:00 - 24:00 kesintisiz 24 saatlik yatay zaman şeridi.
  - Masaların (`Masa 1` - `Masa 8`) sol sütunda sabitlenmesi (`sticky`).
  - Boş saat dilimlerine tıklanarak o saat için 1-4 saatlik rezervasyon oluşturma modalının açılması.
  - Dolu saat bloklarına tıklanarak misafir bilgileri, telefon, süre ve iptal butonunun bulunduğu detay modalının açılması.
  - Mevcut saate otomatik odaklanma ve "Şu anki saate dön" kısayolu.
  - Mobilde akıcı dokunmatik yatay kaydırma (`overflow-x: auto`, `-webkit-overflow-scrolling: touch`).
- **Kapsam Dışı (Non-Goals):**
  - Masa ekleme/çıkarma admin paneli (şube ve masa sayıları şimdilik konfigürasyondan yönetilir).
  - Online ödeme entegrasyonu (ödemeler salonda tahsil edilir).
- **Kısıtlamalar:**
  - Seanslar gün sınırını (24:00) aşamaz.
  - Geçmiş saatlere rezervasyon yapılamaz.

## 3. Seçilen Yaklaşım (Yaklaşım 1)
- **Yaklaşım 1 (Seçilen):** Ortak yatay 24 saatlik cetvel + her masa için kesintisiz saat şeridi. Dolu rezervasyonlar orantılı genişlikte dinamik renkli bloklar olarak ilgili saat aralığını kaplar.
- **Alternatif (Elendi - Bağımsız Masa Kartları):** Masaların birbiriyle eşzamanlı boş/dolu durumunun tek bakışta görülmesini engellediği için elendi.

## 4. Teknik Değişiklikler
1. **`lib/reservations.ts`:**
   - `hours`: 0..23 (24 saat).
   - `validateBooking`: Saat kontrolü `b.hour >= 0 && b.hour < 24` ve `b.hour + b.duration <= 24` olarak güncellenir (10:00 açılış saati kısıtı 7/24 için kaldırılır).
2. **`app/page.tsx`:**
   - 24 saatlik dilimler (0..23) aktif hale getirilir; `closed` kısıtı kaldırılır.
   - Boş slotlara tıklanarak `openSlot(t, h)` çağrısı.
   - Dolu bloklara tıklanarak `showDetails(booking)` çağrısı.
   - Sayfa ilk açıldığında veya tarih değiştiğinde bugünkü tarih ise mevcut saate otomatik scroll (`scrollLeft`).
3. **`app/globals.css`:**
   - 24 saatlik cetvel genişliği (24 x 64px = 1536px + 80px etiket = 1616px) ve mobil kaydırma optimizasyonu.
   - Dolu blokların tipografisi, kontrastı ve dokunmatik alan boyutları (minimum 44px dokunma yüksekliği).
   - "Şu anki saat" göstergesi veya hızlı odaklanma butonu.
