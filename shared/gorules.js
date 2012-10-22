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

    /** stateToArray {{{
     * Transform game state to an array.
     * b: black, w: white, k: ko. 
     *
     * @param {Integer} size    Goban size.
     * @param {Object}  state   Game state to convert.
     *
     * @return {Array} Array representing the goban of that state.
     */
    var stateToArray = function (size, state) {
        var barr = state.stones.b.split(','),
            warr = state.stones.w.split(','),
            karr = state.ko.split(','),
            blen = barr.length,
            wlen = warr.length,
            klen = karr.length,
            i, j, b, w, k,
            goban = [];

        // Generate empty goban.
        for (i = 0; i < size; i++) {
            goban[i] = []; 
            for (j = 0; j < size; j++) {
                goban[i][j] = ''; 
            }
        }

        // Add black stones.
        if (barr[0] !== '') {
            for (b = 0; b < blen; b++) {
                var x = barr[b].charCodeAt(0) - 97,
                    y = barr[b].charCodeAt(1) - 97;

                goban[x][y] = 'b';
            }
        }

        // Add white stones.
        if (warr[0] !== '') {
            for (w = 0; w < wlen; w++) {
                var x = warr[w].charCodeAt(0) - 97,
                    y = warr[w].charCodeAt(1) - 97;

                goban[x][y] = 'w';
            }
        }

        // Add kos.
        if (karr[0] !== '') {
            for (k = 0; k < klen; k++) {
                var x = karr[k].charCodeAt(0) - 97,
                    y = karr[k].charCodeAt(1) - 97;

                goban[x][y] = 'k';
            }
        }

        return goban;
    };
    /*}}}*/

    /** playMove {{{
     * Play a stone and return new goban state based on previous state.
     *
     * @param {String}  color   Color of played stone.
     * @param {String}  coord   Coordinate of played stone in letters.
     * @param {Integer} size    Goban size.
     * @param {Object}  state   Previous goban state before playing the stone.
     *
     * @return {Object} New goban state after playing the stone and applying
     *                  rules.
     */
    exports.playMove = function (color, coord, size, state) {
        var x =         coord.charCodeAt(0) - 97, // Coord to Integer.
            y =         coord.charCodeAt(1) - 97,
            goban =     stateToArray(size, state);
            newstate =  {};

        // Add played stone to goban.
        goban[x][y] = color;
        // Test if that makes captures and get new state if so.
        //state = testCaptures(color, x, y, state);
        // TODO Calculate KO.

        return newstate;
    };
    /*}}}*/

})(typeof exports === 'undefined' ? this['gorules'] = {} : exports);

