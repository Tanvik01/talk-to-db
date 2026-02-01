import jwt from 'jsonwebtoken';
export const protect = async (req, res, next) => {
    let token;

    // 1. Check if token exists in the "Authorization" header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1]; // Get token from "Bearer <token>"

            // 2. Verify token using your JWT_SECRET
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Attach user ID to request so the next function knows who is asking
            req.user = decoded.userId;

            next(); // Move to the actual logic (e.g., executeQuery)
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};