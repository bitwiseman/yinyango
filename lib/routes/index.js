/**
 * Server routes.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
exports.index = function (req, res) {
    var userid = req.session.userid,
        isguest = req.session.isguest,
        lang = req.cookies.language,
        dev = req.app.settings.env === 'development' ? true : false;

    if (userid) {
        // Check if user exist in database.
        req.db.User.findById(userid, function (err, user) {
            if (err) {
                console.error('db.User.findById error: ' + err);
                return;
            }
            if (user) {
                res.render('yygo', {
                    dev: dev,
                    lang: lang
                });
            } else {
                res.redirect('/logout');
            }
        });
    } else if (isguest) {
        res.render('yygo', {
            dev: dev,
            lang: lang
        });
    } else {
        res.render('login');
    }
};
