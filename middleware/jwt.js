import jwt from 'jsonwebtoken';

const getToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Haven\'t logged in!' });
    }

    try {
        const decoded = jwt.verify(token, process.env.STAMPLE);
        req.user = decoded; 
        
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid token or expired!' });
    }
};

export default { getToken };