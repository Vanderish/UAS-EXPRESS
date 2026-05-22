import db from '../config/db.js';

const getMatchesByTournament = async (req, res) => {
    const { tournamentId } = req.params;

    try {
        // Ambil match, bisa diurutkan berdasarkan babak atau ID biar rapi
        const query = 'SELECT * FROM pertandingan WHERE room_id = ? ORDER BY id ASC';
        const [rows] = await db.execute(query, [tournamentId]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error saat mengambil data pertandingan:', error);
        res.status(500).json({ error: 'Internal server error saat mengambil bagan pertandingan' });
    }
};

// 2. AMBIL DETAIL SATU PERTANDINGAN (GET BY ID)
// Dipakai kalau wasit mau masuk ke halaman input skor khusus match ini
const getMatchDetails = async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'SELECT * FROM pertandingan WHERE id = ?';
        const [rows] = await db.execute(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Data pertandingan tidak ditemukan!' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error saat mengambil detail pertandingan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 3. UPDATE PEMENANG DAN OTOMATIS MAJU BABAK (PUT/PATCH)
const updateMatchResult = async (req, res) => {
    const { id } = req.params;
    const { pemenang_id } = req.body;

    if (!pemenang_id) {
        return res.status(400).json({ error: 'ID pemenang wajib dikirim!' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const queryCheck = 'SELECT room_id, babak FROM pertandingan WHERE id = ?';
        const [currentMatch] = await connection.execute(queryCheck, [id]);

        if (currentMatch.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Pertandingan tidak ditemukan!' });
        }

        const { room_id, babak } = currentMatch[0];

        const queryUpdatePemenang = 'UPDATE pertandingan SET pemenang_id = ? WHERE id = ?';
        await connection.execute(queryUpdatePemenang, [pemenang_id, id]);

        const queryCurrentRound = 'SELECT id FROM pertandingan WHERE room_id = ? AND babak = ? ORDER BY id ASC';
        const [matchesCurrentRound] = await connection.execute(queryCurrentRound, [room_id, babak]);

        const currentIndex = matchesCurrentRound.findIndex(match => match.id === parseInt(id));

        if (currentIndex !== -1) {
            const babakBerikutnya = babak + 1;
            const queryNextRound = 'SELECT id FROM pertandingan WHERE room_id = ? AND babak = ? ORDER BY id ASC';
            const [matchesNextRound] = await connection.execute(queryNextRound, [room_id, babakBerikutnya]);

            if (matchesNextRound.length > 0) {
                const targetIndex = Math.floor(currentIndex / 2);
                const targetMatch = matchesNextRound[targetIndex];

                if (targetMatch) {
                    const kolomTarget = (currentIndex % 2 === 0) ? 'pemain1_id' : 'pemain2_id';
                    
                    const queryUpdateSlot = `UPDATE pertandingan SET ${kolomTarget} = ? WHERE id = ?`;
                    await connection.execute(queryUpdateSlot, [pemenang_id, targetMatch.id]);
                }
            } else {
                const updateStatusQuery = "UPDATE rooms SET status = 'selesai' WHERE id = ?";
                await connection.execute(updateStatusQuery, [room_id]);
            }
        }

        await connection.commit();
        res.status(200).json({ message: 'Hasil dicatat dan pemenang maju ke babak berikutnya!' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

export default {
    getMatchesByTournament,
    getMatchDetails,
    updateMatchResult
};