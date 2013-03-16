/*
 * Tools to manipulate goban and SGF files.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
/* jshint browser: true, node: true */

/*
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

    // Private functions.
    /* isCoordStatus {{{
     * Check if a goban coord match status from a list.
     *
     * Existing status:
     * '': Empty coord,
     * 'K': Ko,
     * 'B' and 'W': Stones,
     * 'BF' and 'WF': Forbidden moves for each color,
     * 'X': Out of goban (border).
     *
     * @param {Number} x: X coord.
     * @param {Number} y: Y coord.
     * @param {Array} goban: Goban to check.
     * @param {Array} status: List of status to check.
     *
     * @return {String} Matched status.
     */
    function isCoordStatus(x, y, goban, status) {
        var coordstatus = (function () {
            if (goban[x] !== undefined && goban[x][y] !== undefined) {
                return goban[x][y];
            }
            return 'X';
        }());
    
        if (status.indexOf(coordstatus) > -1) {
            return status[status.indexOf(coordstatus)];
        }
        return null;
    }
    /*}}}*/
    /* listLiberties {{{
     * List liberties of a stones group.
     *
     * @param {Number} x: X coord.
     * @param {Number} y: Y coord.
     * @param {Array} goban: Goban to check.
     * @param {String} color: Played color.
     * @param {Array} liberties: List of group liberties.
     * @param {Array} group: List of group stones.
     */
    function listLiberties(x, y, goban, color, liberties, group) {
        var liblen = liberties.length,
            grouplen = group.length,
            i;

        if (isCoordStatus(x, y, goban, ['', 'K', 'BF', 'WF']) !== null) {
            // Check if we already have this intersection in liberties.
            for (i = 0; i < liblen; i++) {
                if (liberties[i] === x + ':' + y) {
                    return;
                }
            }
            liberties.push(x + ':' + y);
            return;
        }
        if (isCoordStatus(x, y, goban, [color]) !== null) {
            // Test if stone is not already in group.
            for (i = 0; i < grouplen; i++) {
                if (group[i] === x + ':' + y) {
                    return;
                }
            }
            // Add stone to group.
            group.push(x + ':' + y);
            // Test recursively intersections.
            listLiberties(x - 1, y, goban, color, liberties, group);
            listLiberties(x, y - 1, goban, color, liberties, group);
            listLiberties(x + 1, y, goban, color, liberties, group);
            listLiberties(x, y + 1, goban, color, liberties, group);
            return;
        }
        return;
    }
    /*}}}*/
    /* listCaptures {{{
     * List captured stones made playing a stone.
     *
     * @param {Number} x: X coordinate of played stone.
     * @param {Number} y: Y coordinate of played stone.
     * @param {Array} goban: Goban to test.
     * @param {String} color: Played color.
     * @param {Array} captures: Captured stones list.
     */
    function listCaptures(x, y, goban, color, captures) {
        var ennemy = color === 'B' ? 'W' : 'B';

        /* checkIntersection {{{
         * Check each adjacent intersection of played stone.
         *
         * @param {Number} x: X coord.
         * @param {Number} y: Y coord.
         */
        function checkIntersection(x, y) {
            var stone = x + ':' + y,
                liberties = [],
                group = [];
        
            if (isCoordStatus(x, y, goban, [ennemy]) === null) {
                return;
            }
        
            // Avoid indexing a group twice.
            if (captures.indexOf(stone) !== -1) {
                return;
            }
        
            listLiberties(x, y, goban, ennemy, liberties, group); 
            if (liberties.length === 0) {
                captures.push.apply(captures, group);
            }
        }
        /*}}}*/

        checkIntersection(x - 1, y);
        checkIntersection(x, y - 1);
        checkIntersection(x + 1, y);
        checkIntersection(x, y + 1);
    }
    /*}}}*/
    /* applyKoRule {{{
     * Test if a move created a ko situation and add the only liberty to goban
     * as such.
     *
     * @param {Number} x: X coord.
     * @param {Number} y: Y coord.
     * @param {Array} goban: Goban to test.
     * @param {String} color: Played color.
     */
    function applyKoRule(x, y, goban, color) {
        var liberties = [];

        function isLiberty(x, y) {
            if (isCoordStatus(x, y, goban, [color, '', 'BF', 'WF']) !== null) {
                // Liberty or same color.
                liberties.push([x, y]);
            }
        }
        isLiberty(x - 1, y);
        isLiberty(x + 1, y);
        isLiberty(x, y - 1);
        isLiberty(x, y + 1);
        if (liberties.length === 1) {
            goban[liberties[0][0]][liberties[0][1]] = 'K';
        }
    }
    /*}}}*/
    /* applySuicideRule {{{
     * Test goban intersection for liberties and set/remove forbidden moves
     * depending on current rule.
     *
     * @param {Number} x: X coord.
     * @param {Number} y: Y coord.
     * @param {Array} goban: Goban.
     * @param {String} rule: Played ruleset.
     * @param {Boolean} capturing: Are we capturing stones ?
     */
    function applySuicideRule(x, y, goban, rule, capturing) {

        /* isSurroundedBy {{{
         * Check if a coord is surrounded by a color.
         *
         * @param {Number} x: X coord.
         * @param {Number} y: Y coord.
         * @param {String} color: Color of stone.
         *
         * @return {Boolen} Is coord surrounded by color ?
         */
        function isSurroundedBy(x, y, color) {
            if (isCoordStatus(x - 1, y, goban, [color, 'X']) !== null
            && isCoordStatus(x + 1, y, goban, [color, 'X']) !== null 
            && isCoordStatus(x, y - 1, goban, [color, 'X']) !== null
            && isCoordStatus(x, y + 1, goban, [color, 'X']) !== null) {
                return true;
            }
            return false;
        }
        /*}}}*/
        /* checkGroupLiberties {{{
         * Check a group of stones liberties. If we find only one, test if
         * group can escape otherwise this liberty should be marked forbidden
         * move for group color.
         *
         * @param {Number} x: X coord.
         * @param {Number} y: Y coord.
         */
        function checkGroupLiberties(x, y) {
            var color = isCoordStatus(x, y, goban, ['B', 'W']),
                ennemy = color === 'B' ? 'W' : 'B',
                liberties = [],
                group = [],
                liblen,
                coord,
                libx,
                liby,
                i;
    
            /* addStoneAndRecheck {{{
             * Add stone and recheck liberties of new group.
             *
             * @param {Number} x: X coord.
             * @param {Number} y: Y coord.
             * @param {String} color: Color of stone to add to group.
             */
            function addStoneAndRecheck(x, y, color) {
                var newgroup = [],
                    newliberties = [],
                    captures = [];
    
                goban[x][y] = color;
                listLiberties(x, y, goban, color, newliberties, newgroup);
                // This group cannot escape.
                if (newliberties.length === 0) {
                    listCaptures(x, y, goban, color, captures);
                    if (captures.length === 0) {
                        goban[x][y] = color + 'F';
                    } else {
                        goban[x][y] = '';
                    }
                } else {
                    goban[x][y] = '';
                }
            }
            /*}}}*/
    
            if (color === null) {
                return; 
            }
    
            listLiberties(x, y, goban, color, liberties, group);
            liblen = liberties.length;
            if (liblen === 1) {
                coord = liberties[0].split(':');
                libx = parseInt(coord[0], 10);
                liby = parseInt(coord[1], 10);
                addStoneAndRecheck(libx, liby, color);
            }
            // More than one liberty, make sure to remove forbidden moves
            // of that group color, as a capture may create more liberties
            // for a group.
            if (liblen > 1 && capturing) {
                for (i = 0; i < liblen; i++) {
                    coord = liberties[i].split(':');
                    libx = parseInt(coord[0], 10);
                    liby = parseInt(coord[1], 10);
                    if (goban[libx][liby] === color + 'F') {
                        goban[libx][liby] = '';
                    }
                    addStoneAndRecheck(libx, liby, ennemy);
                }
            }
        }
        /*}}}*/

        if (!capturing) {
            capturing = false;
        }

        // First case intersection is empty but not a ko.
        if (isCoordStatus(x, y, goban, ['', 'BF', 'WF']) !== null) {
            // One stone suicide forbidden in all rules.
            if (isSurroundedBy(x, y, 'B')) {
                goban[x][y] = 'WF';
            }
            if (isSurroundedBy(x, y, 'W')) {
                goban[x][y] = 'BF';
            }
            // Find and list group liberties. If we have only one,
            // and that rule does not permit suicide this is
            // a forbidden move for group color.
            if (rule !== 'NZ') {
                checkGroupLiberties(x - 1, y);
                checkGroupLiberties(x + 1, y);
                checkGroupLiberties(x, y - 1);
                checkGroupLiberties(x, y + 1);
            }
        }
        // Second case intersection is colored.
        checkGroupLiberties(x, y);
    }
    /*}}}*/
    /* removeCaptures {{{
     * Remove captured stones from goban.
     *
     * @param {Array} goban: Goban to remove stones from.
     * @param {String} rule: Played ruleset.
     * @param {Array} captures: Captured stones list to remove from goban.
     */
    function removeCaptures(goban, rule, captures) {
        var caplen =    captures.length,
            coord =     [],
            x,
            y,
            i;

        /* checkSuicides {{{
         * Check if a captured stone will create/remove suicides moves.
         *
         * @param {Number} x: X coord.
         * @param {Number} y: Y coord.
         */
        function checkSuicides(x, y) {
            var isinlist = false,
                coord,
                xc,
                yc,
                i;

            // Make sure we do not test captured stones.
            for (i = 0; i < caplen; i++) {
                coord = captures[i].split(':');
                xc = parseInt(coord[0], 10);
                yc = parseInt(coord[1], 10);
                if (xc === x && yc === y) {
                    isinlist = true;
                }
            }
            if (!isinlist) {
                applySuicideRule(x, y, goban, rule, true);
            }
        }
        /*}}}*/

        for (i = 0; i < caplen; i++) {
            coord = captures[i].split(':');
            x = parseInt(coord[0], 10);
            y = parseInt(coord[1], 10);
            // Remove stone from goban.
            goban[x][y] = '';
            // Check all around intersections.
            checkSuicides(x - 1, y);
            checkSuicides(x + 1, y);
            checkSuicides(x, y - 1);
            checkSuicides(x, y + 1);
            checkSuicides(x - 1, y - 1);
            checkSuicides(x + 1, y - 1);
            checkSuicides(x - 1, y + 1);
            checkSuicides(x + 1, y + 1);
        }
    }
    /*}}}*/
    /* gobanToStones {{{
     * Transform goban array to stones list.
     *
     * @param {Number} size: Goban size.
     * @param {Array} goban: Goban to convert.
     *
     * @return {Object} {
     * 'B':{Array} black stones,
     * 'W':{Array} white stones,
     * 'BF':{Array} black forbidden moves,
     * 'WF':{Array} white forbidden moves,
     * 'K':{Array} kos. }
     */
    function gobanToStones(size, goban) {
        var stones =    { B: [], W: [], BF: [], WF: [], K: [] },
            letters =   ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
                         'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
            coord,
            x,
            y;

        for (x = 0; x < size; x++) {
            for (y = 0; y < size; y++) {
                coord = letters[x] + letters[y];
                if (goban[x] !== undefined && goban[x][y] !== undefined) {
                    if (goban[x][y] === 'B') {
                        stones.B.push(coord);
                    } else if (goban[x][y] === 'W') {
                        stones.W.push(coord);
                    } else if (goban[x][y] === 'BF') {
                        stones.BF.push(coord);
                    } else if (goban[x][y] === 'WF') {
                        stones.WF.push(coord);
                    } else if (goban[x][y] === 'K') {
                        stones.K.push(coord);
                    }
                }
            }
        }
        return stones;
    }
    /*}}}*/
    /* stonesToGoban {{{
     * Transform stones list to a goban array.
     *
     * @param {Number} size: Goban size.
     * @param {Object} stones: Stones list.
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

            if (stoneslen !== 0) {
                for (i = 0; i < stoneslen; i++) {
                    x = stones[i].charCodeAt(0) - 97;
                    y = stones[i].charCodeAt(1) - 97;
                    goban[x][y] = color;
                }
            }
        }
        putStones(stones.B, 'B');
        putStones(stones.W, 'W');
        putStones(stones.BF, 'BF');
        putStones(stones.WF, 'WF');
        return goban;
    }
    /*}}}*/
    /* getParentBranch {{{
     * Find the branch of which depends a given branch at a given node.
     *
     * @param {Object} data: Game data.
     * @param {Number} node: Node to check.
     * @param {Number} branch: Child branch.
     *
     * @return {Number} The parent branch.
     */
    function getParentBranch(data, node, branch) {
        var i;

        for (i = branch; i >= 0; i--) {
            if (data[node] !== undefined && data[node][i] !== undefined) {
                return i;
            }
        }
        return 0;
    }
    /*}}}*/

    // Public functions.
    /* addStones {{{
     * Add stones to goban.
     *
     * @param {String} color: Color of the stone(s) (empty to remove).
     * @param {Array} add: Stone list to add/remove.
     * @param {Number} size: Goban size.
     * @param {Object} stones: Stones to modify.
     * @param {String} rule: Played rule.
     *
     * @return {Object} New stones after adding/removing stones.
     */
    exports.addStones = function (color, add, size, stones, rule) {
        var addlen =    add.length,
            goban =     stonesToGoban(size, stones),
            i,
            x,
            y;

        for (i = 0; i < addlen; i++) {
            x = add[i].charCodeAt(0) - 97;
            y = add[i].charCodeAt(1) - 97;
            goban[x][y] = color;
            // TODO: Find a faster method, this is too CPU intensive.
            console.log(rule);
            //applySuicideRule(x - 1, y, goban, rule);
            //applySuicideRule(x + 1, y, goban, rule);
            //applySuicideRule(x, y - 1, goban, rule);
            //applySuicideRule(x, y + 1, goban, rule);
        }
        stones = gobanToStones(size, goban);

        return stones;
    };
    /*}}}*/
    /* playMove {{{
     * Play a stone, apply rules and return new stones list and number of
     * captured stones.
     *
     * @param {String} color: Color of played stone.
     * @param {String} coord: Coordinate of played stone in letters.
     * @param {Number} size: Goban size.
     * @param {Object} stones: Stones list.
     * @param {String} rule: Played rule.
     *
     * @return {Object} {
     * 'stones':{Object} new stones list after applying rules,
     * 'captures':{Number} number of captured stones. }
     */
    exports.playMove = function (color, coord, size, stones, rule) {
        var x =             coord.charCodeAt(0) - 97, // Coord to Number.
            y =             coord.charCodeAt(1) - 97,
            goban =         stonesToGoban(size, stones),
            captures =      [],
            newstate =      {};

        // Add played stone to goban.
        goban[x][y] = color;

        listCaptures(x, y, goban, color, captures);
        if (captures.length > 0) {
            removeCaptures(goban, rule, captures);
        }
        if (captures.length === 1) {
            applyKoRule(x, y, goban, color);
        }
        applySuicideRule(x - 1, y, goban, rule);
        applySuicideRule(x + 1, y, goban, rule);
        applySuicideRule(x, y - 1, goban, rule);
        applySuicideRule(x, y + 1, goban, rule);

        newstate = {
            'stones': gobanToStones(size, goban),
            'captures': captures.length
        };

        return newstate;
    };
    /*}}}*/
    /* parseSgf {{{
     * Read sgf data and register keys/values, sorting the nodes (moves)
     * and branchs (variations).
     *
     * @param {String} sgf: Sgf data.
     * @param {Function} callback: Callback.
     *
     * @return {Object} JSON form of sgf.
     */
    exports.parseSgf = function (sgf, callback) {
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
                    if (isescaped) {
                        value += '\\(';
                        isescaped = false;
                    } else {
                        value += '(';
                    }
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
                    if (isescaped) {
                        value += '\\)';
                        isescaped = false;
                    } else {
                        value += ')';
                    }
                } else if (isstart) {
                    mark--;
                } else {
                    isstart = true;
                }
                break;
            case ';': // Value or new node ?
                if (isvalue) {
                    if (isescaped) {
                        value += '\\;';
                        isescaped = false;
                    } else {
                        value += ';';
                    }
                } else {
                    node++;
                }
                break;
            case '[': // Value or start of value ?
                if (isvalue) {
                    if (isescaped) {
                        value += '\\[';
                        isescaped = false;
                    } else {
                        value += '[';
                    }
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
                    if (isescaped) {
                        value += '\\' + chr;
                        isescaped = false;
                    } else {
                        value += chr;
                    }
                } else if (chr !== '\n') {
                    key += chr;
                }
            }
        }
        // Save total number of branchs in the tree root for later use.
        sgfobj[0][0].branchs = branch + 1;

        callback(sgfobj);
    };
    /*}}}*/
    /* buildSgf {{{
     * Build an sgf string from provided data.
     *
     * @param {Object} data: Game data.
     * @param {Function} callback: Callback.
     *
     * @return {String} Sgf string.
     */
    exports.buildSgf = function (data, callback) {
        var branchs =   data[0][0].branchs,
            branch =    0,
            node =      0,
            marks =     {},
            sgf =       '',
            key,
            value,
            valuelen,
            prevfirstnode,
            i,
            j;

        while (branch < branchs) {
            sgf += '(';
            while (data[node] !== undefined &&
                    data[node][branch] !== undefined) {
                j = 0;
                if (marks[node] === undefined) {
                    for (i in data[node]) {
                        if (data[node].hasOwnProperty(i) &&
                                data[node - 1] !== undefined &&
                                getParentBranch(data, node - 1, i) === branch) {
                            j++;
                        }
                    }
                    if (j >= 1) {
                        sgf += '(';
                        prevfirstnode = node;
                        marks[node] = 1;
                    }
                }
                sgf += ';';
                for (key in data[node][branch]) {
                    if (data[node][branch].hasOwnProperty(key)) {
                        value = data[node][branch][key];
                        valuelen = value.length;
                        if (key !== 'branchs') {
                            sgf += key;
                            for (i = 0; i < valuelen; i++) {
                                sgf += '[' + value[i] + ']';
                            }
                        }
                    }
                }
                node++;
            }
            branch++;
            // Get first node of next branch.
            for (i = 0; i <= node; i++) {
                if (data[i] !== undefined && data[i][branch] !== undefined) {
                    node = i;
                    break;
                }
            }
            if (branch === branchs) {
                node = 0;
            }
            if (node < prevfirstnode) {
                for (i in marks) {
                    if (marks.hasOwnProperty(i) && i > node) {
                        for (j = 0; j < marks[i]; j++) {
                            sgf += ')';
                        }
                        delete marks[i];
                    }
                }
                prevfirstnode = node;
            }
            sgf += ')';
        }
        callback(sgf);
    };
    /*}}}*/

}(typeof exports === 'undefined' ? this.gotools = {} : exports));
