/**
 * yinyango Node.js application.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

/* Modules & globals. {{{*/
var express =   require('express'),
    sys =       require('sys'),
    crypto =    require('crypto'),
    exec =      require('child_process').exec,
    mongo =     require('mongodb'),
    Validator = require('validator').Validator,
    gotools =   require('./shared/gotools'),
    app =       express(),
    Server =    mongo.Server,
    Db =        mongo.Db,
    ObjectID =  mongo.ObjectID,
    server =    new Server('localhost', 27017, { auto_reconnect: true }),
    db =        new Db('yinyango', server, { safe: true }),
    title =     'yinyango';
/*}}}*/

/* Configuration. {{{*/
app.configure(function () {
    app.set('views', __dirname + '/views/');
    app.set('view engine', 'jade');
    app.set('locales', __dirname + '/locales/');
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
/*}}}*/

/* Prototypes {{{*/
Validator.prototype.error = function (msg) {
    this._errors.push(msg);
    return this;
}

Validator.prototype.getErrors = function () {
    return this._errors;
}
/*}}}*/

/* Functions. {{{*/
/** getBrowserLang {{{
 * Get the browser language if set, else default to english.
 */
var getBrowserLang = function (req) {
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
 * @param {String}      sgf     Path to sgf file.
 * @param {Function}    fn      Callback(valid). valid: 1 or 0.
 */
var checkSgf = function (sgf, fn) {
	exec('bin/sgfc ' + sgf, function(error, stdout, stderr) {
        var check = stdout.replace(/\s+$/,'').slice(-2);

        if (check === 'OK') {
            fn(1);
        } else {
            fn(0);
        }
    });
}
/*}}}*/

/** hash {{{
 * Hashes a password with optional salt, otherwise generate a salt for 
 * password and return both salt and hash.
 * Taken from express auth example.
 *
 * @param {String}      pwd     Password to hash.
 * @param {String}      salt    Optional salt.
 * @param {Function}    fn      Callback function. 
 */
var hash = function (pwd, salt, fn) {
    var len =           128,
        iterations =    12000;

    if (arguments.length === 3) {
        crypto.pbkdf2(pwd, salt, iterations, len, fn);
    } else {
        fn = salt;
        crypto.randomBytes(len, function (err, salt) {
            if (err) return fn(err);
            salt = salt.toString('base64');
            crypto.pbkdf2(pwd, salt, iterations, len, function (err, hash) {
                if (err) return fn(err);
                fn(null, salt, hash);
            });
        });
    }
};
/*}}}*/
/*}}}*/

/* Routes. {{{*/
/** get / {{{
 * Application start.
 */
app.get('/', function (req, res) {
    var username =  req.session.username,
        lang =      req.session.lang || getBrowserLang(req),
        locale =    require(app.get('locales') + lang);

    // Login if user session is set.
    if (username) {
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
        locale =    require(app.get('locales') + lang); 

    res.render('register', { title: title, locale: locale, error: '' });
});
/*}}}*/

/** get /sendsgf {{{
 * Page to send sgf file.
 */
app.get('/sendsgf', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + lang); 

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

/** get /settings {{{
 * User parameters page.
 */
app.get('/settings', function (req, res) {
    var lang =      req.session.lang || getBrowserLang(req), 
        locale =    require(app.get('locales') + lang); 

    res.render('settings', {
        title: title,
        locale: locale,
        lang: lang
    });
});
/*}}}*/

/** post /login {{{
 * User login.
 */
app.post('/login', function (req, res) {
    var username =  req.body.username,
        password =  req.body.password,
        validname = /^[a-zA-Z0-9]+$/,
        validator = new Validator();

    // Always check received data before using it.
    validator.check(username).len(1,15).is(validname);
    validator.check(password).len(1,64);

    if (validator.getErrors().length === 0) {
        db.open(function (err, db) {
            db.collection('users', function (err, collection) {
                collection.findOne({ name: username }, function (err, result) {
                    if (result) {
                        // Hash password with user salt.
                        hash(password, result.salt, function (err, hash) {
                            if (hash === result.hash) {
                                // All ok save session and reload.
                                req.session.username = username;
                                req.session.lang = result.lang;
                                req.session.userid = result._id;
                                db.close();
                                res.redirect('/');
                            } else {
                                db.close();
                                res.redirect('/');
                            }
                        });
                    } else {
                        db.close();
                        res.redirect('/');
                    }
                });
            });
        });
    }
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
        locale =    require(app.get('locales') + lang), 
        validname = /^[a-zA-Z0-9]+$/,
        validator = new Validator(),
        error =     '',
        errors, errorslen, i;

    // Always check received data before using it.
    validator.check(username).len(1,15).is(validname);
    validator.check(email).len(6,64).isEmail();
    validator.check(password).len(1,64);
    errors = validator.getErrors();
    errorslen = errors.length;

    if (errorslen === 0) {
        db.open(function (err, db) {
            if (!err) {
                db.collection('users', function (err, collection) {
                    collection.findOne({ name: username }, 
                            function (err, result) {
                        if (result) { // Name already exist.
                            db.close();
                            res.render('register', {
                                title: title,
                                locale: locale,
                                error: 'exist'
                            });
                        } else {
                            // Generate hash and salt and insert in database.
                            hash(password, function (err, salt, hash) {
                                collection.insert({
                                    name:  username,
                                    email: email,
                                    salt:  salt,
                                    hash:  hash,
                                    lang:  lang
                                }, function (err, result) {
                                    db.close();
                                    res.render('register', {
                                        title: title,
                                        locale: locale,
                                        error: 'success'
                                    });
                                });
                            });
                        }
                    });
                });
            }
        });
    } else {
        for (i = 0; i < errorslen; i++) {
            if (errors[i] === 'Invalid characters') {
                error = 'name';
            }
        }
        res.render('register', {
            title: title,
            locale: locale,
            error: error
        });
    }
});
/*}}}*/

/** post /settings {{{
 * Apply user parameters.
 * Use _id for faster database access as it's indexed.
 */
app.post('/settings', function (req, res) {
    var lang =      req.body.langselect,
        validator = new Validator(),
        userid;

    if (req.session.userid) {
        userid = new ObjectID(req.session.userid);
    }

    // Always check received data before using it.
    validator.check(lang).len(2,2).isAlpha(); 

    if (userid && validator.getErrors().length === 0) {
        db.open(function (err, db) {
            db.collection('users', function (err, collection) {
                collection.update({ _id: userid }, { $set:{ lang: lang }},
                        function (err, result) {
                    db.close();
                });
            });
        });
    }

    if (validator.getErrors().length === 0) {
        req.session.lang = lang;
    }

    res.redirect('/settings');
});
/*}}}*/

app.get('/test', function (req, res) {
    res.render('test', { title: title });
});
/*}}}*/

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
