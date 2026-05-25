import express from 'express';
import matchController from '../controller/matchController.js';
import auth from '../middleware/jwt.js';
const router = express.Router();

router.get('/tournament/:tournamentId', matchController.getMatchesByTournament);
router.get('/:id', matchController.getMatchDetails);
router.put('/:id', auth.getToken, auth.checkPanitia, matchController.updateMatchResult);
router.put('/:id/undo', auth.getToken, auth.checkPanitia, matchController.undoMatchResult); 

export default router;