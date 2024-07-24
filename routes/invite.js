const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const User = require('../models/user');

const ADMIN_PASSKEY = "ADMIN123";
const INVITEE_PASSKEY = "INVITE456";
const SUPER_ADMIN_PASSKEY = "SUPERADMIN123";

router.post('/invite', async (req, res) => {
    const { passkey, title, name } = req.body;
    const db = req.app.locals.db;

    if (passkey === ADMIN_PASSKEY || passkey === INVITEE_PASSKEY || passkey === SUPER_ADMIN_PASSKEY) {
        const role = passkey === ADMIN_PASSKEY ? 'Admin' : passkey === INVITEE_PASSKEY ? 'Invitee' : 'SuperAdmin';

        let user = await db.collection('users').findOne({ title, name });
        if (!user) {
            user = new User(title, name, role);
            await db.collection('users').insertOne(user);
        }

        req.session.userId = user._id;
        req.session.role = role;
        req.session.title = title;
        req.session.name = name;

        res.json({ role: req.session.role, title, name });
    } else {
        res.status(400).json({ error: 'Invalid passkey. Please try again.' });
    }
});

module.exports = router;
