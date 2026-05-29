import express from 'express';
import participantController from '../controller/participantController.js';
import auth from '../middleware/jwt.js';
const router = express.Router();


router.get('/:room_id', participantController.getParticipantsByRoomId);
router.get('/qr/:room_id', auth.getToken, participantController.generateRoomQr);
router.post('/:room_id', participantController.addParticipant);
router.delete('/:id', auth.getToken, participantController.deleteParticipant);
router.put('/:id', auth.getToken, participantController.updateParticipant);


export default router;