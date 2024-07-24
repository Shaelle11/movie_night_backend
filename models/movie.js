const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    name: String,
    genre: String,
    image: String,
    votes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Movie', movieSchema);
