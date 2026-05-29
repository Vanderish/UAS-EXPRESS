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
        const query = `
            SELECT 
                r.*, 
                (SELECT COUNT(*) FROM peserta p WHERE p.room_id = r.id) AS total_peserta
            FROM rooms r
            ORDER BY r.id DESC
        `;
        
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
        // --- 1. VALIDASI STATUS ROOM ---
        const checkStatusQuery = 'SELECT status FROM rooms WHERE id = ?';
        const [roomData] = await db.execute(checkStatusQuery, [id]);

        if (roomData.length === 0) return res.status(404).json({ error: 'Turnamen tidak ditemukan' });
        if (roomData[0].status === 'berjalan') {
            return res.status(400).json({ error: 'Bagan sudah pernah dibuat untuk turnamen ini!' });
        }

        const queryPeserta = 'SELECT * FROM peserta WHERE room_id = ?';
        const [participants] = await db.execute(queryPeserta, [id]);

        if (participants.length < 2) {
            return res.status(400).json({ error: 'Peserta minimal 2 orang.' });
        }

        // --- 2. CARI PANGKAT 2 TERDEKAT (Target Slot) ---
        let targetSlots = 2;
        while (targetSlots < participants.length) {
            targetSlots *= 2;
        }

        // --- 3. SHUFFLE PESERTA ASLI DULU ---
        // (Kita tidak lagi memasukkan BYE ke dalam array untuk di-shuffle bareng)
        const shuffledParticipants = [...participants];
        for (let i = shuffledParticipants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
        }

        const matchesToInsert = [];
        const numMatches = targetSlots / 2; // Jumlah pertandingan di Babak 1

        // Siapkan mangkok kosong untuk Babak 1
        for(let i = 0; i < numMatches; i++) {
            matchesToInsert.push({ babak: 1, pemain1_id: null, pemain2_id: null });
        }

        // --- 4. DISTRIBUSI PESERTA (ANTI BYE VS BYE) ---
        let participantIndex = 0;
        
        // Putaran pertama: Isi slot kiri (pemain 1) di setiap pertandingan
        for(let i = 0; i < numMatches; i++){
            if(participantIndex < shuffledParticipants.length){
                matchesToInsert[i].pemain1_id = shuffledParticipants[participantIndex].id;
                participantIndex++;
            }
        }
        
        // Putaran kedua: Isi slot kanan (pemain 2) dari sisa peserta
        for(let i = 0; i < numMatches; i++){
            if(participantIndex < shuffledParticipants.length){
                matchesToInsert[i].pemain2_id = shuffledParticipants[participantIndex].id;
                participantIndex++;
            }
        }

        // --- 5. BIKIN SLOT BABAK SELANJUTNYA (Bagan Sempurna) ---
        let babakSekarang = 2;
        let sisaMatch = targetSlots / 2;
        
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

const deleteTournament = async (req, res) => {
    const { id } = req.params;

    try {
        const deleteMatchesQuery = 'DELETE FROM pertandingan WHERE room_id = ?';
        await db.execute(deleteMatchesQuery, [id]);

        const deleteParticipantsQuery = 'DELETE FROM peserta WHERE room_id = ?';
        await db.execute(deleteParticipantsQuery, [id]);

        const deleteRoomQuery = 'DELETE FROM rooms WHERE id = ?';
        const [result] = await db.execute(deleteRoomQuery, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Turnamen tidak ditemukan!' });
        }

        res.json({ message: 'Turnamen berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export default {
    createTournament,
    getAllTournaments,
    getTournamentDetails,
    generateBracket,
    getStats,
    deleteTournament
};