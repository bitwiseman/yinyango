/**
 * Check if a SGF file is valid using sgfc.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 *
 * @param {String} sgf: Path to SGF file.
 * @param {Function} callback: Callback.
 */
var exec = require('child_process').exec;

module.exports = function (sgf, callback) {
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
