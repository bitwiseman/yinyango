/**
 * Request database games list.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
module.exports = function (req, res) {
    //var page = req.params.page,
    var filters,
        options;

    filters = 'name';
    //options = { sort: { _id: -1 }, skip: page * 10, limit: 11 };
    options = { sort: { _id: -1 } };
    req.db.Game.find({}, filters, options, function (err, games) {
        if (err) {
            console.error('db.Game.find: ' + err);
            return;
        }
        res.send(games);
    });
};
