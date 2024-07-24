const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    singer: { type: String, required: true },
    song: { type: String, required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Song', songSchema);
