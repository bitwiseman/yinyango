/**
 * yinyango Node.js application.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

/**
 * Modules & globals.
 */

var express =   require('express'),
    app =       express(),
    title =     'yinyango';

/**
 * Configuration.
 */

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('locales', __dirname + '/locales');
    app.use(express.logger('dev'));
    app.use(express.compress());
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
 * Functions.
 */

function getBrowserLang(req) {
    if (typeof(req.headers["accept-language"]) !== 'undefined') {
        return req.headers["accept-language"].substr(0, 2);
    } else {
        return 'en';
    }
}

/**
 * Routes.
 */

app.get('/', function (req, res) {
    var username =  req.session.username,
        lang =      req.session.lang || getBrowserLang(req),
        locale =    require(app.get('locales') + '/' + lang);

    // Login if user session exist.
    if (typeof(username) !== 'undefined') {
        // Save session lang.
        req.session.lang = lang;

        res.render('yygo', { 
            title: title,
            username: username,
            locale: locale
        });
    } else {
        res.render('login', { title: title, locale: locale });
    }
});

app.get('/guest', function (req, res) {
    req.session.username = 'guest';
    res.redirect('/');
});

app.get('/logout', function (req, res) {
    // Destroy session.
    req.session.destroy(function (err) { 
        res.redirect('/');
    });
});

app.get('/register', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + '/' + lang); 

    res.render('register', { title: title, locale: locale });
});

app.get('/sendsgf', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + '/' + lang); 

    res.render('sendsgf', { title: title, locale: locale });
});

app.get('/session', function (req, res) {
    var username = req.session.username || 'guest';

    res.send({ username: username });
});

app.get('/session/:id', function (req, res) {
    req.session.username = req.params.id;
    res.send(req.session.username);
});

app.get('/settings', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + '/' + lang); 

    res.render('settings', {
        title: title,
        locale: locale,
        lang: lang
    });
});

app.get('/test', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + '/' + lang); 

    res.render('settings', {
        title: title,
        locale: locale,
        lang: lang
    });
});

app.post('/settings', function (req, res) {
    req.session.lang = req.body.langselect;

    res.redirect('/settings');
});

/**
 * Server init.
 */

app.listen(3000, function () {
    console.log('Express server listening on port 3000');
});
