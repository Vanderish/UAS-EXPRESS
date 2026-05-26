import express from 'express';
import cors from 'cors';
import methodOverride from 'method-override';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import tournamentRoutes from './routes/tournaments.js';
import matchRoutes from './routes/matches.js';
import authRoutes from './routes/auth.js';
import participantRoutes from './routes/participants.js';
import auth from './middleware/jwt.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
// sementara
app.set('json spaces', 2);

// routes
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: "success"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});