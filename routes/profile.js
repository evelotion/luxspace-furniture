const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {

        const result = await db.query("SELECT * FROM users WHERE id = $1", [req.session.user.id]);
        const user = result.rows[0];

        res.render('profile', { user });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});


router.post('/update', ensureAuthenticated, async (req, res) => {
    try {
        const { full_name, phone, address, city, postal_code } = req.body;
        const userId = req.session.user.id;

        await db.query(
            "UPDATE users SET full_name=$1, phone=$2, address=$3, city=$4, postal_code=$5 WHERE id=$6",
            [full_name, phone, address, city, postal_code, userId]
        );


        req.session.user.full_name = full_name;
        req.session.user.phone = phone;
        req.session.user.address = address;
        
        req.flash('success_msg', 'Profile updated successfully!');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Failed to update profile.');
        res.redirect('/profile');
    }
});

module.exports = router;