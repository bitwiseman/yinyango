/**
 * Handle server routes.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

var routes = require('./routes'),
    user = require('./routes/user'),
    game = require('./routes/game'),
    io = require('./routes/io'),
    db = require('./db');

module.exports = function (app) {
    // Handle routes.
    app.get('/', db, routes.index);

    // Handle users requests.
    app.post('/guest', db, user.guest);
    app.post('/login', db, user.login);
    app.get('/logout', user.logout);
    app.post('/register', db, user.register);
    app.post('/settings', db, user.settings);

    // Handle games requests.
    app.get('/gameslist/:page', db, game.list);
    app.get('/load/:id', db, game.load);
    app.post('/loadsgf/:method', game.loadsgf);

    // Handle io.
    app.io.route('chat', io.chat);
    app.io.route('disconnect', io.disconnect);
    app.io.route('join', io.join);
};
