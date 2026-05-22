import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const authLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [result] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        
        if (result.length === 0) {
            return res.status(401).json({ error: 'Username tidak ditemukan!' });
        }

        const user = result[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Password salah!' });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role 
            }, 
            process.env.STAMPLE, 
            { expiresIn: '1d' }
        );

        res.json({ 
            message: 'Login berhasil!', 
            token: token,
            userData: {
                id: user.id,
                username: user.username,
                role: user.role,
                foto_profil: user.foto_profil
            }
        });

    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const authRegister = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi!' });
    }

    try {
        const queryCheck = 'SELECT id FROM users WHERE username = ?';
        const [existingUser] = await db.execute(queryCheck, [username]);

        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'Username sudah terdaftar!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const queryInsert = "INSERT INTO users (username, password, role, foto_profil) VALUES (?, ?, 'pengguna', 'default-avatar.png')";
        const [result] = await db.execute(queryInsert, [username, hashedPassword]);

        res.status(201).json({ 
            message: 'Akun berhasil didaftarkan!', 
            userId: result.insertId 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error saat mendaftar akun' });
    }
};

export default { authLogin, authRegister };