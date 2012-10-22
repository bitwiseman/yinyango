/**
 * Shared client/node module to apply go rules after a player move.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

/**
 * Exports are public functions available for client and node.
 * To call in client:
 *      <script src="gorules.js">
 *          console.log(gorules.function(params));
 *      </script>
 * To call in node:
 *      var gorules = require(./shared/gorules);
 *      console.log(gorules.function(params));
 */
(function(exports) {

    /** playMove {{{
     * Play a stone and return new goban state based on previous state.
     *
     * @param {String}  color  Color of played stone.
     * @param {String}  coord  Coordinate of played stone in letters.
     * @param {Array}   state  Previous goban state before playing the stone.
     *
     * @return {Array} New goban state after playing the stone and applying
     *                 rules.
     */
    exports.playMove = function (color, coord, state) {
        var x = charCodeAt(substr(coord, 0, 1)) - 97, // Coord to Integer.
            y = charCodeAt(substr(coord, 1, 1)) - 97;

        // Add played stone to previous state.
        state[x][y] = color;
        // Test if that makes captures and get new state if so.
        //state = testCaptures(color, x, y, state);
        // TODO Calculate KO.

        return state;
    };
    /*}}}*/

})(typeof exports === 'undefined' ? this['gorules'] = {} : exports);

