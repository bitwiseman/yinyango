/**
 * yinyango rules sub-namespace.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
'use strict';

yygo.rules = {};

/** addStones {{{
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
yygo.rules.addStones = function (color, add, size, stones, rule) {
    var i =     add.length,
        goban = yygo.rules.stonesToGoban(size, stones),
        x,
        y;

    while (i > 0) {
        x = add[i - 1].charCodeAt(0) - 97;
        y = add[i - 1].charCodeAt(1) - 97;
        goban[x][y] = color;
        // TODO: Find a faster method, this is too CPU intensive.
        yygo.rules.applySuicideRule(x - 1, y, goban, rule);
        yygo.rules.applySuicideRule(x + 1, y, goban, rule);
        yygo.rules.applySuicideRule(x, y - 1, goban, rule);
        yygo.rules.applySuicideRule(x, y + 1, goban, rule);
        i--;
    }
    stones = yygo.rules.gobanToStones(size, goban);

    return stones;
};
/*}}}*/
/** applyKoRule {{{
 * Test if a move created a ko situation and add the only liberty to goban
 * as such.
 *
 * @param {Number} x: X coord.
 * @param {Number} y: Y coord.
 * @param {Array} goban: Goban to test.
 * @param {String} color: Played color.
 */
yygo.rules.applyKoRule = function (x, y, goban, color) {
    var liberties = [];

    function isLiberty(x, y) {
        var libstatus = [color, '', 'BF', 'WF'];

        if (yygo.rules.isCoordStatus(x, y, goban, libstatus) !== null) {
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
};
/*}}}*/
/** applySuicideRule {{{
 * Test goban intersection for liberties and set/remove forbidden moves
 * depending on current rule.
 *
 * @param {Number} x: X coord.
 * @param {Number} y: Y coord.
 * @param {Array} goban: Goban.
 * @param {String} rule: Played ruleset.
 * @param {Boolean} capturing: Are we capturing stones ?
 */
yygo.rules.applySuicideRule = function (x, y, goban, rule, capturing) {

    /** isSurroundedBy {{{
     * Check if a coord is surrounded by a color.
     *
     * @param {Number} x: X coord.
     * @param {Number} y: Y coord.
     * @param {String} color: Color of stone.
     *
     * @return {Boolen} Is coord surrounded by color ?
     */
    function isSurroundedBy(x, y, color) {
        var status = [color, 'X'],
            a = yygo.rules.isCoordStatus(x - 1, y, goban, status) !== null,
            b = yygo.rules.isCoordStatus(x + 1, y, goban, status) !== null,
            c = yygo.rules.isCoordStatus(x, y - 1, goban, status) !== null,
            d = yygo.rules.isCoordStatus(x, y + 1, goban, status) !== null;

        if (a && b && c && d) {
            return true;
        }
        return false;
    }
    /*}}}*/
    /** checkGroupLiberties {{{
     * Check a group of stones liberties. If we find only one, test if
     * group can escape otherwise this liberty should be marked forbidden
     * move for group color.
     *
     * @param {Number} x: X coord.
     * @param {Number} y: Y coord.
     */
    function checkGroupLiberties(x, y) {
        var color = yygo.rules.isCoordStatus(x, y, goban, ['B', 'W']),
            ennemy = color === 'B' ? 'W' : 'B',
            liberties = [],
            group = [],
            liblen,
            coord,
            libx,
            liby,
            i;

        /** addStoneAndRecheck {{{
         * Add stone and recheck liberties of new group.
         *
         * @param {Number} x: X coord.
         * @param {Number} y: Y coord.
         * @param {String} color: Color of stone to add to group.
         */
        function addStoneAndRecheck(x, y, color) {
            var newgroup = [],
                newlibs = [],
                captures = [];

            goban[x][y] = color;
            yygo.rules.listLiberties(x, y, goban, color, newlibs, newgroup);
            // This group cannot escape.
            if (newlibs.length === 0) {
                yygo.rules.listCaptures(x, y, goban, color, captures);
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

        yygo.rules.listLiberties(x, y, goban, color, liberties, group);
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
    if (yygo.rules.isCoordStatus(x, y, goban, ['', 'BF', 'WF']) !== null) {
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
};
/*}}}*/
/** gobanToStones {{{
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
yygo.rules.gobanToStones = function (size, goban) {
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
};
/*}}}*/
/** isCoordStatus {{{
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
yygo.rules.isCoordStatus = function (x, y, goban, status) {
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
};
/*}}}*/
/** listLiberties {{{
 * List liberties of a stones group.
 *
 * @param {Number} x: X coord.
 * @param {Number} y: Y coord.
 * @param {Array} goban: Goban to check.
 * @param {String} color: Played color.
 * @param {Array} liberties: List of group liberties.
 * @param {Array} group: List of group stones.
 */
yygo.rules.listLiberties = function (x, y, goban, color, liberties, group) {
    var liblen = liberties.length,
        grouplen = group.length,
        i;

    if (yygo.rules.isCoordStatus(x, y, goban, ['', 'K', 'BF', 'WF']) !== null) {
        // Check if we already have this intersection in liberties.
        for (i = 0; i < liblen; i++) {
            if (liberties[i] === x + ':' + y) {
                return;
            }
        }
        liberties.push(x + ':' + y);
        return;
    }
    if (yygo.rules.isCoordStatus(x, y, goban, [color]) !== null) {
        // Test if stone is not already in group.
        for (i = 0; i < grouplen; i++) {
            if (group[i] === x + ':' + y) {
                return;
            }
        }
        // Add stone to group.
        group.push(x + ':' + y);
        // Test recursively intersections.
        yygo.rules.listLiberties(x - 1, y, goban, color, liberties, group);
        yygo.rules.listLiberties(x, y - 1, goban, color, liberties, group);
        yygo.rules.listLiberties(x + 1, y, goban, color, liberties, group);
        yygo.rules.listLiberties(x, y + 1, goban, color, liberties, group);
        return;
    }
    return;
};
/*}}}*/
/** listCaptures {{{
 * List captured stones made playing a stone.
 *
 * @param {Number} x: X coordinate of played stone.
 * @param {Number} y: Y coordinate of played stone.
 * @param {Array} goban: Goban to test.
 * @param {String} color: Played color.
 * @param {Array} captures: Captured stones list.
 */
yygo.rules.listCaptures = function (x, y, goban, color, captures) {
    var ennemy = color === 'B' ? 'W' : 'B';

    /** checkIntersection {{{
     * Check each adjacent intersection of played stone.
     *
     * @param {Number} x: X coord.
     * @param {Number} y: Y coord.
     */
    function checkIntersection(x, y) {
        var stone = x + ':' + y,
            liberties = [],
            group = [];
    
        if (yygo.rules.isCoordStatus(x, y, goban, [ennemy]) === null) {
            return;
        }
    
        // Avoid indexing a group twice.
        if (captures.indexOf(stone) !== -1) {
            return;
        }
    
        yygo.rules.listLiberties(x, y, goban, ennemy, liberties, group); 
        if (liberties.length === 0) {
            captures.push.apply(captures, group);
        }
    }
    /*}}}*/

    checkIntersection(x - 1, y);
    checkIntersection(x, y - 1);
    checkIntersection(x + 1, y);
    checkIntersection(x, y + 1);
};
/*}}}*/
/** playMove {{{
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
yygo.rules.playMove = function (color, coord, size, stones, rule) {
    var x =             coord.charCodeAt(0) - 97, // Coord to Number.
        y =             coord.charCodeAt(1) - 97,
        goban =         yygo.rules.stonesToGoban(size, stones),
        captures =      [],
        newstate =      {};

    // Add played stone to goban.
    goban[x][y] = color;

    yygo.rules.listCaptures(x, y, goban, color, captures);
    if (captures.length > 0) {
        yygo.rules.removeCaptures(goban, rule, captures);
    }
    if (captures.length === 1) {
        yygo.rules.applyKoRule(x, y, goban, color);
    }
    yygo.rules.applySuicideRule(x - 1, y, goban, rule);
    yygo.rules.applySuicideRule(x + 1, y, goban, rule);
    yygo.rules.applySuicideRule(x, y - 1, goban, rule);
    yygo.rules.applySuicideRule(x, y + 1, goban, rule);

    newstate = {
        'stones': yygo.rules.gobanToStones(size, goban),
        'captures': captures.length
    };

    return newstate;
};
/*}}}*/
/** removeCaptures {{{
 * Remove captured stones from goban.
 *
 * @param {Array} goban: Goban to remove stones from.
 * @param {String} rule: Played ruleset.
 * @param {Array} captures: Captured stones list to remove from goban.
 */
yygo.rules.removeCaptures = function (goban, rule, captures) {
    var caplen =    captures.length,
        coord =     [],
        x,
        y,
        i;

    /** checkSuicides {{{
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
            yygo.rules.applySuicideRule(x, y, goban, rule, true);
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
};
/*}}}*/
/** stonesToGoban {{{
 * Transform stones list to a goban array.
 *
 * @param {Number} size: Goban size.
 * @param {Object} stones: Stones list.
 *
 * @return {Array} Array representing the goban.
 */
yygo.rules.stonesToGoban = function (size, stones) {
    var goban = [],
        i,
        j;

    /** placeStones {{{
     * Place stones on goban.
     *
     * @param {Array} stones: List of stones to place on goban.
     * @param {String} color: Color of the stones.
     */
    function placeStones(stones, color) {
        var i = stones.length,
            x,
            y;

        while (i > 0) {
            x = stones[i - 1].charCodeAt(0) - 97;
            y = stones[i - 1].charCodeAt(1) - 97;
            goban[x][y] = color;
            i--;
        }
    }
    /*}}}*/

    // Generate empty goban.
    for (i = 0; i < size; i++) {
        goban[i] = [];
        for (j = 0; j < size; j++) {
            goban[i][j] = '';
        }
    }
    
    placeStones(stones.B, 'B');
    placeStones(stones.W, 'W');
    placeStones(stones.BF, 'BF');
    placeStones(stones.WF, 'WF');
    return goban;
};
/*}}}*/
