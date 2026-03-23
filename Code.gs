const TEMPLATE_ID = 'YOUR_TEMPLATE_SPREADSHEET_ID_HERE'; 
const CENTRAL_DB_ID = 'YOUR_CENTRAL_DATABASE_ID_HERE';  // ID Spreadsheet Pusatmu
const FOLDER_NAME = 'Note_Key_Databases';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Note_Key')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- FITUR PENCATATAN USER PUSAT ---
function catatPenggunaPusat(email, namaUsaha) {
  try {
    const ssPusat = SpreadsheetApp.openById(CENTRAL_DB_ID);
    const sheet = ssPusat.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    let barisIndex = -1;
    for(let i=0; i<data.length; i++) {
      if(data[i][1] === email) { barisIndex = i + 1; break; }
    }
    if (barisIndex === -1) {
      sheet.appendRow([new Date(), email, namaUsaha || "User Baru", "Aktif"]);
    } else if (namaUsaha) {
      sheet.getRange(barisIndex, 3).setValue(namaUsaha);
    }
  } catch (e) { console.log("Catat Pusat Error: " + e.message); }
}

function setupUserDatabase() {
  const userEmail = Session.getEffectiveUser().getEmail();
  
  // 1. TAMBAHKAN PENGUNCI (LOCK SERVICE)
  const lock = LockService.getUserLock();
  try {
    // Tunggu maksimal 30 detik jika ada proses lain yang sedang berjalan
    lock.waitLock(30000); 
  } catch (e) {
    console.log('Terlalu lama menunggu kunci: ' + e.toString());
  }

  try {
    catatPenggunaPusat(userEmail);
    
    const drive = DriveApp;
    let folders = drive.getFoldersByName(FOLDER_NAME);
    let parentFolder = folders.hasNext() ? folders.next() : drive.createFolder(FOLDER_NAME);
    
    const fileName = 'Note_Key_DB_' + userEmail;
    let files = parentFolder.getFilesByName(fileName);
    let ss;

    if (files.hasNext()) {
      // Jika file sudah ada, pakai yang paling pertama ditemukan
      ss = SpreadsheetApp.openById(files.next().getId());
    } else {
      // Jika benar-benar belum ada, baru buat salinan dari template
      ss = SpreadsheetApp.openById(drive.getFileById(TEMPLATE_ID).makeCopy(fileName, parentFolder).getId());
      DriveApp.getFileById(ss.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    
    if (!ss.getSheetByName('Notifikasi')) ss.insertSheet('Notifikasi').appendRow(['Tanggal', 'Pesan', 'Status']);
    
    return ss.getId();

  } finally {
    // 2. LEPASKAN PENGUNCI
    lock.releaseLock();
  }
}

// --- FUNGSI PROFIL & QRIS ---
function simpanProfilBisnis(data) {
  const ss = SpreadsheetApp.openById(setupUserDatabase());
  const sheet = ss.getSheetByName('Profil');
  const existingQRIS = sheet.getRange(2, 6).getValue();
  sheet.clearContents();
  sheet.appendRow(['Nama Lengkap', 'Nama Usaha', 'Alamat', 'Email', 'No Telp', 'ID_QRIS']);
  sheet.appendRow([data.namaLengkap, data.namaUsaha, data.alamat, data.emailBisnis, data.noTelp, existingQRIS]);
  
  // Update nama usaha di database pusat
  catatPenggunaPusat(Session.getEffectiveUser().getEmail(), data.namaUsaha);
  
  return "Profil Berhasil Disimpan!";
}

// ... (Fungsi uploadQRIS, ambilProfilBisnis, ambilAnalisisBisnis, dsb tetap sama seperti Code Fix 4) ...
// (Saya ringkas untuk efisiensi, pastikan sisanya tetap ada di file Anda)

function ambilProfilBisnis() {
  try {
    const ss = SpreadsheetApp.openById(setupUserDatabase());
    const r = ss.getSheetByName('Profil').getRange(2, 1, 1, 6).getValues()[0];
    return { namaLengkap: r[0], namaUsaha: r[1], alamat: r[2], emailBisnis: r[3], noTelp: r[4], qrisId: r[5] };
  } catch (e) { return null; }
}

function uploadQRIS(obj) {
  try {
    const parent = DriveApp.getFoldersByName(FOLDER_NAME).next();
    const bytes = Utilities.base64Decode(obj.imageContent.split(",")[1]);
    const file = parent.createFile(Utilities.newBlob(bytes, "image/png", "QRIS_USER"));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const ss = SpreadsheetApp.openById(setupUserDatabase());
    ss.getSheetByName('Profil').getRange(2, 6).setValue(file.getId());
    return { status: "success", msg: "QRIS Berhasil Diperbarui!" };
  } catch (e) { return { status: "error", msg: e.toString() }; }
}

function ambilAnalisisBisnis() {
  try {
    const ss = SpreadsheetApp.openById(setupUserDatabase());
    const values = ss.getSheetByName('Transaksi_Harian').getDataRange().getValues();
    if (values.length <= 1) return { terlaris: "(none)", saran: "Mulai transaksi minggu ini!" };
    const sekarang = new Date();
    const awalMinggu = new Date(sekarang.setDate(sekarang.getDate() - sekarang.getDay()));
    awalMinggu.setHours(0,0,0,0);
    let counts = {};
    let adaData = false;
    values.slice(1).forEach(row => {
      const tglTx = new Date(row[0]);
      if (tglTx >= awalMinggu) {
        counts[row[3]] = (counts[row[3]] || 0) + Number(row[5]);
        adaData = true;
      }
    });
    if (!adaData) return { terlaris: "(none)", saran: "Belum ada produk terlaris minggu ini." };
    const best = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    return { terlaris: best, saran: `Produk ${best} paling laku minggu ini!` };
  } catch (e) { return { terlaris: "(none)", saran: "-" }; }
}

function ambilDaftarBarang() {
  const ss = SpreadsheetApp.openById(setupUserDatabase());
  const data = ss.getSheetByName('Master_Barang').getDataRange().getValues();
  return data.length <= 1 ? [] : data.slice(1).map(row => ({
    nama: row[1], harga: row[2], stok: row[3], fotoUrl: row[4], fileId: row[5]
  }));
}

function uploadProduk(obj) {
  try {
    const drive = DriveApp;
    let folders = drive.getFoldersByName(FOLDER_NAME);
    let parentFolder = folders.hasNext() ? folders.next() : drive.createFolder(FOLDER_NAME);
    
    const bytes = Utilities.base64Decode(obj.imageContent.split(",")[1]);
    const file = parentFolder.createFile(Utilities.newBlob(bytes, obj.contentType, obj.imageName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const url = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w400";
    const ss = SpreadsheetApp.openById(setupUserDatabase());
    const sheet = ss.getSheetByName('Master_Barang');
    
    // Tambahkan data
    sheet.appendRow([new Date(), obj.namaProduk, obj.hargaProduk, obj.stokProduk, url, file.getId()]);
    
    // PAKSA GOOGLE UNTUK MENYIMPAN DATA DETIK INI JUGA
    SpreadsheetApp.flush(); 
    
    return "Barang Berhasil Ditambahkan!";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function hapusProduk(nama, id) {
  const ss = SpreadsheetApp.openById(setupUserDatabase());
  const sheet = ss.getSheetByName('Master_Barang');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === nama) { sheet.deleteRow(i + 1); break; }
  }
  if (id) try { DriveApp.getFileById(id).setTrashed(true); } catch(e){}
  return "Terhapus";
}

function prosesDataDariHTML(data) {
  const ss = SpreadsheetApp.openById(setupUserDatabase());
  const sheetTx = ss.getSheetByName('Transaksi_Harian');
  const qty = Number(data.jumlah);
  const price = Number(data.harga_satuan);
  sheetTx.appendRow([new Date(), Session.getEffectiveUser().getEmail(), "P-Auto", data.nama_produk, "Umum", qty, price, qty * price, data.metode_pembayaran]);
  const sheetBarang = ss.getSheetByName('Master_Barang');
  const dataB = sheetBarang.getDataRange().getValues();
  for (let i = 1; i < dataB.length; i++) {
    if (dataB[i][1] == data.nama_produk) {
      sheetBarang.getRange(i + 1, 4).setValue(Number(dataB[i][3]) - qty);
      break;
    }
  }
  return "Sukses";
}

function ambilDataLaporan() {
  const ss = SpreadsheetApp.openById(setupUserDatabase());
  const values = ss.getSheetByName('Transaksi_Harian').getDataRange().getValues();
  if (values.length <= 1) return [];
  const tglHariIni = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  return values.slice(1).reverse().map(row => {
    const tglObj = new Date(row[0]);
    const tglStr = Utilities.formatDate(tglObj, "GMT+7", "dd/MM/yyyy");
    return {
      tglMs: tglObj.getTime(),
      tglStr: tglStr,
      isHariIni: (tglStr === tglHariIni),
      bulan: tglObj.getMonth() + 1,
      tahun: tglObj.getFullYear(),
      produk: row[3],
      total: Number(row[7]),
      metode: row[8],
      qty: row[5]
    };
  });
}
