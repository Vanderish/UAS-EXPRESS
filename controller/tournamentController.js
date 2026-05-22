import db from '../config/db.js';

const createTournament = async (req, res) => {
    const { nama_turnamen, jenis_lomba } = req.body;
    const user_id = req.user.id;

    if (!nama_turnamen || nama_turnamen.trim() === '') {
        return res.status(400).json({ error: 'Nama turnamen wajib diisi!' });
    }

    try {
        const query = "INSERT INTO rooms (user_id, nama_turnamen, jenis_lomba, status) VALUES (?, ?, ?, 'pendaftaran')";
        const [result] = await db.execute(query, [user_id, nama_turnamen, jenis_lomba || null]);
        
        res.status(201).json({
            message: 'Turnamen berhasil dibuat!',
            tournamentId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error: ', errMessage: error.message });
    }
};

const getAllTournaments = async (req, res) => {
    try {
        const query = 'SELECT * FROM rooms ORDER BY id DESC';
        const [rows] = await db.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTournamentDetails = async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'SELECT * FROM rooms WHERE id = ?';
        const [rows] = await db.execute(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Turnamen tidak ditemukan!' });
        }

        res.status(200).json(rows[0]); 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const generateBracket = async (req, res) => {
    const { id } = req.params; 

    try {
        const queryPeserta = 'SELECT * FROM peserta WHERE room_id = ?';
        const [participants] = await db.execute(queryPeserta, [id]);

        // Biar bentuk bracketnya sempurna seperti di gambar, jumlah peserta 
        // idealnya adalah kelipatan 2 (4, 8, 16, 32).
        if (participants.length < 2) {
            return res.status(400).json({ error: 'Peserta minimal 2 orang.' });
        }

        // --- 1. SHUFFLE PESERTA (Hanya dilakukan di awal) ---
        const shuffledParticipants = [...participants];
        for (let i = shuffledParticipants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
        }

        const matchesToInsert = [];

        // --- 2. BIKIN SLOT BABAK 1 (Isi dengan pemain asli) ---
        let jumlahMatchBabakIni = 0;
        for (let i = 0; i < shuffledParticipants.length; i += 2) {
            matchesToInsert.push({
                babak: 1,
                pemain1_id: shuffledParticipants[i].id,
                pemain2_id: shuffledParticipants[i + 1] ? shuffledParticipants[i + 1].id : null
            });
            jumlahMatchBabakIni++;
        }

        // --- 3. BIKIN SLOT BABAK SELANJUTNYA (Isi dengan NULL / TBD) ---
        // Logikanya: Jumlah match di babak selanjutnya adalah setengah dari babak sebelumnya
        let babakSekarang = 2;
        
        while (jumlahMatchBabakIni > 1) {
            let matchDiBabakSelanjutnya = Math.ceil(jumlahMatchBabakIni / 2);
            
            for (let i = 0; i < matchDiBabakSelanjutnya; i++) {
                matchesToInsert.push({
                    babak: babakSekarang,
                    pemain1_id: null,
                    pemain2_id: null
                });
            }
            
            jumlahMatchBabakIni = matchDiBabakSelanjutnya; // Update sisa match untuk di-loop lagi
            babakSekarang++;
        }

        // --- 4. EKSEKUSI DATABASE ---
        const connection = await db.getConnection(); 
        try {
            await connection.beginTransaction(); 

            const insertMatchQuery = `
                INSERT INTO pertandingan (room_id, babak, pemain1_id, pemain2_id) 
                VALUES (?, ?, ?, ?)
            `;

            const insertPromises = matchesToInsert.map(match => {
                return connection.execute(insertMatchQuery, [
                    id,
                    match.babak,       // <-- Sekarang babaknya dinamis (1, 2, 3, dst)
                    match.pemain1_id,
                    match.pemain2_id 
                ]);
            });

            await Promise.all(insertPromises); 

            const updateStatusQuery = "UPDATE rooms SET status = 'berjalan' WHERE id = ?";
            await connection.execute(updateStatusQuery, [id]);

            await connection.commit(); 

            res.status(201).json({ 
                message: 'Bagan penuh berhasil di-generate!', 
                totalPertandingan: matchesToInsert.length,
                pasangan: matchesToInsert
            });

        } catch (transactionError) {
            await connection.rollback(); 
            throw transactionError; 
        } finally {
            connection.release(); 
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export default {
    createTournament,
    getAllTournaments,
    getTournamentDetails,
    generateBracket
};