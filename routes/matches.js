import express from 'express';
import matchController from '../controller/matchController.js';
import auth from '../middleware/jwt.js';
const router = express.Router();

router.get('/tournament/:tournamentId', matchController.getMatchesByTournament);
router.get('/:id', matchController.getMatchDetails);
router.put('/:id', auth.getToken, matchController.updateMatchResult);
router.put('/:id/undo', auth.getToken, matchController.undoMatchResult); 

export default router;