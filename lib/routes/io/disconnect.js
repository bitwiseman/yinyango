/**
 * Received IO 'disconnect' event.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
module.exports = function (req) {
    // Check if disconnected socket is the first one created by user.
    if (userslist[req.session.username] === req.io.socket.id) {
        // Remove user from list.
        delete userslist[req.session.username];
        req.io.broadcast('user-left', req.session.username);
    }
};
