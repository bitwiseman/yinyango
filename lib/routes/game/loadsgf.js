/**
 * Request loading an SGF file.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
var fs = require('fs'),
    sgf = require('../../sgf');

module.exports = function (req, res) {
    var method = req.params.method,
        file;

    if (method === 'file') {
        file = req.files.sgffile.path;
    } else {
        // TODO Get SGF at given URL.
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
};
