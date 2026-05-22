import db from '../config/db.js';

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
    const room_id = req.params; 

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
    const { id } = req.params;

    try {
        const [result] = await db.execute('DELETE FROM peserta WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        res.status(200).json({ message: 'Participant deleted successfully' });
    } catch (error) {
        console.error('Error deleting participant:', error);
        res.status(500).json({ error: 'Failed to delete participant' });
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

export default { addParticipant, deleteParticipant, updateParticipant, getParticipantsByRoomId };