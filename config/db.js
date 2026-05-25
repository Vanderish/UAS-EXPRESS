import 'dotenv/config';
import mysql from 'mysql2/promise';

console.log("=== CCTV RENDER ===");
console.log("HOST:", process.env.DB_HOST);
console.log("USER:", process.env.DB_USER);
console.log("PORT:", process.env.DB_PORT);
console.log("===================");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    // INI BAGIAN PALING PENTING UNTUK TIDB SERVERLESS
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

export default db;