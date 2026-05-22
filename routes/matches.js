import express from 'express';
import matchController from '../controller/matchController.js';
import auth from '../middleware/jwt.js';
const router = express.Router();

router.get('/tournament/:tournamentId', matchController.getMatchesByTournament);
router.get('/:id', matchController.getMatchDetails);
router.put('/:id', auth.getToken, auth.checkPanitia, matchController.updateMatchResult);

export default router;