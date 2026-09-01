import express from 'express';
import { signup, login, guestLogin, gitCallback } from '../controllers/authcontroller.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/guest', guestLogin);
router.get('/github/callback', gitCallback);

export default router;