/**
 * yinyango Node.js application.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
/* jshint node: true */
'use strict';
/* Modules & globals. {{{*/
var express =       require('express.io'),
    app =           express().http().io(),
    db =            require('./lib/db'),
    pass =          require('pwd'),
    //sys =           require('sys'),
    fs =            require('fs'),
    //exec =          require('child_process').exec,
    //spawn =         require('child_process').spawn,
    Validator =     require('validator').Validator,
    sgf =           require('./lib/sgf'),
    //gnugo =         spawn('gnugo', ['--mode', 'gtp']),
    onemonth =      2592000000,
    oneyear =       31104000000,
    userslist =     {};
/*}}}*/
require('./lib/config')(app);
/* Prototypes. {{{*/
Validator.prototype.error = function (msg) {
    this._errors.push(msg);
    return this;
};
Validator.prototype.getErrors = function () {
    return this._errors;
};
/*}}}*/
/* Routes. {{{*/
/* get / {{{
 * Application start.
 */
app.get('/', function (req, res) {
    var username =  req.session.username,
        isguest =   req.session.isguest,
        lang =      req.cookies.language,
        dev = app.settings.env === 'development' ? true : false;

    // Login if user session is set.
    if (username) {
        // Check if user still exist in database.
        if (!isguest) {
            db.User.findOne({ name: username }, function (err, user) {
                if (err) {
                    console.error('User.findOne error: ' + err);
                    return;
                }
                if (user) {
                    res.render('yygo', { dev: dev, lang: lang });
                } else {
                    res.render('login', { dev: dev });
                }
            });
        } else {
            res.render('yygo', { dev: dev, lang: lang });
        }
    } else {
        res.render('login', { dev: dev });
    }
});
/*}}}*/
/* get /gameslist/:page {{{
 * Send games corresponding to a page.
 */
app.get('/gameslist/:page', function (req, res) {
    //var page = req.params.page,
    var filters,
        options;

    filters = 'name';
    //options = { sort: { _id: -1 }, skip: page * 10, limit: 11 };
    options = { sort: { _id: -1 } };
    db.Sgf.find({}, filters, options, function (err, games) {
        if (err) {
            console.error('Sgf.find: ' + err);
            return;
        }
        res.send(games);
    });
});
/*}}}*/
/* get /load/:id {{{
 * Load selected game or navigate in pages.
 */
app.get('/load/:id', function (req, res) {
    var id =        req.params.id,
        userid =    req.session.userid;

    db.Sgf.findById(id, function (err, sgf) {
        var settings = { sgfid: id };

        if (err) {
            console.error('Sgf.findById error: ' + err);
            return;
        }
        if (userid) {
            db.User.findByIdAndUpdate(userid, settings, function () {});
        }
        req.session.sgfid = id;
        res.send(sgf.data);
    });
});
/*}}}*/
/* get /logout {{{
 * User logout.
 */
app.get('/logout', function (req, res) {
    // Destroy session.
    req.session.destroy(function () {
        res.redirect('/');
    });
});
/*}}}*/
/* post /guest {{{
 * Guest login.
 */
app.post('/guest', function (req, res) {
    var username =  req.body.guestname,
        validname = /^[a-zA-Z0-9]+$/,
        validator = new Validator();

    // Always check received data before using it.
    validator.check(username).len(1, 15).is(validname);

    // Check if that guest name is taken by regular user or already connected.
    if (validator.getErrors().length === 0) {
        db.User.findOne({ name: username }, function (err, user) {
            if (err) {
                console.error('User.findOne error: ' + err);
                return;
            }
            if (user || userslist[username] !== undefined) {
                res.send({ error: 'exist' });
            } else {
                req.session.username = username;
                req.session.sgfid = '';
                req.session.isguest = true;
                res.send({ error: '' });
            }
        });
    } else {
        res.send({ error: 'name' });
    }
});
/*}}}*/
/* post /loadsgf/:method {{{
 * Load an SGF file provided by user or from a given URL.
 */
app.post('/loadsgf/:method', function (req, res) {
    var method = req.params.method,
        file;

    if (method === 'file') {
        file = req.files.sgffile.path;
    } else {
        // Get SGF at given URL.
    }
    sgf.validate(file, function (err, valid) {
        if (err) {
            console.error(err);
            return;
        }
        if (valid) {
            fs.readFile(file, function (err, data) {
                if (err) {
                    console.error('fs.readFile error: ' + err);
                    return;
                }
                sgf.parse(data.toString(), function (data) {
                    res.send(data);
                });
            });
        } else {
            res.send({ error: 'invalid' });
        }
    });
});
/*}}}*/
/* post /login {{{
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
        db.User.findOne({ name: username }, function (err, user) {
            if (err) {
                console.error('User.findOne error: ' + err);
                return;
            }
            if (user) {
                // Compare hashs.
                pass.hash(password, user.salt, function (err, hash) {
                    console.log(hash);
                    if (err) {
                        console.error('hash error: ' + err);
                        return;
                    }
                    if (hash === user.hash) {
                        // Save in session and reload.
                        req.session.userid =    user._id;
                        req.session.username =  user.name;
                        req.session.sgfid =     user.sgfid;
                        req.session.isguest =   false;
                        res.cookie('language', user.lang, { maxAge: oneyear });
                        res.send({ error: '' });
                    } else {
                        res.send({ error: 'login' });
                    }
                });
            } else {
                res.send({ error: 'login' });
            }
        });
    } else {
        res.send({ error: 'login' });
    }
});
/*}}}*/
/* post /register {{{
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
        db.User.findOne({ name: username }, function (err, user) {
            if (err) {
                console.error('User.findOne error: ' + err);
                return;
            }
            if (user) {
                res.send({ error: 'exist' });
            } else {
                // Generate salt and hash and insert in database.
                pass.hash(password, function (err, salt, hash) {
                    if (err) {
                        console.error('hash error: ' + err);
                        return;
                    }

                    var user = new db.User({
                        name: username,
                        email: email,
                        salt: salt,
                        hash: hash,
                        sgfid: '',
                        lang: lang
                    });

                    user.save(function (err) {
                        if (err) {
                            console.error('user.save error: ' + err);
                            return;
                        }
                        // Registration successful.
                        res.send({ error: '' });
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
        res.send({ error: error });
    }
});
/*}}}*/
/* post /settings {{{
 * Apply user parameters.
 * Use _id for faster database access as it's indexed.
 */
app.post('/settings', function (req, res) {
    var lang =      req.body.lang,
        userid =    req.session.userid,
        validator = new Validator(),
        settings,
        errors;

    // Always check received data before using it.
    validator.check(lang).len(2, 2).isAlpha();
    errors = validator.getErrors().length;

    // Update user settings in database.
    if (userid && errors === 0) {
        settings = { lang: lang };
        db.User.findByIdAndUpdate(userid, settings, function (err) {
            if (!err) {
                res.cookie('language', lang, { maxAge: oneyear });
                res.send({ error: '' });
            } else {
                res.send({ error: 'lang' });
            }
        });
    } else if (req.session.isguest && errors === 0) {
        // Update cookie only as it is guest user.
        res.cookie('language', lang, { maxAge: oneyear });
        res.send({ error: '' });
    } else {
        res.send({ error: 'error' });
    }
});
/*}}}*/
/*}}}*/
/* IO Routes. {{{*/
/* join {{{*/
app.io.route('join', function (req) {
    var users = [],
        user;

    // Check if that user is already connected.
    if (userslist[req.session.username] !== undefined) {
        req.io.respond({ success: false });
    } else {
        // Add user to users list.
        userslist[req.session.username] = req.io.socket.id;
        // Generate users list.
        for (user in userslist) {
            users.push(user);
        }
        // Broadcast new user to connected users.
        req.io.broadcast('user-joined', req.session.username);
        // Send session settings and users list to new user.
        req.io.respond({
            success: true,
            username: req.session.username,
            isguest: req.session.isguest,
            users: users
        });
    }
});
/*}}}*/
/* disconnect {{{*/
app.io.route('disconnect', function (req) {
    // Check if disconnected socket is the first one created by user.
    if (userslist[req.session.username] === req.io.socket.id) {
        // Remove user from list.
        delete userslist[req.session.username];
        req.io.broadcast('user-left', req.session.username);
    }
});
/*}}}*/
/* chat {{{*/
app.io.route('chat', function (req) {
    if (req.data !== '') {
        app.io.broadcast('chat', '<strong>' + req.session.username +
                         ': </strong>' + req.data);
    }
});
/*}}}*/
/*}}}*/
/* Server init. {{{*/
app.listen(3000, function () {
    console.log('Express server listening on port 3000');
    //gnugo.stdout.on('data', function (data) {
    //console.log(data.toString());
    //});
    //gnugo.stdin.write('genmove b\n');
    //gnugo.stdin.write('list_stones b\n');
    //gnugo.stdin.write('genmove w\n');
    //gnugo.stdin.write('list_stones w\n');
    //gnugo.stdin.write('list_stones b\n');
});
/*}}}*/
