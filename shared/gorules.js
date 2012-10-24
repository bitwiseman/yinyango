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
(function (exports) {

    /**
     * Private functions.
     */

    /** gobanToStones {{{
     * Transform goban array to stones list.
     *
     * @param {Integer} size    Goban size.
     * @param {Array}   goban   Goban to convert.
     *
     * @return {Object} { 'b':{String} (black stones on goban),
     *                    'w':{String} (white stones on goban),
     *                    'k':{String} (kos on goban) }
     */
    var gobanToStones = function (size, goban) {
        var stones =    { 'b':[], 'w':[], 'k':[] },
            letters =   ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
                         'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
            coord, x, y;

        for (x = 0; x < size; x++) {
            for (y = 0; y < size; y++) {
                coord = letters[x] + letters[y];
                if (goban[x] !== undefined && goban[x][y] !== undefined) {
                    if (goban[x][y] === 'b') {
                        stones.b.push(coord);
                    } else if (goban[x][y] === 'w') {
                        stones.w.push(coord);
                    } else if (goban[x][y] === 'k') {
                        stones.k.push(coord);
                    }
                }
            }
        }

        return stones;
    };
    /*}}}*/

    /** stonesToGoban {{{
     * Transform stones list to a goban array.
     * b: black, w: white, k: ko. 
     *
     * @param {Integer} size    Goban size.
     * @param {Object}  stones  Stones list.
     *
     * @return {Array} Array representing the goban.
     */
    var stonesToGoban = function (size, stones) {
        var blen = stones.b.length,
            wlen = stones.w.length,
            klen = stones.k.length,
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
        if (stones.b[0] !== '') {
            for (b = 0; b < blen; b++) {
                var x = stones.b[b].charCodeAt(0) - 97,
                    y = stones.b[b].charCodeAt(1) - 97;

                goban[x][y] = 'b';
            }
        }

        // Add white stones.
        if (stones.w[0] !== '') {
            for (w = 0; w < wlen; w++) {
                var x = stones.w[w].charCodeAt(0) - 97,
                    y = stones.w[w].charCodeAt(1) - 97;

                goban[x][y] = 'w';
            }
        }

        // Add kos.
        if (stones.k[0] !== '') {
            for (k = 0; k < klen; k++) {
                var x = stones.k[k].charCodeAt(0) - 97,
                    y = stones.k[k].charCodeAt(1) - 97;

                goban[x][y] = 'k';
            }
        }

        return goban;
    };
    /*}}}*/

    /** testCaptures {{{
     * Test if played stone will capture stone(s).
     *
     * @param {String}  color Played color.
     * @param {Integer} x     X coordinate of played stone.
     * @param {Integer} y     Y coordinate of played stone.
     * @param {Array}   goban Goban to test.
     *
     * @return {Object} { 'goban':{Array} (goban after eventual captures),
     *                    'prisonners':{Integer} (number of prisonners) }.
     */
    var testCaptures = function (color, x, y, goban) {
        var result = { 'goban':[], 'prisonners':0 },
            prisonners = 0;

        function checkDirection(x, y) {
            var test = testLiberties(color, x, y, goban, []);

            if (test[0] === 0) { // No liberties found.
                goban = removePrisonners(goban, test[1]);
                prisonners += test[1].length;
            }
        }
        // Test each direction.
        checkDirection(x-1, y);
        checkDirection(x, y-1);
        checkDirection(x+1, y);
        checkDirection(x, y+1);

        result.goban = goban;
        result.prisonners = prisonners;

        return result;
    }
    /*}}}*/

    /** testLiberties {{{
     * Test liberties of a stone or a group of stones recursively.
     * Inspired by eidogo algorithm.
     *
     * @param {String}  color       Color of the played stone.
     * @param {Integer} x           X coordinate to test.
     * @param {Integer} y           Y coordinate to test.
     * @param {Array}   goban       Goban state to test.
     * @param {Array}   prisonners  Potential prisonners.
     *
     * @return {Array} [ {Integer}
     *                   (0: No liberties or already in prisonners list.
     *                    1: Has liberties.
     *                    2: Same color or goban border.),
     *                   {Array} (Potential prisonners) ]
     */
    var testLiberties = function (color, x, y, goban, prisonners) {
        var ennemy = (color === 'b') ? 'w' : 'b',
            prilen = prisonners.length,
            stone, i; 

        if (goban[x] !== undefined && goban[x][y] !== undefined) {
            if (goban[x][y] === '') {
                return 1; // Liberty.
            }
            if (goban[x][y] === ennemy) { // Ennemy stone.
                stone = x + ':' + y;
                // Check if we already have this prisonner.
                for (i = 0; i < prilen; i++) {
                    if (prisonners[i] === stone) {
                        return 0;
                    }
                }

                prisonners.push(stone); // Add stone to prisonners.

                // Test recursively coordinates around the prisonner.
                if (testLiberties(color, x-1, y, goban, prisonners) === 1) {
                    return 1;
                }
                if (testLiberties(color, x, y-1, goban, prisonners) === 1) {
                    return 1;
                }
                if (testLiberties(color, x+1, y, goban, prisonners) === 1) {
                    return 1;
                }
                if (testLiberties(color, x, y+1, goban, prisonners) === 1) {
                    return 1;
                }
                // If we reached here then we found no liberties.
                return [ 0, prisonners ];
            }
            return 2; // Same color as played stone.
        } else {
            return 2; // Goban border.
        }
    }
    /*}}}*/

    /** removePrisonners {{{
     * Remove captured stone(s) from the state.
     *
     * @param {Array}   goban       Goban to remove stones from.
     * @param {Array}   prisonners  Prisonners list to remove from goban.
     *
     * @return {Array} Goban after removing prisonners.
     */
    var removePrisonners = function (goban, prisonners) {
        var prilen =    prisonners.length,
            coord =     [],
            i;

        for (i = 0; i < prilen; i++) {
            coord = prisonners[i].split(':');
            // Remove stone from goban.
            goban[coord[0]][coord[1]] = '';
        }

        return goban;
    }
    /*}}}*/

    /**
     * Public functions.
     */

    /** playMove {{{
     * Play a stone, apply rules and return new stones list and number of
     * prisonners.
     *
     * @param {String}  color   Color of played stone.
     * @param {String}  coord   Coordinate of played stone in letters.
     * @param {Integer} size    Goban size.
     * @param {Object}  stones  Stones list.
     *
     * @return {Object} { 'stones':{Object} (new stones list after playing the
     *                                       stone and applying rules),
     *                    'prisonners':{Integer} (number of prisonners made) }
     */
    exports.playMove = function (color, coord, size, stones) {
        var x =             coord.charCodeAt(0) - 97, // Coord to Integer.
            y =             coord.charCodeAt(1) - 97,
            goban =         stonesToGoban(size, stones),
            captureresult = {},
            newstate =      {};

        // Add played stone to goban.
        goban[x][y] = color;

        // Test if that makes captures and get new state if so.
        captureresult = testCaptures(color, x, y, goban);

        newstate = {
            'stones': gobanToStones(size, captureresult.goban),
            'prisonners': captureresult.prisonners
        };

        return newstate;
    };
    /*}}}*/

})(typeof exports === 'undefined' ? this['gorules'] = {} : exports);

