const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const User = require('./models/user');
const Movie = require('./models/movie');
const Song = require('./models/song'); // Add Song model

const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Failed to connect to MongoDB', err));

// CORS configuration
app.use(cors({
    origin: ['https://movie-night-client-nine.vercel.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// Body parser
app.use(bodyParser.json());

// Session management
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'User not authenticated' });
};

// Routes
app.post('/invite', async (req, res) => {
    const { passkey, title, name } = req.body;

    if ([process.env.ADMIN_PASSKEY, process.env.INVITEE_PASSKEY, process.env.SUPER_ADMIN_PASSKEY].includes(passkey)) {
        req.session.role = passkey === process.env.ADMIN_PASSKEY ? 'Admin' :
                           passkey === process.env.INVITEE_PASSKEY ? 'Invitee' : 'SuperAdmin';
        req.session.title = title;
        req.session.name = name;
        req.session.userId = new mongoose.Types.ObjectId();
        res.json({ role: req.session.role, title, name });
    } else {
        res.status(400).json({ error: 'Invalid passkey. Please try again.' });
    }
});

app.get('/movies', async (req, res) => {
    try {
        const movies = await Movie.find();
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching movies' });
    }
});

app.post('/vote', async (req, res) => {
    const { movieId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
        return res.status(400).json({ error: 'Invalid movie ID' });
    }

    try {
        // Check if the user has already voted
        const user = await User.findById(userId);
        if (user.hasVoted) {
            return res.status(403).json({ error: 'You have already voted' });
        }

        // Find and update the movie
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        movie.votes += 1;
        await movie.save();

        // Mark the user as having voted
        user.hasVoted = true;
        await user.save();

        // Emit updated movie to all clients
        const movies = await Movie.find(); // Fetch all movies to update the client
        io.emit('movieVoteUpdate', movies);
        res.json({ success: true, movies });
    } catch (error) {
        console.error('Error processing vote:', error);
        res.status(500).json({ error: 'Error processing vote' });
    }
});

// Song submission route
app.post('/submit-song', isAuthenticated, async (req, res) => {
    const { singer, song } = req.body;
    const userId = req.session.userId;

    try {
        const newSong = new Song({ singer, song, submittedBy: userId });
        await newSong.save();
        res.json({ success: true, message: 'Song submitted successfully' });
    } catch (error) {
        console.error('Error submitting song:', error);
        res.status(500).json({ error: 'Error submitting song' });
    }
});

// Get songs (for SuperAdmin)
app.get('/get-songs', isAuthenticated, async (req, res) => {
    if (req.session.role !== 'SuperAdmin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const songs = await Song.find().populate('submittedBy', 'name');
        res.json(songs);
    } catch (error) {
        console.error('Error fetching songs:', error);
        res.status(500).json({ error: 'Error fetching songs' });
    }
});

// Invitee submission route
app.post('/invitee', async (req, res) => {
    const { name, inviteeName, letter } = req.body;

    try {
        const newInvitee = new Invitee({ name, inviteeName, letter });
        await newInvitee.save();
        res.json({ success: true, message: 'Invitee added successfully' });
    } catch (error) {
        console.error('Error submitting invitee:', error);
        res.status(500).json({ error: 'Error submitting invitee' });
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
});
