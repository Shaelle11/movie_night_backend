const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

router.post('/vote', async (req, res) => {
    const { movieId } = req.body;
    const userId = req.session.userId;
    const db = req.app.locals.db;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (user.votedMovies.length > 0) {
            return res.status(400).json({ error: 'You have already voted for a movie' });
        }

        const movie = await db.collection('movies').findOne({ _id: new ObjectId(movieId) });
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        await db.collection('movies').updateOne(
            { _id: new ObjectId(movieId) },
            { $inc: { votes: 1 } }
        );

        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $push: { votedMovies: movieId } }
        );

        const updatedMovie = await db.collection('movies').findOne({ _id: new ObjectId(movieId) });
        req.app.locals.io.emit('voteUpdate', updatedMovie);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error processing vote' });
    }
});

module.exports = router;
