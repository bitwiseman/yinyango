/**
 * Yin yang go Node.js application.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0
 * @link     https://github.com/hickop/yinyanggo
 */

/**
 * Modules.
 */

var express = require('express');

var app = express();

/**
 * Configuration.
 */

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('locales', __dirname + '/locales');
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({ secret: 'Not a vegetable' }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});
app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.configure('production', function () {
    app.use(express.errorHandler());
});

/**
 * Routes.
 */

app.get('/', function (req, res) {
    var username =  req.session.username || 'guest',
        lang =      req.session.lang ||
                    req.headers["accept-language"].substr(0, 2) || 'en',
        locale =    require(app.get('locales') + '/' + lang);

    if (username === 'guest') {
        res.render('index', { 
            title: 'Yin yang go',
            locale: locale
        });
    } else {
        res.redirect('/yygo');
    }
});

app.get('/guest', function (req, res) {
    req.session.username = 'guest';
    req.session.lang = req.headers["accept-language"].substr(0, 2) || 'en';
    res.redirect('/yygo');
});

app.get('/session', function (req, res) {
    var username = req.session.username || 'guest';

    res.send({ username: username });
});

app.get('/session/:id', function (req, res) {
    req.session.username = req.params.id;
    res.send(req.session.username);
});

app.get('/yygo', function (req, res) {
    var username =  req.session.username,
        locale;

    if (typeof(username) !== 'undefined') {
        locale = require(app.get('locales') + '/' + req.session.lang);
        res.render('yygo', { 
            title: 'Yin yang go',
            username: username,
            locale: locale
        });
    } else {
        res.redirect('/');
    }
});
/**
 * Server init.
 */

app.listen(3000, function () {
    console.log('Express server listening on port 3000');
});
