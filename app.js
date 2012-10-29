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
    sys =       require('sys'),
    exec =      require('child_process').exec,
    gotools =   require('./shared/gotools'),
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
    app.use(express.static(__dirname + '/shared'));
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

/** getBrowserLang {{{
 * Get the browser language if set, else default to english.
 */
function getBrowserLang(req) {
    if (typeof(req.headers["accept-language"]) !== 'undefined') {
        return req.headers["accept-language"].substr(0, 2);
    } else {
        return 'en';
    }
}
/*}}}*/

/** checkSgf {{{
 * Check if a sgf file is valid with sgfc.
 *
 * @param {String}      sgf         Path to sgf file.
 * @param {Function}    callback    Callback(valid). valid: 1 or 0.
 */
function checkSgf(sgf, callback) {
	exec('bin/sgfc ' + sgf, function(error, stdout, stderr) {
        var check = stdout.replace(/\s+$/,'').slice(-2);

        if (check === 'OK') {
            callback(1);
        } else {
            callback(0);
        }
    });
}
/*}}}*/

/**
 * Routes.
 */

/** get / {{{
 * Application start.
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
/*}}}*/

/** get /guest {{{
 * Guest login.
 */
app.get('/guest', function (req, res) {
    req.session.username = 'guest';
    res.redirect('/');
});
/*}}}*/

/** get /logout {{{
 * User logout.
 */
app.get('/logout', function (req, res) {
    // Destroy session.
    req.session.destroy(function (err) { 
        res.redirect('/');
    });
});
/*}}}*/

/** get /register {{{
 * Registration page.
 */
app.get('/register', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + '/' + lang); 

    res.render('register', { title: title, locale: locale });
});
/*}}}*/

/** get /sendsgf {{{
 * Page to send sgf file.
 */
app.get('/sendsgf', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + '/' + lang); 

    res.render('sendsgf', { title: title, locale: locale });
});
/*}}}*/

/** get /session {{{
 * Return username.
 */
app.get('/session', function (req, res) {
    var username = req.session.username || 'guest';

    res.send({ username: username });
});
/*}}}*/

/** get /session/:id {{{
 * Set username (debugging).
 */
app.get('/session/:id', function (req, res) {
    req.session.username = req.params.id;
    res.send(req.session.username);
});
/*}}}*/

/** get /settings {{{
 * User parameters page.
 */
app.get('/settings', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + '/' + lang); 

    res.render('settings', {
        title: title,
        locale: locale,
        lang: lang
    });
});
/*}}}*/

/** post /register {{{
 * Register new user.
 */
app.post('/register', function (req, res) {
    var username =  req.body.username,
        password =  req.body.password,
        email =     req.body.email,
        lang =      req.session.lang || getBrowserLang(req),
        valid =     /^[a-zA-Z0-9]+[-_]?[a-zA-Z0-9]+$/;

    res.redirect('/');
});
/*}}}*/

/** post /settings {{{
 * Apply user parameters.
 */
app.post('/settings', function (req, res) {
    req.session.lang = req.body.langselect;

    res.redirect('/settings');
});
/*}}}*/

app.get('/test', function (req, res) {
    res.render('test', { title: title });
});

/**
 * Server init.
 */

app.listen(3000, function () {
    console.log('Express server listening on port 3000');
    // Tests.
    //var play = gotools.playMove(
        //'b',
        //'ac',
        //9,
        //{'b':['ba','bb'],'w':['aa','ab'],'k':[]}
    //);
    //console.log(play);
    //var add = gotools.addStones(
        //'',
        //['bb','dd','ad'],
        //{'b':['ba','bb','cc'],'w':['aa','ab','ee','bb','dd'],'k':[]}
    //);
    //console.log(add);
});
