/**
 * yinyango Node.js Server.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var express = require('express.io'),
    app = express().http().io();

// TODO store userslist with redis.
userslist = {};

// Configure server.
require('./lib/config')(app);

// Handle routes.
require('./lib/handler')(app);

// Start server.
app.listen(3000, function () {
    console.log('Express server listening on port 3000');
});
