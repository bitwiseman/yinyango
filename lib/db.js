/**
 * Databases express middleware.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var mongoose = require('mongoose'),
    mongodb = mongoose.createConnection('localhost', 'yinyango');

mongoose.connection.on('error', function () {
    console.error.bind(console, 'db connection error:');
});

var userSchema = new mongoose.Schema({
    name: String,
    email: String,
    salt: String,
    hash: String,
    lang: String
});
var gameSchema = new mongoose.Schema({
    name: String,
    submitter: String,
    date: Date,
    category: String,
    size: Number,
    data: Object
});
var db = {
    User: mongodb.model('user', userSchema),
    Game: mongodb.model('game', gameSchema)
};

module.exports = function (req, res, next) {
    req.db = db;
    next();
};
