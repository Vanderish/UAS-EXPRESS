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

        if (participants.length < 2) {
            return res.status(400).json({ error: 'Peserta minimal 2 orang.' });
        }

        // --- 1. CARI PANGKAT 2 TERDEKAT (Target Slot) ---
        // Kalau peserta 6, targetnya jadi 8. Kalau peserta 11, targetnya 16.
        let targetSlots = 2;
        while (targetSlots < participants.length) {
            targetSlots *= 2;
        }

        // --- 2. BIKIN "PESERTA HANTU" (BYE) ---
        const numByes = targetSlots - participants.length;
        const shuffledParticipants = [...participants];
        
        // Masukkan objek dummy dengan id null
        for (let i = 0; i < numByes; i++) {
            shuffledParticipants.push({ id: null, nama_peserta: 'BYE' });
        }

        // --- 3. SHUFFLE TOTAL (Peserta Asli + Peserta Hantu) ---
        for (let i = shuffledParticipants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
        }

        const matchesToInsert = [];
        
        // --- 4. BIKIN SLOT BABAK 1 (Akan ada yang melawan NULL/BYE) ---
        for (let i = 0; i < targetSlots; i += 2) {
            matchesToInsert.push({
                babak: 1,
                pemain1_id: shuffledParticipants[i].id,
                pemain2_id: shuffledParticipants[i + 1].id
            });
        }

        // --- 5. BIKIN SLOT BABAK SELANJUTNYA (Bagan Sempurna) ---
        let babakSekarang = 2;
        let sisaMatch = targetSlots / 2; // Pasti pas dibagi 2!
        
        while (sisaMatch > 1) {
            sisaMatch = sisaMatch / 2;
            
            for (let i = 0; i < sisaMatch; i++) {
                matchesToInsert.push({
                    babak: babakSekarang,
                    pemain1_id: null,
                    pemain2_id: null
                });
            }
            babakSekarang++;
        }

        // --- 6. EKSEKUSI DATABASE ---
        const connection = await db.getConnection(); 
        try {
            await connection.beginTransaction(); 

            const insertMatchQuery = `
                INSERT INTO pertandingan (room_id, babak, pemain1_id, pemain2_id) 
                VALUES (?, ?, ?, ?)
            `;

            const insertPromises = matchesToInsert.map(match => {
                return connection.execute(insertMatchQuery, [
                    id, match.babak, match.pemain1_id, match.pemain2_id 
                ]);
            });

            await Promise.all(insertPromises); 

            const updateStatusQuery = "UPDATE rooms SET status = 'berjalan' WHERE id = ?";
            await connection.execute(updateStatusQuery, [id]);

            await connection.commit(); 

            res.status(201).json({ 
                message: 'Bagan berstandar turnamen berhasil di-generate!', 
                totalPertandingan: matchesToInsert.length
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

const getStats = async (req, res) => {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM rooms) AS total_tournaments,
                (SELECT COUNT(*) FROM peserta) AS total_participants,
                (SELECT COUNT(*) FROM pertandingan) AS total_matches
        `;
        
        const [rows] = await db.query(query);

        res.json({
            tournaments: rows[0].total_tournaments,
            participants: rows[0].total_participants,
            matches: rows[0].total_matches
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Gagal mengambil statistik', message: error.message });
    }
}

export default {
    createTournament,
    getAllTournaments,
    getTournamentDetails,
    generateBracket,
    getStats
};