// =============================================================
// LAB 2 - app.js - berjalan di BROWSER (Lengkap + Tantangan PR)
// =============================================================

// ---------- Pilih elemen ----------
const tbody = document.querySelector('#tabel-body');
const thead = document.querySelector('thead');
const form = document.querySelector('#form-mahasiswa');
const tombolSimpan = form.querySelector('button[type="submit"]');
const inputCari = document.querySelector('#cari');
const filterGrade = document.querySelector('#filter-grade');
const pesan = document.querySelector('#pesan');

let semuaData = [];       // hasil rekap (sudah ada nilaiAkhir, grade, lulus)
let urutKolom = null;     // nama kolom yang sedang diurutkan
let urutNaik = true;      // true = ascending (A-Z / kecil-besar), false = descending

// =============================================================
// LANGKAH 3a: ambil data dari API (api.js)
// =============================================================
async function muatData() {
  try {
    const daftar = await ambilMahasiswa();
    semuaData = buatRekap(daftar);
    tampilkan();
  } catch (err) {
    tampilkanPesan(`Gagal memuat data: ${err.message}`, 'error');
  }
}

// =============================================================
// TAMPILKAN: pencarian + filter grade + pengurutan kolom
// =============================================================
function tampilkan() {
  // 1. Filter berdasarkan kata kunci nama
  let hasil = cariMahasiswa(semuaData, inputCari.value);

  // 2. Filter berdasarkan dropdown grade (Tantangan 2)
  const gradeDipilih = filterGrade.value;
  if (gradeDipilih) {
    hasil = hasil.filter((m) => m.grade === gradeDipilih);
  }

  // 3. Urutkan berdasarkan kolom yang diklik (Tantangan 1)
  if (urutKolom) {
    hasil = [...hasil].sort((a, b) => {
      const valA = a[urutKolom];
      const valB = b[urutKolom];

      if (typeof valA === 'string') {
        return urutNaik ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'boolean') {
        return urutNaik ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }
      return urutNaik ? valA - valB : valB - valA;
    });
  }

  perbaruiIndikatorUrutan();
  renderTabel(hasil);
  renderStatistik(semuaData);
}

function perbaruiIndikatorUrutan() {
  for (const th of thead.querySelectorAll('th[data-kolom]')) {
    const teksDasar = th.textContent.replace(/ [▲▼]$/, '');
    if (th.dataset.kolom === urutKolom) {
      th.textContent = `${teksDasar} ${urutNaik ? '▲' : '▼'}`;
    } else {
      th.textContent = teksDasar;
    }
  }
}

// =============================================================
// LANGKAH 3b + TANTANGAN 4: tampilkan data, kolom status, & sorot tertinggi
// =============================================================
function renderTabel(data) {
  tbody.replaceChildren();

  if (data.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.textContent = 'Tidak ada data';
    td.classList.add('kosong');
    tr.append(td);
    tbody.append(tr);
    return;
  }

  const terbaik = cariTertinggi(semuaData);
  const nilaiMax = terbaik ? terbaik.nilaiAkhir : null;

  for (const m of data) {
    const tr = document.createElement('tr');
    tr.classList.add(m.lulus ? 'lulus' : 'tidak-lulus');

    // Sorot baris peraih nilai tertinggi
    if (nilaiMax !== null && m.nilaiAkhir === nilaiMax) {
      tr.classList.add('tertinggi');
    }

    const statusTeks = m.lulus ? 'Lulus' : 'Tidak';
    for (const isi of [m.nim, m.nama, m.tugas, m.uts, m.uas, m.nilaiAkhir, m.grade, statusTeks]) {
      const td = document.createElement('td');
      td.textContent = isi;
      tr.append(td);
    }

    // Tombol hapus
    const tdAksi = document.createElement('td');
    const tombol = document.createElement('button');
    tombol.textContent = 'Hapus';
    tombol.classList.add('btn-hapus');
    tombol.dataset.nim = m.nim;
    tdAksi.append(tombol);
    tr.append(tdAksi);

    tbody.append(tr);
  }
}

// =============================================================
// LANGKAH 4: statistik
// =============================================================
function renderStatistik(data) {
  document.querySelector('#stat-jumlah').textContent = data.length;
  const lulus = data.filter((m) => m.lulus).length;
  document.querySelector('#stat-lulus').textContent = `${lulus}/${data.length}`;
  document.querySelector('#stat-rata').textContent = hitungRataRata(data);

  const terbaik = cariTertinggi(data);
  document.querySelector('#stat-tertinggi').textContent = terbaik
    ? `${terbaik.nama} (${terbaik.nilaiAkhir})`
    : '-';

  document.querySelector('#stat-distribusi').textContent = Object.entries(hitungDistribusiGrade(data))
    .map(([grade, jumlah]) => `${grade}: ${jumlah}`)
    .join(' · ');
}

function tampilkanPesan(teks, jenis) {
  pesan.textContent = teks;
  pesan.className = jenis;
}

// =============================================================
// LANGKAH 5 & TANTANGAN 1-2: pencarian, filter grade, & klik urut kolom
// =============================================================
inputCari.addEventListener('input', () => {
  tampilkan();
});

filterGrade.addEventListener('change', () => {
  tampilkan();
});

thead.addEventListener('click', (event) => {
  const th = event.target.closest('th[data-kolom]');
  if (!th) return;

  const kolom = th.dataset.kolom;
  if (urutKolom === kolom) {
    urutNaik = !urutNaik;
  } else {
    urutKolom = kolom;
    urutNaik = true;
  }
  tampilkan();
});

// =============================================================
// LANGKAH 6 + TANTANGAN 3: tambah mahasiswa + status tombol Menyimpan...
// =============================================================
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const f = new FormData(form);
  const baru = {
    nim: f.get('nim').trim(),
    nama: f.get('nama').trim(),
    tugas: f.get('tugas') === '' ? NaN : Number(f.get('tugas')),
    uts: f.get('uts') === '' ? NaN : Number(f.get('uts')),
    uas: f.get('uas') === '' ? NaN : Number(f.get('uas')),
  };

  const errors = validasiMahasiswa(baru);
  if (errors.length > 0) {
    tampilkanPesan(errors.join(', '), 'error');
    return;
  }

  tombolSimpan.disabled = true;
  tombolSimpan.textContent = 'Menyimpan...';

  try {
    const hasil = await tambahMahasiswa(baru);
    const [r] = buatRekap([hasil]);
    tampilkanPesan(`${r.nama} tersimpan: nilai ${r.nilaiAkhir} (${r.grade})`, 'sukses');
    form.reset();
    await muatData();
  } catch (err) {
    tampilkanPesan(`Gagal menyimpan: ${err.message}`, 'error');
  } finally {
    tombolSimpan.disabled = false;
    tombolSimpan.textContent = 'Simpan';
  }
});

// =============================================================
// LANGKAH 7 (BONUS): hapus dengan event delegation
// =============================================================
tbody.addEventListener('click', async (event) => {
  const tombol = event.target.closest('.btn-hapus');
  if (!tombol) return;

  const nim = tombol.dataset.nim;
  if (!confirm(`Hapus mahasiswa ${nim}?`)) return;

  try {
    const teks = await hapusMahasiswa(nim);
    tampilkanPesan(teks, 'sukses');
    await muatData();
  } catch (err) {
    tampilkanPesan(`Gagal: ${err.message}`, 'error');
  }
});

// ---------- Mulai ----------
muatData();