# Ella Task Manager

Task manager sederhana dengan workflow automation engine. Dibangun menggunakan Bun + Hono (backend), React (frontend), dan PostgreSQL (database).

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Bun, Hono, Drizzle ORM |
| Frontend | React, Vite, Tailwind CSS |
| Database | PostgreSQL |
| Infrastructure | Docker, Docker Compose |

---

## Cara Setup dan Menjalankan Project

### Prasyarat
- Docker Desktop
- Bun (untuk development lokal)

### Opsi 1 — Docker (Direkomendasikan)

**Langkah 1 — Clone dan jalankan semua service:**
```bash
git clone https://github.com/yogabagaskurniawan/ella-assessment.git
cd ella-assessment
docker-compose up --build
```

**Langkah 2 — Jalankan migration database (hanya saat pertama kali):**
```bash
Get-Content backend/drizzle/0000_*.sql | docker exec -i ella-assessment-db-1 psql -U postgres -d ella_db
```

> Seed data otomatis dijalankan saat backend start. Tidak perlu dijalankan manual.

**Langkah 3 — Buka di browser:**
- Frontend: http://127.0.0.1:5173
- Backend API: http://127.0.0.1:3000

---

### Opsi 2 — Development Lokal

**Terminal 1 — Database:**
```bash
docker-compose up db
```

**Terminal 2 — Backend:**
```bash
cd backend
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

**Terminal 3 — Frontend:**
```bash
cd frontend
bun install
bun run dev
```

Buka http://localhost:5173

---

## Data Model Workflow

Workflow disimpan sebagai dokumen JSON di kolom `config` (tipe JSONB) di tabel `workflows`. Bentuknya seperti ini:

```json
{
  "trigger": "task.created",
  "steps": [
    {
      "id": "cek-priority",
      "type": "condition",
      "config": {
        "field": "priority",
        "operator": "gte",
        "value": 4
      },
      "nextOnTrue": "set-in-progress",
      "nextOnFalse": "log-queued"
    },
    {
      "id": "set-in-progress",
      "type": "action",
      "config": {
        "action": "setStatus",
        "value": "in_progress"
      },
      "next": null
    },
    {
      "id": "log-queued",
      "type": "action",
      "config": {
        "action": "appendLog",
        "template": "queued: {{task.title}}"
      },
      "next": null
    }
  ]
}
```

### Building Blocks Workflow

**Trigger** — kapan workflow dijalankan:
| Trigger | Keterangan |
|---|---|
| `task.created` | Jalan ketika task baru dibuat |
| `task.updated` | Jalan ketika task diupdate |

**Condition step** — mengevaluasi kondisi boolean:
| Field | Keterangan |
|---|---|
| `field` | Field task yang dicek: `priority`, `status`, `metadata.tags` |
| `operator` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains` |
| `value` | Nilai yang dibandingkan |
| `nextOnTrue` | ID step berikutnya kalau kondisi terpenuhi |
| `nextOnFalse` | ID step berikutnya kalau kondisi tidak terpenuhi |

**Action step** — mengubah task:
| Action | Keterangan |
|---|---|
| `setStatus` | Ubah status task: `todo`, `in_progress`, `done` |
| `setPriority` | Ubah priority task (1-5) |
| `appendLog` | Tambah pesan ke `metadata.logs` dengan interpolasi template |

Template interpolation yang didukung: `{{task.title}}`, `{{task.priority}}`, `{{task.status}}`, `{{task.updatedAt}}`

---

## Cara Engine Menjalankan Workflow

Ketika task dibuat atau diupdate, engine bekerja seperti ini:

```
1. Ambil semua workflow yang aktif (enabled) dari database
2. Filter workflow yang triggernya cocok dengan event
3. Jalankan semua workflow yang cocok secara bersamaan (Promise.allSettled)

Untuk setiap workflow:
4. Mulai dari step pertama di array steps
5. Kalau type = condition:
   → evaluasi kondisi terhadap task
   → kalau true  : lanjut ke nextOnTrue
   → kalau false : lanjut ke nextOnFalse
6. Kalau type = action:
   → jalankan aksi (ubah task di database)
   → refresh state task (untuk step berikutnya)
   → lanjut ke next
7. Ulangi sampai tidak ada step berikutnya (null)
8. Simpan log eksekusi ke tabel workflow_executions
```

### Concurrency

Beberapa workflow yang cocok dengan event yang sama dijalankan secara bersamaan menggunakan `Promise.allSettled`. Artinya:
- Kalau satu workflow gagal, workflow lain tetap jalan
- Setiap workflow melihat state task setelah aksi-aksi sebelumnya dalam runnya sendiri
- Urutan eksekusi antar workflow yang berjalan bersamaan tidak dijamin

### Penanganan Kegagalan

- Step action yang gagal akan menghentikan workflow dan menyimpan eksekusi dengan `status: failure`
- Pesan error dari step yang gagal dicatat di log steps
- Step yang gagal terlihat di halaman Execution History
- Workflow yang gagal tidak membatalkan aksi-aksi yang sudah berhasil sebelumnya

---

## Skema Database

```
tasks
  id          serial primary key
  title       text not null
  status      enum(todo, in_progress, done)  default: todo
  priority    integer (1-5)                  default: 1
  metadata    jsonb  (menyimpan tags dan logs)
  created_at  timestamp
  updated_at  timestamp

workflows
  id          serial primary key
  name        text not null
  enabled     boolean                        default: true
  config      jsonb  (trigger + graph steps)
  created_at  timestamp
  updated_at  timestamp

workflow_executions
  id           serial primary key
  workflow_id  integer → workflows.id
  task_id      integer → tasks.id
  status       enum(success, failure)
  steps        jsonb  (log per step: input, output, error)
  ran_at       timestamp
```

---

## Workflow Builder

Builder menggunakan pendekatan **form-based** (bukan canvas atau drag-drop). Setiap step ditampilkan sebagai card dengan field yang menyesuaikan tipe stepnya:

- **Condition step** menampilkan: Field, Operator, Value (adaptif), path True, path False
- **Action step** menampilkan: Tipe aksi, Value (adaptif sesuai aksi), Step berikutnya

Field Value menyesuaikan konteks:
- Field `priority` → dropdown 1-5
- Field `status` → dropdown todo/in_progress/done
- Field `metadata.tags` → input teks bebas
- Action `setStatus` → dropdown status
- Action `setPriority` → dropdown 1-5
- Action `appendLog` → input teks dengan hint interpolasi

Builder juga menampilkan **preview JSON config secara real-time** sehingga bisa dilihat langsung struktur data yang akan tersimpan di database.

Pendekatan form-based dipilih karena:
- Lebih mudah diimplementasikan dengan benar
- Lebih mudah divalidasi (tidak ada koneksi menggantung, konfigurasi kosong)
- Cocok untuk alur linear dan branching
- Model mental langsung memetakan ke konfigurasi JSON yang tersimpan di database

---

## Asumsi dan Tradeoff

**Integer ID daripada UUID** — beralih ke serial integer untuk kemudahan debugging selama development. Di production, UUID lebih disarankan untuk menghindari ID yang bisa ditebak urutannya.

**Step berjalan sekuensial dalam satu workflow** — step dijalankan satu per satu, bukan paralel. Ini membuat eksekusi lebih mudah diprediksi dan di-debug, dengan konsekuensi throughput lebih rendah untuk workflow yang panjang.

**Tidak ada rollback saat gagal sebagian** — kalau step ke-3 dari 5 gagal, step 1-2 sudah mengubah task. Sistem production membutuhkan transaksi database atau compensating actions.

**Metadata sebagai JSONB** — tags dan logs disimpan di kolom `metadata` JSONB daripada tabel terpisah. Ini fleksibel tapi lebih sulit di-query dalam skala besar.

**Beberapa workflow berjalan bersamaan, steps sekuensial** — beberapa workflow berjalan bersamaan (`Promise.allSettled`) tapi setiap step dalam satu workflow berjalan sekuensial. Ini berarti dua workflow bisa konflik (misalnya, keduanya mencoba mengubah status task yang sama).

**Migration manual saat pertama kali di Docker** — migration tidak dijalankan otomatis di docker-compose karena bisa konflik kalau tabel sudah ada. Solusi yang lebih baik adalah menggunakan script yang mengecek apakah migration sudah dijalankan sebelumnya.

---

## Yang Akan Diperbaiki dengan Lebih Banyak Waktu

**Backend:**
- Tambahkan database transaction agar kegagalan workflow sebagian bisa di-rollback
- Tambahkan cycle detection di validasi workflow
- Jalankan migration otomatis saat docker-compose up tanpa konflik
- Tulis integration test untuk workflow engine

**Frontend:**
- Tambahkan drag-and-drop untuk mengubah urutan step di builder
- Pecah komponen lebih lanjut untuk meningkatkan keterbacaan kode

**Infrastructure:**
- Otomatisasi migration di docker-compose dengan pengecekan apakah sudah dijalankan
- Tambahkan environment variable validation saat startup

---

## Seed Data

Seed data otomatis dijalankan saat backend Docker start. Mencakup 5 workflow dan 3 task contoh:

**Workflows:**
1. **Auto Escalate** — priority 5 → set `in_progress` + log "Critical task started: ..."
2. **Tag-driven Priority (on create)** — tag `bug` → pastikan priority ≥ 4 saat task dibuat
3. **Tag-driven Priority (on update)** — tag `bug` → pastikan priority ≥ 4 saat task diupdate
4. **Smart Routing** — priority ≥ 4 → `in_progress`, selain itu → `todo` + log "queued: ..."
5. **Completion Tracking** — status berubah ke `done` → log waktu penyelesaian

**Tasks contoh:**
1. Server down! (priority 5, status in_progress)
2. Fix login bug (priority 4, tag: bug)
3. Update documentation (priority 2, status todo)

Untuk menjalankan seed manual:
```bash
cd backend
bun run db:seed
```

---

## Preview

### Halaman Task

![Preview tasks](https://github.com/yogabagaskurniawan/ella-assessment/blob/main/preview/tasks.png)

---

### Halaman Workflow

![Preview Workflows](https://github.com/yogabagaskurniawan/ella-assessment/blob/main/preview/workflows.png)

---

### Halaman Add / Update Workflow

![Preview edit](https://github.com/yogabagaskurniawan/ella-assessment/blob/main/preview/edit.png)

---