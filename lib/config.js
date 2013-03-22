/**
 * Server configuration.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var express = require('express.io'),
    RedisStore = require('connect-redis')(express),
    lingua = require('lingua'),
    onemonth = 2592000000,
    root = __dirname + '/..';

module.exports = function (app) {
    app.configure('development', function () {
        app.use(express.logger('dev'));
        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack: true
        }));
    });
    app.configure('production', function () {
        app.io.set('log level', 1);
        app.use(express.errorHandler());
    });
    app.io.enable('log');
    app.set('views', root + '/views/');
    app.set('view engine', 'jade');
    app.use(lingua(app, {
        defaultLocale: 'en',
        path: root + '/i18n'
    }));
    app.use(express.compress());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({
        secret: 'Not a vegetable',
        store: new RedisStore(),
        cookie: {
            maxAge: onemonth
        }
    }));
    app.io.set('store', new express.io.RedisStore());
    app.use(express.static(root + '/public'));
    app.use(express.logger('short'));
    app.use(app.router);
};
