import mysql from 'mysql2/promise';

const db = await mysql.createPool({
  host: 'localhost',
  user: 'fedora',
  password: '123',
  database: 'chess_tournament',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection()
  .then(() => {
    console.log('✅ Database MySQL berhasil terkoneksi!');
  })
  .catch((err) => {
    console.error('❌ Gagal konek ke database:', err);
  });

export default db;