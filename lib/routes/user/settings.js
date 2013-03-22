/**
 * Request saving new user settings.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var check = require('validator').check,
    oneyear = 31104000000;

module.exports = function (req, res) {
    var lang =      req.body.lang,
        userid =    req.session.userid,
        isguest =   req.session.isguest,
        settings;

    // Always check received data before using it.
    try {
        check(lang, 'lang').len(2, 2).isAlpha();
    } catch (e) {
        res.send({ error: e.message });
        return;
    }

    // Update user settings in database.
    if (userid) {
        settings = { lang: lang };
        req.db.User.findByIdAndUpdate(userid, settings, function (err) {
            if (!err) {
                res.cookie('language', lang, { maxAge: oneyear });
                res.send({ error: '' });
            } else {
                res.send({ error: 'lang' });
            }
        });
    } else if (isguest) {
        res.cookie('language', lang, { maxAge: oneyear });
        res.send({ error: '' });
    } else {
        res.send({ error: 'error' });
    }
};
