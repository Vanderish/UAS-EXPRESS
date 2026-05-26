import db from '../config/db.js';
import QRCode from 'qrcode';

const getParticipantsByRoomId = async (req, res) => {
    const { room_id } = req.params;

    try {
        const [participants] = await db.execute('SELECT * FROM peserta WHERE room_id = ?', [room_id]);
        res.status(200).json({ participants });
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
}

const addParticipant = async (req, res) => {
    const { nama_peserta } = req.body;
    const { room_id } = req.params; 

    try {
        if (!nama_peserta || nama_peserta.trim() === '') {
            return res.status(400).json({ error: 'Nama peserta kosong!' });
        }

        const [result] = await db.execute(
            'INSERT INTO peserta (room_id, nama_peserta) VALUES (?, ?)',
            [room_id, nama_peserta]
        );
        res.status(201).json({ id: result.insertId, room_id, nama_peserta });
    } catch (error) {
        console.error('Error adding participant:', error);
        res.status(500).json({ error: 'Failed to add participant' });
    }
};

const deleteParticipant = async (req, res) => {
    // Ini id pesertanya, bukan id turnamen
    const { id } = req.params; 

    try {
        // 1. Cari tahu peserta ini terdaftar di turnamen mana
        const queryPeserta = 'SELECT room_id FROM peserta WHERE id = ?';
        const [peserta] = await db.execute(queryPeserta, [id]);

        if (peserta.length === 0) {
            return res.status(404).json({ error: 'Peserta tidak ditemukan!' });
        }

        const roomId = peserta[0].room_id;

        // 2. Cek apakah turnamen masih fase pendaftaran
        const queryRoom = 'SELECT status FROM rooms WHERE id = ?';
        const [room] = await db.execute(queryRoom, [roomId]);

        if (room.length === 0) {
             return res.status(404).json({ error: 'Turnamen tidak ditemukan!' });
        }

        if (room[0].status !== 'pendaftaran') {
            return res.status(400).json({ error: 'Tidak bisa Kick peserta! Turnamen sudah berjalan atau selesai.' });
        }

        // 3. Eksekusi Hapus
        const queryDelete = 'DELETE FROM peserta WHERE id = ?';
        await db.execute(queryDelete, [id]);

        res.status(200).json({ message: 'Peserta berhasil di-kick dari ruang pendaftaran!' });

    } catch (error) {
        console.error('Error menghapus peserta:', error);
        res.status(500).json({ error: 'Internal server error saat menghapus peserta' });
    }
};

const updateParticipant = async (req, res) => {
    const { id } = req.params;
    const { nama_peserta } = req.body;

    try {
        if (!nama_peserta || nama_peserta.trim() === '') {
            return res.status(400).json({ error: 'Nama peserta kosong!' });
        }

        const [result] = await db.execute(
            'UPDATE peserta SET nama_peserta = ? WHERE id = ?',
            [nama_peserta, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        res.status(200).json({ message: 'Participant updated successfully' });
    } catch (error) {
        console.error('Error updating participant:', error);
        res.status(500).json({ error: 'Failed to update participant' });
    }
};

const generateRoomQr = async (req, res) => {
    const { room_id } = req.params;

    try {
        const queryCheck = 'SELECT id, status FROM rooms WHERE id = ?';
        const [room] = await db.execute(queryCheck, [room_id]);

        if (room.length === 0) {
            return res.status(404).json({ error: 'Turnamen tidak ditemukan!' });
        }

        if (room[0].status !== 'pendaftaran') {
            return res.status(400).json({ error: 'Turnamen ini sudah tidak menerima peserta baru!' });
        }

        // AMBIL BASE URL DARI FILE .env
        // Pakai fallback ke localhost buat jaga-jaga kalau lupa nulis di .env
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5501';
        const frontendUrl = `${baseUrl}/daftar-turnamen/${room_id}`;

        const qrCodeBase64 = await QRCode.toDataURL(frontendUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        res.status(200).json({
            message: 'QR Code berhasil dibuat!',
            url_tujuan: frontendUrl,
            qr_image: qrCodeBase64 
        });

    } catch (error) {
        console.error('Error generating QR Code:', error);
        res.status(500).json({ error: 'Internal server error saat membuat QR Code' });
    }
};

export default { addParticipant, deleteParticipant, updateParticipant, getParticipantsByRoomId, generateRoomQr };