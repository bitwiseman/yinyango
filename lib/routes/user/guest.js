/**
 * Request login as guest.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var check = require('validator').check;

module.exports = function (req, res) {
    var username =  req.body.guestname,
        validname = /^[a-zA-Z0-9]+$/;

    // Always check received data before using it.
    try {
        check(username, 'name').len(1, 15).is(validname);
    } catch (e) {
        res.send({ error: e.message });
        return;
    }

    // Check if that guest name is taken by regular user or already connected.
    req.db.User.findOne({ name: username }, function (err, user) {
        if (err) {
            console.error('User.findOne error: ' + err);
            return;
        }
        if (user || userslist[username] !== undefined) {
            res.send({ error: 'exist' });
        } else {
            req.session.username = username;
            req.session.isguest = true;
            res.send({ error: '' });
        }
    });
};
