const User = require('./models/user');

const authenticateUser = async (req, res, next) => {
    const userId = req.session.userId;
    
    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        req.user = user; // Attach user to request object for use in routes
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = authenticateUser;
