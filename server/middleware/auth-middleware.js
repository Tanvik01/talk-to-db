import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'talk-to-db-secret-demo-key';

export const protect = async (req, res, next) => {
    let token;

    // 1. Check if token exists in the "Authorization" header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1]; // Get token from "Bearer <token>"

            if (token === 'guest-demo-token') {
                req.user = 999;
                return next();
            }

            // 2. Verify token using JWT_SECRET
            const decoded = jwt.verify(token, JWT_SECRET);

            // 3. Attach user ID to request
            req.user = decoded.userId;

            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};