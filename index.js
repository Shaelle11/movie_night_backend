const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 4568;
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB connection
const mongoUri = 'mongodb://localhost:27017'; // Adjust as needed
const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

let db, moviesCollection, usersCollection;

client.connect(err => {
    if (err) throw err;
    db = client.db('votingApp');
    moviesCollection = db.collection('movies');
    usersCollection = db.collection('users');

    // Seed movies if they don't exist
    moviesCollection.countDocuments((err, count) => {
        if (err) throw err;
        if (count === 0) {
            moviesCollection.insertMany([
                { name: 'Last Night In Soho', genre: 'Mystery', image: '/images/1ea8df40-afbe-4237-88fd-bba449a6122f.jpeg', votes: 0 },
                { name: '2 Guns', genre: 'Action', image: '/images/R 2013 ‧ Action_Thriller_Comedy_Crime ‧ 1h 49m.jpeg', votes: 0 },
                { name: 'SaltBurn', genre: 'Thriller', image: '/images/Saltburn (2023).jpeg', votes: 0 },
                { name: 'The Outlaws', genre: 'Drama', image: '/images/The OUTLAWS.jpeg', votes: 0 },
                { name: 'The Killer', genre: 'Action/Thriller', image: 'images/Убийца _ Killer 2023.jpeg', votes: 0 },
                { name: 'Monkey Man', genre: 'Thriller', image: '/images/5 I found first-pages.jpg', votes: 0 },
                { name: 'Fail Guy', genre: 'Action', image: '/images/fail guy.jpg', votes: 0 },
                { name: 'Hitman', genre: 'Drama', image: '/images/hitman.jpg', votes: 0 },
                { name: 'Operation Ruse', genre: 'Drama', image: '/images/operation ruse.jpg', votes: 0 },
                { name: 'Beverly Hills Cop Axelf', genre: 'Comedy', image: '/images/Beverly hills cop axelf.jpg', votes: 0 },
            ]);
        }
    });
});

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key', // Change this to a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use('/public', express.static('public'));

const ADMIN_PASSKEY = "ADMIN123";
const INVITEE_PASSKEY = "INVITE456";
const SUPER_ADMIN_PASSKEY = "SUPERADMIN123";

app.post('/invite', (req, res) => {
    const { passkey, title, name } = req.body;

    if (passkey === ADMIN_PASSKEY) {
        req.session.role = "Admin";
        req.session.title = title;
        req.session.name = name;
        req.session.userId = new ObjectId();
        res.json({ role: "Admin", title, name });
    } else if (passkey === INVITEE_PASSKEY) {
        req.session.role = "Invitee";
        req.session.title = title;
        req.session.name = name;
        req.session.userId = new ObjectId();
        res.json({ role: "Invitee", title, name });
    } else if (passkey === SUPER_ADMIN_PASSKEY) {
        req.session.role = "SuperAdmin";
        req.session.title = title;
        req.session.name = name;
        req.session.userId = new ObjectId();
        res.json({ role: "SuperAdmin", title, name });
    } else {
        res.status(400).json({ error: "Invalid passkey. Please try again." });
    }
});

app.get('/movies', async (req, res) => {
    try {
        const movies = await moviesCollection.find().toArray();
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

    try {
        // Check if the user has already voted for any movie
        const user = await usersCollection.findOne({ _id: userId });
        if (user && user.votedMovies && user.votedMovies.length > 0) {
            return res.status(400).json({ error: 'You have already voted for a movie' });
        }

        // Update the movie votes
        const result = await moviesCollection.findOneAndUpdate(
            { _id: new ObjectId(movieId) },
            { $inc: { votes: 1 } },
            { returnOriginal: false }
        );

        if (!result.value) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        // Update the user’s votedMovies list
        await usersCollection.updateOne(
            { _id: userId },
            { $set: { votedMovies: [movieId] } },
            { upsert: true }
        );

        io.emit('voteUpdate', result.value);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error processing vote' });
    }
});

io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
