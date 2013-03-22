/**
 * Request user registration.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var pass = require('pwd'),
    check = require('validator').check;

module.exports = function (req, res) {
    var username =  req.body.username,
        password =  req.body.password,
        email =     req.body.email,
        lang =      req.cookies.language,
        validname = /^[a-zA-Z0-9]+$/;

    // Always check received data before using it.
    try {
        check(username, 'name').len(1, 15).is(validname);
        check(email).len(6, 64).isEmail();
        check(password).len(1, 64);
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
            res.send({ error: 'exist' });
        } else {
            // Generate salt and hash and insert in database.
            pass.hash(password, function (err, salt, hash) {
                if (err) {
                    console.error('hash error: ' + err);
                    return;
                }

                var user = new req.db.User({
                    name: username,
                    email: email,
                    salt: salt,
                    hash: hash,
                    lang: lang
                });

                user.save(function (err) {
                    if (err) {
                        console.error('user.save error: ' + err);
                        return;
                    }
                    // Registration successful.
                    res.send({ error: '' });
                });
            });
        }
    });
};
