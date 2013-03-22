/**
 * Received IO 'chat' event.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
module.exports = function (req) {
    var chat = '<strong>' + req.session.username + ': </strong>' + req.data;

    if (req.data !== '') {
        req.io.broadcast('chat', chat);
        req.io.emit('chat', chat);
    }
};
