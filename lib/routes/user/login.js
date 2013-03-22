/**
 * Request user login.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var pass = require('pwd'),
    check = require('validator').check,
    oneyear = 31104000000;

module.exports = function (req, res) {
    var username =  req.body.username,
        password =  req.body.password,
        validname = /^[a-zA-Z0-9]+$/;

    // Always check received data before using it.
    try {
        check(username, 'login').len(1, 15).is(validname);
        check(password, 'login').len(1, 64);
    } catch (e) {
        res.send({ error: e.message });
        return;
    }

    req.db.User.findOne({ name: username }, function (err, user) {
        if (err) {
            console.error('User.findOne error: ' + err);
            return;
        }
        if (user) {
            // Compare hashs.
            pass.hash(password, user.salt, function (err, hash) {
                console.log(hash);
                if (err) {
                    console.error('hash error: ' + err);
                    return;
                }
                if (hash === user.hash) {
                    // Save in session and reload.
                    req.session.userid =    user._id;
                    req.session.username =  user.name;
                    req.session.isguest =   false;
                    res.cookie('language', user.lang, { maxAge: oneyear });
                    res.send({ error: '' });
                } else {
                    res.send({ error: 'login' });
                }
            });
        } else {
            res.send({ error: 'login' });
        }
    });
};
