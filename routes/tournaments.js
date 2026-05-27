import express from 'express';
import tournamentController from '../controller/tournamentController.js';
import auth from '../middleware/jwt.js';

const router = express.Router();

router.get('/', tournamentController.getAllTournaments);
router.get('/stats', tournamentController.getStats);
router.get('/:id', tournamentController.getTournamentDetails);
router.post('/', auth.getToken, tournamentController.createTournament);
router.post('/generate-bracket/:id', auth.getToken, tournamentController.generateBracket);

export default router;