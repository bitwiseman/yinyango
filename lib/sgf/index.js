/**
 * Library to manipulate SGF files.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

var exec = require('child_process').exec;

/** isValid {{{
 * Check if a sgf file is valid with sgfc.
 *
 * @param {String} sgf: Path to sgf file.
 * @param {Function} callback: Callback if file is valid.
 */
exports.isValid = function (sgf, callback) {
    exec('bin/sgfc -et ' + sgf + ' ' + sgf, function (error, stdout, stderr) {
        var check = stdout.replace(/\s+$/, '').slice(-2);

        if (error) {
            callback('[ERROR] Sgfc: ' + error);
        }
        if (stderr) {
            callback('[ERROR] Sgfc: ' + stderr);
        }

        if (check === 'OK') {
            callback(null, true);
        } else {
            callback(null, false);
        }
    });
};
/*}}}*/
