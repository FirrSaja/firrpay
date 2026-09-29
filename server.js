const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "123456"; // PIN Admin default, bisa diatur di environment variable Render

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');

// Helper baca/tulis database JSON sederhana
function getDb() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ transactions: [] }, null, 2));
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { transactions: [] };
    }
}

function saveDb(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API: Ambil semua transaksi (untuk Admin)
app.get('/api/transactions', (req, res) => {
    const db = getDb();
    res.json(db.transactions.reverse()); // Urutkan dari yang terbaru
});

// API: Buat transaksi baru (dari User)
app.post('/api/transactions', (req, res) => {
    const { jenis, nama, tujuan, nomor, nominal, adminFee, total } = req.body;
    if (!nama || !tujuan || !nomor || !nominal) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap!' });
    }

    const db = getDb();
    const newTx = {
        id: 'FP-' + Math.floor(100000 + Math.random() * 900000),
        jenis,
        nama,
        tujuan,
        nomor,
        nominal,
        adminFee,
        total,
        status: 'Pending', // Pending, Diproses, Selesai, Dibatalkan
        createdAt: new Date().toISOString()
    };

    db.transactions.push(newTx);
    saveDb(db);
    res.json({ success: true, data: newTx });
});

// API: Update Status Transaksi (Khusus Admin)
app.put('/api/transactions/:id', (req, res) => {
    const { status, pin } = req.body;
    if (pin !== ADMIN_PIN) {
        return res.status(403).json({ success: false, message: 'PIN Admin Salah!' });
    }

    const db = getDb();
    const tx = db.transactions.find(t => t.id === req.params.id);
    if (!tx) {
        return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    tx.status = status;
    saveDb(db);
    res.json({ success: true, data: tx });
});

// API: Cek status berdasarkan Nama atau Nomor HP (Untuk User)
app.get('/api/track', (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    if (!query) return res.json([]);
    const db = getDb();
    const results = db.transactions.filter(t => 
        t.nama.toLowerCase().includes(query) || t.nomor.includes(query) || t.id.toLowerCase().includes(query)
    );
    res.json(results);
});

app.listen(PORT, () => {
    console.log(`Server Firr Pay aktif di port ${PORT}`);
});