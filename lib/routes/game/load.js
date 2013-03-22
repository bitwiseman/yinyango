/**
 * Request database game data to load.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
module.exports = function (req, res) {
    var id = req.params.id;

    req.db.Game.findById(id, function (err, game) {
        if (err) {
            console.error('Sgf.findById error: ' + err);
            return;
        }
        res.send(game.data);
    });
};
