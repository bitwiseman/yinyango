/**
 * Yin yan go Node.js Express application.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0
 * @link     https://github.com/hickop/yinyanggo
 */

/**
 * Modules dependencies.
 */

var express = require('express'),
    routes = require('./routes');

// Express is the application.
var app = express();

/**
 * Configuration of application.
 */

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.static(__dirname + '/public'));
});

/**
 * Application.
 */

app.get('/', routes.index);

/**
 * Server init.
 */

app.listen(3000, function () {
    console.log('Express server listening on port 3000');
});
