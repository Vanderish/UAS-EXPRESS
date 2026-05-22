import express from 'express';
import tournamentController from '../controller/tournamentController.js';
import auth from '../middleware/jwt.js';

const router = express.Router();

router.get('/', tournamentController.getAllTournaments);
router.get('/:id', tournamentController.getTournamentDetails);
router.post('/', auth.getToken, auth.checkPanitia, tournamentController.createTournament);
router.post('/generate-bracket/:id', auth.getToken, auth.checkPanitia, tournamentController.generateBracket);

export default router;