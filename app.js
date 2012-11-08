/**
 * yinyango Node.js application.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

'use strict';

/* Modules & globals. {{{*/
var express =       require('express'),
    sys =           require('sys'),
    fs =            require('fs'),
    crypto =        require('crypto'),
    exec =          require('child_process').exec,
    lingua =        require('lingua'),
    mongoose =      require('mongoose'),
    Validator =     require('validator').Validator,
    gotools =       require('./shared/gotools'),
    app =           express(),
    db =            mongoose.createConnection('localhost', 'yinyango'),
    introsgfid =    '509b8db3b8faa2580b000001';
/*}}}*/

/* Mongoose Schemas & models {{{*/
var userSchema = new mongoose.Schema({
    name:   String,
    email:  String,
    salt:   String,
    hash:   String,
    sgfid:  String,
    lang:   String
});
var sgfSchema = new mongoose.Schema({
    name:       String,
    submitter:  String,
    date:       Date,
    category:   String,
    md5:        { type: String, unique: true },
    data:       Object
});
var User = db.model('user', userSchema);
var Sgf = db.model('sgf', sgfSchema);
/*}}}*/

/* Configuration. {{{*/
app.configure(function () {
    app.set('views', __dirname + '/views/');
    app.set('view engine', 'jade');
    app.use(lingua(app, { defaultLocale: 'en', path: __dirname + '/i18n' }));
    app.use(express.logger('dev'));
    app.use(express.compress());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({ secret: 'Not a vegetable' }));
    app.use(express.static(__dirname + '/public'));
    app.use(express.static(__dirname + '/shared'));
    app.use(app.router);
});
app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.configure('production', function () {
    app.use(express.errorHandler());
});
db.on('error', console.error.bind(console, 'db connection error:'));
/*}}}*/

/* Prototypes {{{*/
Validator.prototype.error = function (msg) {
    this._errors.push(msg);
    return this;
};

Validator.prototype.getErrors = function () {
    return this._errors;
};
/*}}}*/

/* Functions. {{{*/
/** restricted {{{
 * Restrict some pages to registered users.
 */
function restricted(req, res, next) {
    if (req.session.userid) {
        next();
    } else {
        res.redirect('/');
    }
}
/*}}}*/

/** getLang {{{
 * Return language of browser if set and supported, else default to english.
 */
function getLang(req) {
    var supported = [ 'en', 'fr' ],
        supplen = supported.length,
        lang,
        i;

    if (req.headers["accept-language"] !== undefined) {
        lang = req.headers["accept-language"].substr(0, 2);
        for (i = 0; i < supplen; i++) {
            if (lang === supported[i]) {
                return req.headers["accept-language"].substr(0, 2);
            }
        }
    }
    return 'en';
}
/*}}}*/

/** checkSgf {{{
 * Check if a sgf file is valid with sgfc.
 *
 * @param {String}      sgf     Path to sgf file.
 * @param {Function}    fn      Callback(valid). valid: 1 or 0.
 */
function checkSgf(sgf, fn) {
	exec('bin/sgfc ' + sgf, function (error, stdout, stderr) {
        var check = stdout.replace(/\s+$/, '').slice(-2);

        if (check === 'OK') {
            fn(1);
        } else {
            fn(0);
        }

        if (error) {
            console.log('checkSgf exec error: ' + error);
        }
        if (stderr) {
            console.log('sgfc error: ' + stderr);
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
function hash(pwd, salt, fn) {
    var len =           128,
        iterations =    12000;

    if (fn !== undefined) {
        crypto.pbkdf2(pwd, salt, iterations, len, fn);
    } else {
        fn = salt;
        crypto.randomBytes(len, function (err, salt) {
            if (err) {
                return fn(err);
            }
            salt = salt.toString('base64');
            crypto.pbkdf2(pwd, salt, iterations, len, function (err, hash) {
                if (err) {
                    return fn(err);
                }
                fn(null, salt, hash);
            });
        });
    }
}
/*}}}*/
/*}}}*/

/* Routes. {{{*/
/** get / {{{
 * Application start.
 */
app.get('/', function (req, res) {
    var username =  req.session.username,
        sgfid =     req.session.sgfid;

    // Login if user session is set.
    if (username) {
        res.render('yygo', { username: username });
    } else {
        res.render('login', { error: '' });
    }
});
/*}}}*/

/** get /guest {{{
 * Guest login.
 */
app.get('/guest', function (req, res) {
    req.session.username = 'guest';
    req.session.sgfid = introsgfid; 
    res.redirect('/');
});
/*}}}*/

/** get /load {{{
 * Load game.
 */
app.get('/load', function (req, res) {
    var page = 0,
        next,
        filters,
        options,
        games;

    filters = 'name';
    options = { sort: { _id: -1 }, skip: page * 10, limit: 11 };
    Sgf.find({}, filters, options, function (err, sgfs) {
        if (sgfs.length === 11) { // More than one page.
            next = true;
        } else {
            next = false;
        }
        res.render('load', {
            page: page,
            next: next,
            sgfs: sgfs
        });
    });
});
/*}}}*/

/** get /load/:id {{{
 * Load selected game or navigate in pages.
 */
app.get('/load/:id', function (req, res) {
    var id = req.params.id,
        userid = req.session.userid;

    if (id === 'next') {
        console.log('next');
    } else if (id === 'prev') {
        console.log('prev');
    } else {
        if (userid) {
            User.findByIdAndUpdate(userid, { sgfid: id }, function (){});
        }
        req.session.sgfid = id;
        res.redirect('/');
    }
});
/*}}}*/

/** get /logout {{{
 * User logout.
 */
app.get('/logout', function (req, res) {
    // Destroy session.
    req.session.destroy(function () {
        res.redirect('/');
    });
});
/*}}}*/

/** get /register {{{
 * Registration page.
 */
app.get('/register', function (req, res) {
    res.render('register', { error: '' });
});
/*}}}*/

/** get /sendsgf {{{
 * Page to send sgf file.
 */
app.get('/sendsgf', restricted, function (req, res) {
    res.render('sendsgf', { error: '' });
});
/*}}}*/

/** get /session {{{
 * Return user session infos and game data.
 */
app.get('/session', function (req, res) {
    var username =  req.session.username || 'guest',
        sgfid =     req.session.sgfid;

    if (sgfid !== '') {
        Sgf.findById(sgfid, function (err, sgf) {
            if (err) { // Game does not exist.
                res.send({ username: username, data: '' });
                return;
            }
            res.send({ username: username, data: sgf.data });
        });
    } else {
        res.send({ username: username, data: '' });
    }
});
/*}}}*/

/** get /settings {{{
 * User parameters page.
 */
app.get('/settings', function (req, res) {
    var lang = req.cookies.language;

    res.render('settings', { lang: lang });
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
    validator.check(username).len(1, 15).is(validname);
    validator.check(password).len(1, 64);

    if (validator.getErrors().length === 0) {
        User.findOne({ name: username }, function (err, user) {
            if (err) {
                console.error('User.findOne error: ' + err);
                return;
            }
            if (user) {
                // Compare hashs.
                hash(password, user.salt, function (err, hash) {
                    if (err) {
                        console.error('hash error: ' + err);
                        return;
                    }
                    if (hash === user.hash) {
                        // Save in session and reload.
                        req.session.userid =    user._id;
                        req.session.username =  user.name;
                        req.session.sgfid =     user.sgfid;
                        res.cookie('language', user.lang);
                        res.redirect('/');
                    } else {
                        res.render('login', { error: 'login' });
                    }
                });
            } else {
                res.render('login', { error: 'login' });
            }
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
        lang =      req.cookies.language,
        validname = /^[a-zA-Z0-9]+$/,
        validator = new Validator(),
        error =     '',
        errors,
        errorslen,
        i;

    // Always check received data before using it.
    validator.check(username).len(1, 15).is(validname);
    validator.check(email).len(6, 64).isEmail();
    validator.check(password).len(1, 64);
    errors = validator.getErrors();
    errorslen = errors.length;

    if (errorslen === 0) {
        User.findOne({ name: username }, function (err, user) {
            if (err) {
                console.error('User.findOne error: ' + err);
                return;
            }
            if (user) { // User name already exist.
                res.render('register', { error: 'exist' });
            } else { // Generate salt and hash and insert in database.
                hash(password, function (err, salt, hash) {
                    if (err) {
                        console.error('hash error: ' + err);
                        return;
                    }

                    var user = new User({
                        name: username,
                        email: email,
                        salt: salt,
                        hash: hash,
                        sgfid: introsgfid,
                        lang: lang
                    });

                    user.save(function (err) {
                        if (err) {
                            console.error('user.save error: ' + err);
                            return;
                        }
                        // Registration successful.
                        res.render('register', { error: 'none' });
                    });
                });
            }
        });
    } else { // Errors in validator.
        for (i = 0; i < errorslen; i++) {
            if (errors[i] === 'Invalid characters') {
                error = 'name';
            }
        }
        res.render('register', { error: error });
    }
});
/*}}}*/

/** post /sendsgf {{{
 * Save sent sgf file to database.
 */
app.post('/sendsgf', function (req, res) {
    var file =      req.files.sgffile.path,
        category =  req.body.categoryselect,
        name =      req.body.name || req.files.sgffile.name,
        date =      new Date(),
        userid =    req.session.userid,
        username =  req.session.username,
        error =     '',
        md5,
        sgf;

    // Make sure data comes from registered user.
    User.findById(userid, function (err, user) {
        if (err) {
            console.error('User.findById error: ' + err);
            return;
        }
        if (user) {
            checkSgf(file, function (valid) {
                if (valid) {
                    fs.readFile(file, function (err, data) {
                        if (err) {
                            console.error('fs.readFile error: ' + err);
                            return;
                        }
                        md5 = crypto.createHash('md5').update(data)
                                .digest('hex');
                        gotools.parseSgf(data.toString(), function (obj) {
                            sgf = new Sgf({
                                name:       name,
                                submitter:  username,
                                date:       date,
                                category:   category,
                                md5:        md5,
                                data:       obj
                            });
                            sgf.save(function (err) {
                                if (err && err.code === 11000) { // duplicate.
                                    res.render('sendsgf', { error: 'md5' });
                                } else {
                                    res.render('sendsgf', { error: 'none' });
                                }
                            });
                        });
                    });
                } else {
                    res.render('sendsgf', { error: 'invalid' });
                }
            });
        }
    });
});
/*}}}*/

/** post /settings {{{
 * Apply user parameters.
 * Use _id for faster database access as it's indexed.
 */
app.post('/settings', function (req, res) {
    var lang =      req.body.langselect,
        userid =    req.session.userid,
        validator = new Validator(),
        settings;

    // Always check received data before using it.
    validator.check(lang).len(2, 2).isAlpha();

    // Update user settings in database.
    if (userid && validator.getErrors().length === 0) {
        settings = { lang: lang };
        User.findByIdAndUpdate(userid, settings, function (){});
    }

    // Update cookie.
    if (validator.getErrors().length === 0) {
        res.cookie('language', lang);
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
});
