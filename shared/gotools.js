/**
 * Tools to manipulate goban and SGF files.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

/**
 * Exports are public functions available for client and node.
 * To call in client:
 *      <script src="gotools.js">
 *          console.log(gotools.function(params));
 *      </script>
 * To call in node:
 *      var gotools = require(./shared/gotools);
 *      console.log(gotools.function(params));
 */
(function (exports) {
    'use strict';

    /**
     * Private functions.
     */

    /** gobanToStones {{{
     * Transform goban array to stones list.
     *
     * @param {Number}  size    Goban size.
     * @param {Array}   goban   Goban to convert.
     *
     * @return {Object} { 'b':{String} (black stones on goban),
     *                    'w':{String} (white stones on goban),
     *                    'k':{String} (kos on goban) }
     */
    function gobanToStones(size, goban) {
        var stones =    { 'b': [], 'w': [], 'k': [] },
            letters =   ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
                         'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
            coord,
            x,
            y;

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
    }
    /*}}}*/

    /** stonesToGoban {{{
     * Transform stones list to a goban array.
     * b: black, w: white, k: ko. 
     *
     * @param {Number}  size    Goban size.
     * @param {Object}  stones  Stones list.
     *
     * @return {Array} Array representing the goban.
     */
    function stonesToGoban(size, stones) {
        var goban = [],
            i,
            j;

        // Generate empty goban.
        for (i = 0; i < size; i++) {
            goban[i] = [];
            for (j = 0; j < size; j++) {
                goban[i][j] = '';
            }
        }
        // Put stones on goban.
        function putStones(stones, color) {
            var stoneslen = stones.length,
                i,
                x,
                y;

            if (stones.length !== 0) {
                for (i = 0; i < stoneslen; i++) {
                    x = stones[i].charCodeAt(0) - 97;
                    y = stones[i].charCodeAt(1) - 97;
                    goban[x][y] = color;
                }
            }
        }
        putStones(stones.b, 'b');
        putStones(stones.w, 'w');
        putStones(stones.k, 'k');
        return goban;
    }
    /*}}}*/

    /** testLiberties {{{
     * Test liberties of a stone or a group of stones recursively.
     * Inspired by eidogo algorithm.
     *
     * @param {String}  color       Color of the played stone.
     * @param {Number}  x           X coordinate to test.
     * @param {Number}  y           Y coordinate to test.
     * @param {Array}   goban       Goban state to test.
     * @param {Array}   prisonners  Potential prisonners.
     *
     * @return {Array} [ {Number}
     *                   (0: No liberties or already in prisonners list.
     *                    1: Has liberties.
     *                    2: Same color or goban border.),
     *                   {Array} (Potential prisonners) ]
     */
    function testLiberties(color, x, y, goban, prisonners) {
        var ennemy = (color === 'b') ? 'w' : 'b',
            prilen = prisonners.length,
            stone,
            i;

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
                if (testLiberties(color, x - 1, y, goban, prisonners) === 1) {
                    return 1;
                }
                if (testLiberties(color, x, y - 1, goban, prisonners) === 1) {
                    return 1;
                }
                if (testLiberties(color, x + 1, y, goban, prisonners) === 1) {
                    return 1;
                }
                if (testLiberties(color, x, y + 1, goban, prisonners) === 1) {
                    return 1;
                }
                // If we reached here then we found no liberties.
                return [ 0, prisonners ];
            }
        }
        return 2; // Same color or goban border.
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
    function removePrisonners(goban, prisonners) {
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

    /** testCaptures {{{
     * Test if played stone will capture stone(s).
     *
     * @param {String}  color Played color.
     * @param {Number}  x     X coordinate of played stone.
     * @param {Number}  y     Y coordinate of played stone.
     * @param {Array}   goban Goban to test.
     *
     * @return {Object} { 'goban':{Array} (goban after eventual captures),
     *                    'prisonners':{Number} (number of prisonners) }.
     */
    function testCaptures(color, x, y, goban) {
        var result = { 'goban': [], 'prisonners': 0 },
            prisonners = 0;

        function checkDirection(x, y) {
            var test = testLiberties(color, x, y, goban, []);

            if (test[0] === 0) { // No liberties found.
                goban = removePrisonners(goban, test[1]);
                prisonners += test[1].length;
            }
        }
        // Test each direction.
        checkDirection(x - 1, y);
        checkDirection(x, y - 1);
        checkDirection(x + 1, y);
        checkDirection(x, y + 1);

        result.goban = goban;
        result.prisonners = prisonners;

        return result;
    }
    /*}}}*/

    /**
     * Public functions.
     */

    /** addStones {{{
     * Add stones to goban.
     *
     * @param {String}  color   Color of the stone(s) (empty to remove).
     * @param {Array}   add     Stone list to add/remove. 
     * @param {Number}  size    Goban size.
     * @param {Object}  stones  Stones to modify.
     *
     * @return {Object} New stones after adding/removing stones.
     */
    exports.addStones = function (color, add, size, stones) {
        var addlen =    add.length,
            goban =     stonesToGoban(size, stones),
            i,
            x,
            y;

        for (i = 0; i < addlen; i++) {
            x = add[i].charCodeAt(0) - 97;
            y = add[i].charCodeAt(1) - 97;
            goban[x][y] = color;
        }
        stones = gobanToStones(size, goban);

        return stones;
    };
    /*}}}*/

    /** playMove {{{
     * Play a stone, apply rules and return new stones list and number of
     * prisonners.
     *
     * @param {String}  color   Color of played stone.
     * @param {String}  coord   Coordinate of played stone in letters.
     * @param {Number}  size    Goban size.
     * @param {Object}  stones  Stones list.
     *
     * @return {Object} { 'stones':{Object} (new stones list after playing the
     *                                       stone and applying rules),
     *                    'prisonners':{Number} (number of prisonners made) }
     */
    exports.playMove = function (color, coord, size, stones) {
        var x =             coord.charCodeAt(0) - 97, // Coord to Number.
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

    /** parseSgf {{{
     * Read sgf data and register keys/values, sorting the nodes (moves) 
     * and branchs (variations).
     *
     * @param {String}      sgf Sgf data.
     * @param {Function}    fn  Callback.
     *
     * @return {Object} JSON form of sgf.
     */
    exports.parseSgf = function (sgf, fn) {
        var sgfobj =        {},
            sgflen =        sgf.length,
            isescaped =     false,
            isvalue =       false,
            isstart =       true,
            branch =        -1,
            mark =          0,
            node =          -1,
            nodemark =      [-1],
            key =           '',
            prevkey =       '',
            value =         '',
            chr,
            i;

        for (i = 0; i < sgflen; i++) {
            chr = sgf.charAt(i);
            switch (chr) {
            case '\\': // Escape character.
                if (isescaped) {
                    value += '\\';
                    isescaped = false;
                } else {
                    isescaped = true;
                }
                break;
            case '(': // Value, start of branch or mark ?
                if (isvalue) {
                    value += '(';
                } else if (isstart) {
                    branch++;
                    node = nodemark[mark];
                    isstart = false;
                } else {
                    mark++;
                    nodemark[mark] = node;
                }
                break;
            case ')': // Value or end of branch ?
                if (isvalue) {
                    value += ')';
                } else if (isstart) {
                    mark--;
                } else {
                    isstart = true;
                }
                break;
            case ';': // Value or new node ?
                if (isvalue) {
                    value += ';';
                } else {
                    node++;
                }
                break;
            case '[': // Value or start of value ?
                if (isvalue) {
                    value += '[';
                } else {
                    isvalue = true;
                }
                break;
            case ']': // Value or end of value ?
                if (isescaped) {
                    value += ']';
                    isescaped = false;
                } else {
                    if (key === '') {
                        sgfobj[node][branch][prevkey].push(value);
                    } else {
                        if (sgfobj[node] === undefined) {
                            sgfobj[node] = {};
                        }
                        if (sgfobj[node][branch] === undefined) {
                            sgfobj[node][branch] = {};
                        }
                        sgfobj[node][branch][key] = [];
                        sgfobj[node][branch][key].push(value);
                        prevkey = key;
                        key = '';
                    }
                    isvalue = false;
                    value = '';
                }
                break;
            default:
                if (isvalue) {
                    value += chr;
                } else if (chr !== '\n') {
                    key += chr;
                }
            }
        }
        // Save total number of branchs in the tree root for later use.
        sgfobj[0][0].branchs = branch + 1;

        fn(sgfobj);
    };
    /*}}}*/

}(typeof exports === 'undefined' ? this.gotools = {} : exports));

