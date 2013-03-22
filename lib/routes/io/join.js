/**
 * Received IO 'join' event.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
module.exports = function (req) {
    var users = [],
        user;

    // Check if that user is already connected.
    if (userslist[req.session.username] !== undefined) {
        req.io.respond({ success: false });
    } else {
        // Add user to users list.
        userslist[req.session.username] = req.io.socket.id;
        // Generate users list.
        for (user in userslist) {
            users.push(user);
        }
        // Broadcast new user to connected users.
        req.io.broadcast('user-joined', req.session.username);
        // Send session settings and users list to new user.
        req.io.respond({
            success: true,
            username: req.session.username,
            isguest: req.session.isguest,
            users: users
        });
    }
};
