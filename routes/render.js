import express from 'express';
import renderController from '../controller/renderController.js';
const router = express.Router();


router.get('/', renderController.index);
router.get('/login', renderController.login);
router.get('/register', renderController.register);
router.get('/tournament', renderController.tournament);


export default router;