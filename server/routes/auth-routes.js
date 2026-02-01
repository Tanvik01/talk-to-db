import express from 'express';
import { signup, login, gitCallback } from '../controllers/authcontroller.js';


const router = express.Router();
router.post('/signup', signup);
router.post('/login', login);
router.get('/github/callback', gitCallback);
export default router;