import { Router } from 'express'
import chatRoutes from './chat-routes.js'
import queryRoutes from './query-routes.js'
import authRoutes from './auth-routes.js'
import { protect } from '../middleware/auth-middleware.js';

const router = Router()

router.use('/chat',chatRoutes)
router.use('/query',protect, queryRoutes)
router.use('/auth',authRoutes)

export default router

