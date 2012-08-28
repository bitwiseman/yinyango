/**
 * Yin yan go Node.js Express application.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0
 * @link     https://github.com/hickop/yinyanggo
 */

/**
 * Modules.
 */

var express = require('express');

// Express is the application.
var app = express();

/**
 * Configuration.
 */

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

/**
 * Routes.
 */

app.get('/', function (req, res) {
    res.render('index', { title: 'Yin yan go' });
});

app.get('/nickname', function (req, res) {
    var nickname = '';

    res.send({ nickname: nickname });
});
/**
 * Server init.
 */

app.listen(3000, function () {
    console.log('Express server listening on port 3000');
});
