// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    title: String,
    name: String,
    role: String,
    hasVoted: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
