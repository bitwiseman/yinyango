/**
 * Request user logout.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
module.exports = function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
};
