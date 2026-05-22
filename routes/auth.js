import express from 'express';
import authController from '../controller/authController.js';
const router = express.Router();

router.post('/login', authController.authLogin);
router.post('/register', authController.authRegister);

export default router;