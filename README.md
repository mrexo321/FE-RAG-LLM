# Insurance RAG — Frontend

Frontend minimalis (Next.js App Router + Tailwind + shadcn/ui + TanStack Query)
untuk endpoint RAG `POST /api/v1/insurance-rag/ask` di backend Spring Boot
`insurance-rag`.

## Menjalankan

```bash
npm install
cp .env.local.example .env.local   # sesuaikan NEXT_PUBLIC_API_BASE_URL jika perlu
npm run dev
```

Buka http://localhost:3000. Pastikan backend Spring Boot sudah berjalan
(default di `http://localhost:8080`) dan CORS mengizinkan origin
`http://localhost:3000` (lihat catatan di bawah).

## Struktur

```
app/
  layout.tsx        Root layout, font, QueryClientProvider
  page.tsx           Halaman utama: form pertanyaan + jawaban
  providers.tsx       Wrapper TanStack QueryClient
  globals.css         Design tokens (warna, radius) untuk shadcn/ui
components/
  ui/                 Komponen dasar shadcn/ui (button, textarea, card, ...)
  rag/
    ask-form.tsx       Input pertanyaan + contoh pertanyaan
    answer-card.tsx    Render jawaban LLM
    source-list.tsx    Daftar referensi/sitasi pasal
    status-indicator.tsx  Indikator koneksi ke backend (/health)
lib/
  api.ts              Service layer: fetch ke backend (askQuestion, getHealth)
  format-answer.tsx    Render ringan **bold** dari jawaban LLM
  utils.ts             Helper cn() untuk className
hooks/
  use-ask.ts          useMutation TanStack Query untuk POST /ask
  use-health.ts        useQuery TanStack Query untuk GET /health
types/
  rag.ts              Tipe AskRequest/AskResponse, sinkron dengan DTO backend
```

## Menghubungkan ke backend

Service layer (`lib/api.ts`) membaca base URL dari
`NEXT_PUBLIC_API_BASE_URL` (lihat `.env.local.example`). Tidak ada logic
lain yang perlu diubah kalau backend berjalan di host/port berbeda — cukup
ubah env var itu.

**CORS**: karena frontend (port 3000) dan backend (port 8080) berbeda origin,
tambahkan `@CrossOrigin` di `InsuranceRagController` atau konfigurasi
`CorsConfigurationSource` global di Spring Boot agar mengizinkan origin
`http://localhost:3000` untuk method GET/POST.

## Menambah komponen shadcn/ui lain

`components.json` sudah disiapkan, jadi kalau butuh komponen lain (misalnya
`toast` atau `dialog`), bisa langsung:

```bash
npx shadcn@latest add toast
```

## Kenapa TanStack Query, bukan fetch langsung di komponen

- `useAsk` (mutation) menangani state `isPending`/`isError`/`data` untuk
  endpoint `POST /ask` tanpa state manual.
- `useHealth` (query) melakukan polling ringan ke `/health` setiap 30 detik
  untuk indikator koneksi di header.
- Kalau nanti menambah endpoint lain (`/ingest`, `/upload-pdf`, `/corpus`),
  tinggal tambah hook baru di `hooks/` yang memanggil fungsi baru di
  `lib/api.ts` — polanya konsisten.
