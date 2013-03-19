/**
 * Databases module.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var mongoose = require('mongoose'),
    db = mongoose.createConnection('localhost', 'yinyango');

mongoose.connection.on('error', function () {
    console.error.bind(console, 'db connection error:');
});

var userSchema = new mongoose.Schema({
    name:       String,
    email:      String,
    salt:       String,
    hash:       String,
    sgfid:      String,
    lang:       String
});
var sgfSchema = new mongoose.Schema({
    name:       String,
    submitter:  String,
    date:       Date,
    category:   String,
    md5:        { type: String, unique: true },
    size:       Number,
    data:       Object
});

module.exports.User = db.model('user', userSchema);
module.exports.Sgf = db.model('sgf', sgfSchema);
