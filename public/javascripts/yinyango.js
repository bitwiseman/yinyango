/**
 * User interface of yinyango.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

/**
 * @namespace Contains all properties and methods of interface.
 */
var yygo = {};

(function () {
    'use strict';

    // Utilities functions.

    /** jsonRequest {{{
     * Simple ajax request expecting json in response.
     *
     * @param {String} url Destination url.
     * @param {String} method Method to send data.
     * @param {Object} data FormData Object to be sent by a POST.
     * @param {Function} callback Callback function.
     */
    function jsonRequest(url, method, data, callback) {
        var xhr = new XMLHttpRequest();

        if (callback === undefined) {
            callback = data;
            data = null;
        }
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 &&
                    (xhr.status === 200 || xhr.status === 0)) {
                callback(JSON.parse(xhr.responseText));
            }
        };

        xhr.open(method, url, true);
        xhr.send(data);
    }
    /*}}}*/

    /** isEmpty {{{
     * Test if an Object is empty.
     * @link http://stackoverflow.com/a/7864800
     *
     * @param {Object} obj Object to check.
     * @return {Boolean} TRUE if Object is empty.
     */
    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }
    /*}}}*/

    // Creation of yygo.

    /** yygo.data {{{
     * Data part of the yygo namespace, where we store the game and the actual
     * state.
     *
     * @property {Object}   game        All the game data.
     * @property {Object}   gameslist   Loadable games.
     * @property {Number}   branchs     Total number of branchs (variations).
     * @property {Number}   size        Size of the goban (9, 13, 19).
     * @property {Number}   curbranch   Current branch (variation) navigated.
     * @property {Number}   curnode     Current node (move).
     * @property {Number}   lastbranch  Last branch to reach.
     * @property {Number}   lastnode    Last node of the last branch.
     */
    yygo.data = {

        // Properties.

        game:           {},
        gameslist:      {},
        score:          {B: 0, W: 0},
        stones:         {},

        listpage:       0,

        size:           0,

        curbranch:      0,
        curnode:        0,
        lastbranch:     0,
        lastnode:       0,

        playerturn:     'B',

        // Methods.

        /** yygo.data.addBranch {{{
         * Player move made a new branch.
         *
         * @param {String} coord Move coord.
         */
        addBranch: function (coord) {
            var node =      this.curnode,
                branch =    this.curbranch,
                game =      this.game,
                stones =    this.stones,
                lastnode =  this.lastnode,
                branchs =   game[0][0].branchs,
                branchid =  0,
                i,
                j;

            function increment(id) {
                var i = 0;

                while (game[i] !== undefined) {
                    for (j = branchs; j >= id; j--) {
                        if (game[i][j] !== undefined) {
                            game[i][j + 1] = game[i][j];
                            stones[i][j + 1] = stones[i][j];
                            delete game[i][j];
                            delete stones[i][j];
                        }
                    }
                    i++;
                }
            }

            // Get a branch number for that position so we can insert
            // a new one with that number and increment the next ones.
            if (branch === 0) {
                for (i = node + 1; i >= 0; i--) {
                    for (j = 1; j < branchs; j++) {
                        if (game[i] !== undefined && game[i][j] !== undefined) {
                            branchid = j;
                            break;
                        }
                    }
                    if (branchid !== 0) {
                        break;
                    }
                }
            } else {
                // Go through nodes of current branch to find eventual branch.
                for (i = node + 1; i <= lastnode; i++) {
                    for (j = branch + 1; j < branchs; j++) {
                        if (game[i] !== undefined && game[i][j] !== undefined &&
                                game[i - 1][j] === undefined &&
                                this.getParentBranch(i, j) === branch) {
                            branchid = j + 1;
                            break;
                        }
                    }
                    if (branchid !== 0) {
                        break;
                    }
                }
                if (branchid === 0) {
                    // No branchs encoutered so increase current by 1.
                    branchid = branch + 1;
                }
            }
            // Increment number of branchs.
            game[0][0].branchs++;
            if (branchid === 0) {
                // We found no suited branchs to be replaced so we just
                // create a new one.
                branchid = branchs;
            } else {
                // Increment all superior branchs and save new data.
                increment(branchid);
                this.game = game;
            }
            // Create the new branch.
            //this.game[node + 1][branchid] = {};
            // Add the move to the new branch.
            //this.curbranch = branchid;
            this.lastbranch = branchid;
            this.addMove(coord);
        },
        /*}}}*/

        /** yygo.data.addMove {{{
         * Add player move to game data.
         *
         * @param {String} coord Coord of move.
         */
        addMove: function (coord) {
            var node =          this.curnode,
                branch =        this.lastbranch,
                stones =        this.stones[node][branch],
                size =          this.size,
                turn =          this.playerturn,
                parentbranch,
                play;

            if (stones === undefined) {
                parentbranch = this.getParentBranch(node, branch);
                stones = this.stones[node][parentbranch];
            }
            if (this.game[node + 1] === undefined) {
                this.game[node + 1] = {};
            }
            this.game[node + 1][branch] = {};
            this.game[node + 1][branch][turn] = [];
            this.game[node + 1][branch][turn].push(coord);

            play = gotools.playMove(turn, coord, size, stones);
            // Add stones state.
            if (this.stones[node + 1] === undefined) {
                this.stones[node + 1] = {};
            }
            this.stones[node + 1][branch] = play.stones;
            // Add prisonners to player score.
            this.score[turn] += play.prisonners;
            // Move to next node.
            //this.curnode++;
            this.lastnode = this.curnode + 1;
            yygo.events.navigateNode(1);
        },
        /*}}}*/

        /** yygo.data.calcStones {{{
         * Calculate all the stones present at each goban step.
         *
         * @param {Object} data Game data.
         *
         * @return {Object} Stones.
         */
        calcStones: function (data) {
            var stones =        {},
                size =          yygo.data.size,
                parentbranch,
                prevstones,
                key,
                node,
                branch;

            function keyAction(key, value, stones) {
                var play;

                switch (key) {
                case 'B':
                    if (value[0] !== '') { // Did not pass.
                        play = gotools.playMove('B', value[0], size, stones);
                        stones = play.stones;
                        yygo.data.score.B += play.prisonners;
                    }
                    break;
                case 'W':
                    if (value[0] !== '') { // Did not pass.
                        play = gotools.playMove('W', value[0], size, stones);
                        stones = play.stones;
                        yygo.data.score.W += play.prisonners;
                    }
                    break;
                case 'AB':
                    stones = gotools.addStones('B', value, size, stones);
                    break;
                case 'AW':
                    stones = gotools.addStones('W', value, size, stones);
                    break;
                case 'AE':
                    stones = gotools.addStones('', value, size, stones);
                    break;
                }
                return stones;
            }

            for (node in data) {
                if (data.hasOwnProperty(node)) {
                    stones[node] = {};
                    for (branch in data[node]) {
                        if (data[node].hasOwnProperty(branch)) {
                            stones[node][branch] = {B: [], W: [], K: []};
                            // Load previous stones.
                            parentbranch =
                                yygo.data.getParentBranch(node - 1, branch);
                            if (node > 0) {
                                prevstones = stones[node - 1][parentbranch];
                            } else {
                                prevstones = stones[node][branch];
                            }
                            // Treat keys.
                            for (key in data[node][branch]) {
                                if (data[node][branch].hasOwnProperty(key)) {
                                    prevstones = keyAction(key,
                                            data[node][branch][key],
                                            prevstones);
                                }
                            }
                            // Save stones.
                            stones[node][branch] = prevstones;
                        }
                    }
                }
            }
            console.log(stones);
            return stones;
        },
        /*}}}*/

        /** yygo.data.getParentBranch {{{
         * Find the branch of which depends a given branch at a given node.
         *
         * @param   {Number} node       Node to check.
         * @param   {Number} branch     Child branch.
         *
         * @return  {Number}            The parent branch.
         */
        getParentBranch: function (node, branch) {
            var game = this.game,
                i;

            for (i = branch; i >= 0; i--) {
                if (game[node] !== undefined && game[node][i] !== undefined) {
                    return i;
                }
            }
            return 0;
        },
        /*}}}*/

        /** yygo.data.parseDataFromList {{{
         * Parse the data of the selected game in list.
         *
         * @param {Number} index Index of the selected game in list.
         */
        parseDataFromList: function (index, callback) {
            var table = document.getElementById('gameslist'),
                id =    table.rows[index].cells[0].textContent;

            jsonRequest('games/' + id, 'GET', function (data) {
                yygo.data.game = data;

                yygo.data.size = parseInt(yygo.data.game[0][0].SZ, 10);

                yygo.data.curnode = 0;
                yygo.data.curbranch = 0;
                yygo.data.lastbranch = 0;

                yygo.data.setLastNode();
                callback();
            });
        },
        /*}}}*/

        /** yygo.data.setLastNode {{{
         * Define the last node of the current branch.
         */
        setLastNode: function () {
            var game =      this.game,
                lastnode =  this.curnode,
                curbranch = this.curbranch;

            while (game[lastnode + 1] !== undefined &&
                    game[lastnode + 1][curbranch] !== undefined) {
                lastnode++;
            }
            this.lastnode = lastnode;
        }
        /*}}}*/

    };
    /*}}}*/

    /** yygo.view {{{
     * View part of the yygo namespace, where we treat all the rendering.
     *
     * @property {String}   orientation     Orientation of the screen.
     * @property {Boolean}  comtoshow       There is comments to show.
     * @property {Boolean}  redraw          We need to redraw the goban.
     * @property {Boolean}  showborders     We must show the goban borders.
     * @property {Boolean}  showcomments    We must show the comments.
     * @property {Boolean}  showmenu        We must show the options menu.
     * @property {Number}   sizecell        Size of a goban cell in pixels.
     * @property {Number}   sizegoban       Size of goban in pixels.
     */
    yygo.view = {

        // Properties.

        orientation:    '',

        comtoshow:      true,
        redraw:         false,
        showborders:    true,
        showcomments:   true,

        sizecell:       0,
        sizegoban:      0,

        // Methods.

        // Construction/insertion of html code.

        /** yygo.view.makeGoban {{{
         * Create and insert goban html code. This include the borders and
         * the grid.
         */
        makeGoban: function () {
            var size =      yygo.data.size + 2,
                goban =     document.getElementById('goban'),
                coord =     ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
                            'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
                border =    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J',
                            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
                gt =        '<div class="g gt black"></div>',
                gr =        '<div class="g gr black"></div>',
                gb =        '<div class="g gb black"></div>',
                gl =        '<div class="g gl black"></div>',
                sto =       '<div class="stone" id="',
                stc =       '"></div>',
                a =         '<a href="#" class="black"></a>',
                html =      '',
                content,
                id,
                i,
                j;

            /** isHoshi {{{
             * Test if a coord should be diplayed as hoshi.
             *
             * @param {Number} x X coord.
             * @param {Number} y Y coord.
             *
             * @return {Boolean}
             */
            function isHoshi(x, y) {
                var m = (size - 1) / 2,
                    r = size - 5;

                if (size === 11 && ((x === 3 && y === 3) ||
                        (x === 5 && y === 3) || (x === 7 && y === 3) ||
                        (x === 3 && y === 5) || (x === 5 && y === 5) ||
                        (x === 7 && y === 5) || (x === 3 && y === 7) ||
                        (x === 5 && y === 7) || (x === 7 && y === 7))) {
                    return true;
                }
                if (size > 11) {
                    if (size / 2 !== Math.round(size / 2) &&
                            ((x === 4 && y === m) || (x === m && y === 4) ||
                            (x === m && y === m) || (x === m && y === r) ||
                            (x === r && y === m))) {
                        return true;
                    }
                    if ((x === 4 && y === 4) || (x === 4 && y === r) ||
                            (x === r && y === 4) || (x === r && y === r)) {
                        return true;
                    }
                }
                return false;
            }
            /*}}}*/

            // Make grid and insert it in goban element.
            for (i = 0; i < size; i++) {
                html += '<div>'; // Row start.
                for (j = 0; j < size; j++) {
                    id = coord[j] + coord[i];
                    if (i === 1) {
                        if (j === 1) {
                            content = gr + gb + sto + id + stc + a;
                        } else if (j === size - 2) {
                            content = gb + gl + sto + id + stc + a;
                        } else if (j !== 0 && j !== size - 1) {
                            content = gr + gb + gl + sto + id + stc + a;
                        } else {
                            content = size - i - 1;
                        }
                    } else if (i === size - 2) {
                        if (j === 1) {
                            content = gt + gr + sto + id + stc + a;
                        } else if (j === size - 2) {
                            content = gt + gl + sto + id + stc + a;
                        } else if (j !== 0 && j !== size - 1) {
                            content = gt + gr + gl + sto + id + stc + a;
                        } else {
                            content = size - i - 1;
                        }
                    } else if (j === 1 && i !== 0 && i !== size - 1) {
                        content = gt + gr + gb + sto + id + stc + a;
                    } else if (j === size - 2 && i !== 0 && i !== size - 1) {
                        content = gt + gb + gl + sto + id + stc + a;
                    } else if (i !== 0 && i !== size - 1 && j !== 0 &&
                            j !== size - 1) {
                        content = gt + gr + gb + gl + sto + id + stc + a;
                        if (isHoshi(i, j)) {
                            content += '<div class="h black"></div>';
                        }
                    } else if ((i === 0 || i === size - 1) && j !== size - 1 &&
                            j !== 0) {
                        content = border[j - 1];
                    } else if ((j === 0 || j === size - 1) && i !== size - 1 &&
                            i !== 0) {
                        content = size - i - 1;
                    } else {
                        content = '';
                    }
                    html += '<div class="cell">' + content + '</div>';
                }
                html += '</div>'; // Row end.
            }
            goban.innerHTML = html;
            yygo.events.makeGobanBinds();
        },
        /*}}}*/

        /** yygo.view.makeComments {{{
         * Create and insert comments html code.
         */
        makeComments: function () {
            var node =      yygo.data.curnode,
                branch =    yygo.data.curbranch,
                comments =  document.getElementById('comments'),
                html =      '',
                comment,
                clen,
                chr,
                i;

            if (yygo.data.game[node][branch].C !== undefined) {
                comment = yygo.data.game[node][branch].C[0];
            }
            if (comment !== undefined) {
                clen = comment.length;
                for (i = 0; i < clen; i++) {
                    chr = comment.charAt(i);
                    if (chr === '\n') { // Translate new line.
                        html += '<br />';
                    } else {
                        html += chr;
                    }
                }
            }
            comments.innerHTML = html; // Insert html.
        },
        /*}}}*/

        /** yygo.view.makeGamesList {{{
         * Create and insert games list html code.
         */
        makeGamesList: function () {
            var gameslist =     yygo.data.gameslist,
                loadlist =      document.getElementById('loadlist'),
                html =          '<table id="gameslist">',
                ci =            gameslist.length,
                i;

            for (i = 0; i < ci; i++) {
                html += '<tr><td>' + gameslist[i].id + '</td>' +
                    '<td>' + gameslist[i].name + '</td>';
            }
            html += '</table>';

            loadlist.innerHTML = html;
        },
        /*}}}*/

        /** yygo.view.makeInfos {{{
         * Create and insert informations html code.
         */
        makeInfos: function () {
            var infos =         yygo.data.game[0][0],
                locale =        yygo.data.locale,
                infoselem =     document.getElementById('infos'),
                html =          '<table>';

            if (infos.PB !== undefined) {
                html += '<tr><td class="infolabel"><em>' + locale.black +
                    ':</em></td><td>' + infos.PB;
                if (infos.BR !== undefined) {
                    html += ' [' + infos.BR + ']';
                }
                html += '</td></tr>';
            }

            if (infos.PW !== undefined) {
                html += '<tr><td class="infolabel"><em>' + locale.white +
                    ':</em></td><td>' + infos.PW;
                if (infos.WR !== undefined) {
                    html += ' [' + infos.WR + ']';
                }
                html += '</td></tr>';
            }

            if (infos.DT !== undefined) {
                html += '<tr><td class="infolabel"><em>' + locale.date +
                    ':</em></td><td>' + infos.DT + '</td></tr>';
            }
            if (infos.PC !== undefined) {
                html += '<tr><td class="infolabel"><em>' + locale.place +
                    ':</em></td><td>' + infos.PC + '</td></tr>';
            }
            if (infos.RU !== undefined) {
                html += '<tr><td class="infolabel"><em>' + locale.rules +
                    ':</em></td><td>' + infos.RU + '</td></tr>';
            }
            html += '</table>';

            infoselem.innerHTML = html;
        },
        /*}}}*/

        /** yygo.view.makeVariations {{{
         * Create and insert variations html code.
         */
        makeVariations: function () {
            var game =              yygo.data.game,
                curbranch =         yygo.data.curbranch,
                curnode =           yygo.data.curnode,
                branchs =           game[0][0].branchs,
                variationselem =    document.getElementById('variations'),
                variations =        0,
                html =              '',
                binds =             [],
                pbranch,
                opbranch,
                i;

            // Get parent of the current branch at previous node.
            pbranch = yygo.data.getParentBranch(curnode - 1, curbranch);

            // Browse the branchs to find variations of the actual branch.
            for (i = 0; i < branchs; i++) {
                if (game[curnode][i] !== undefined && curnode > 0) {
                    // Get parent of 'i' branch at previous node.
                    opbranch = yygo.data.getParentBranch(curnode - 1, i);
                    if (opbranch === pbranch) {
                        // Our branch and 'i' branch got the same parent so
                        // 'i' is a variation.
                        variations++;
                        if (i === curbranch) {
                            // This is our branch show a plain radio button.
                            html += '<div class="varbutton black"></div>';
                        } else {
                            // Show a clickable empty radio button.
                            html += '<a href="#" id="var' + i +
                                '" class="varbutton"></a>';
                            binds.push(i); // Add variation to the binds.
                        }
                    }
                }
            }

            if (variations <= 1) { // No variations, delete html.
                html = '';
            }

            variationselem.innerHTML = html;

            if (html !== '') {
                // Binds radio buttons to their respective variation.
                yygo.events.makeVariationsBinds(binds);
            }
        },
        /*}}}*/

        // Display.

        /** yygo.view.drawInterface {{{
         * Draw the goban and the panel.
         *
         * @param {Function} fn Callback.
         */
        drawInterface: function (fn) {
            var panel =         document.getElementById('panel'),
                goban =         document.getElementById('goban'),
                cells =         document.getElementsByClassName('cell'),
                cc =            cells.length,
                fontsize =      this.sizecell / 1.5,
                c;

            if (this.redraw) { // Redraw only when needed.
                this.redraw = false;
                // Resize goban.
                goban.style.height = this.sizegoban + 'px';
                goban.style.width = this.sizegoban + 'px';
                // Resize the cells.
                for (c = 0; c < cc; c++) {
                    cells[c].style.height = this.sizecell + 'px';
                    cells[c].style.width = this.sizecell + 'px';
                    cells[c].style.lineHeight = this.sizecell + 'px';
                    cells[c].style.fontSize = fontsize + 'px';
                }
            }
            // Place panel depending on orientation.
            if (this.orientation === 'horizontal') {
                // Move goban on left side and place comments on the right.
                if (this.showcomments && this.comtoshow) {
                    goban.style.margin = 0;
                } else {
                    goban.style.margin = 'auto';
                }
                panel.style.top = 0;
                panel.style.right = 0;
                panel.style.left = this.sizegoban + 'px';
            } else {
                // Keep goban centered and comments at bottom.
                goban.style.margin = 'auto';
                panel.style.top =  this.sizegoban + 'px';
                panel.style.right = 0;
                panel.style.left = 0;
            }
            fn();
        },
        /*}}}*/

        /** yygo.view.emptyGoban {{{
         * Empty the goban of all stones, symbols, labels.
         */
        emptyGoban: function () {
            var size =      yygo.data.size,
                classturn = yygo.data.playerturn === 'W' ? 'white' : 'black',
                coord =     ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                             'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
                stone,
                link,
                id,
                i,
                j;

            for (i = 0; i < size; i++) {
                for (j = 0; j < size; j++) {
                    id = coord[j] + coord[i];
                    stone = document.getElementById(id);
                    stone.className = 'stone';
                    stone.innerHTML = '';
                    link = stone.parentNode.getElementsByTagName('a')[0];
                    link.className = classturn;
                }
            }
        },
        /*}}}*/

        /** yygo.view.insertSymbolSvg {{{
         * Insert a symbol in a cell using svg format.
         *
         * @param {String} symbol   Symbol to insert.
         * @param {String} id       Identifier of the cell.
         * @param {String} color    Color of the stone in cell.
         */
        insertSymbolSvg: function (symbol, id, color) {
            var stone =  document.getElementById(id),
                svg =   '<svg xmlns="http://www.w3.org/2000/svg"' +
                        'version="1.1" viewBox="0 0 10 10">';

            if (symbol === 'CR') { // Circle.
                svg += '<circle cx="5" cy="5" r="2.5"' +
                    'stroke-width="0.7" fill="none"';
            } else if (symbol === 'SQ') { // Square.
                svg += '<rect x="1.8" y="1.8" width="6.5"' +
                    'height="6.5" stroke-width="0.7" fill="none"';
            } else if (symbol === 'TR') { // Triangle.
                svg += '<path d="M5 0.5 L8.8 7.4 L1.2 7.4 Z"' +
                    'stroke-width="0.7" fill="none"';
            }

            if (color === 'b') { // Stone is black make symbol color white.
                svg += ' stroke="#f9f0ca"/></svg>';
            } else {
                svg += ' stroke="#000"/></svg>';
            }

            stone.innerHTML = svg;
        },
        /*}}}*/

        /** yygo.view.placeStones {{{
         * Place the stones and kos of the actual state on the goban.
         * Also remove links of those to make them unplayable moves.
         */
        placeStones: function () {
            var node =          yygo.data.curnode,
                branch =        yygo.data.curbranch,
                stones =        yygo.data.stones[node][branch];

            function placeColor(list, color) {
                var listlen = list.length,
                    stone,
                    link,
                    i;

                for (i = 0; i < listlen; i++) {
                    stone = document.getElementById(list[i]);
                    stone.classList.add(color);
                    link = stone.parentNode.getElementsByTagName('a')[0];
                    link.className = 'none';
                }
            }

            placeColor(stones.B, 'black');
            placeColor(stones.W, 'white');
            placeColor(stones.K, 'ko');
        },
        /*}}}*/

        /** yygo.view.placeSymbols {{{
         * Place the symbols of the actual state on the goban.
         */
        placeSymbols: function () {
            var branch =        yygo.data.curbranch,
                node =          yygo.data.curnode,
                game =          yygo.data.game[node][branch];

            function insertSymbols(symbol, list) {//{{{
                var ci = list.length,
                    cell,
                    color,
                    label,
                    i;

                for (i = 0; i < ci; i++) {
                    if (symbol === 'LB') {
                        label = list[i].split(':');
                        cell = document.getElementById(label[0]);
                    } else {
                        cell = document.getElementById(list[i]);
                    }
                    if (cell.classList.contains('white')) {
                        color = 'w';
                    } else if (cell.classList.contains('black')) {
                        color = 'b';
                    } else {
                        color = '';
                    }
                    if (color === '' && symbol === 'LB') {
                        cell.classList.add('brown');
                    }
                    if (symbol === 'LB') {
                        cell.textContent = label[1];
                    } else {
                        yygo.view.insertSymbolSvg(symbol, list[i], color);
                    }
                }
            }
            //}}}

            // Circles.
            if (game.CR !== undefined) {
                insertSymbols('CR', game.CR);
            }
            // Squares.
            if (game.SQ !== undefined) {
                insertSymbols('SQ', game.SQ);
            }
            // Triangles.
            if (game.TR !== undefined) {
                insertSymbols('TR', game.TR);
            }
            // Labels.
            if (game.LB !== undefined) {
                insertSymbols('LB', game.LB);
            }
            // Circle to indicate the last played stone.
            if (game.W !== undefined && game.W[0] !== '') {
                insertSymbols('CR', game.W);
            } else if (game.B !== undefined && game.B[0] !== '') {
                insertSymbols('CR', game.B);
            }
        },
        /*}}}*/

        /** yygo.view.setGobanSize {{{
         * Define the size of the goban and elements depending on it. Redraw
         * if necessary or asked.
         *
         * @param {Function} fn Callback.
         */
        setGobanSize: function (fn) {
            var size =          yygo.data.size,
                winw =          window.innerWidth,
                winh =          window.innerHeight,
                oldsizegoban =  this.sizegoban,
                smaller;

            if (winw < winh) {
                this.orientation = 'vertical';
                if (this.showcomments && this.comtoshow &&
                        winh - 200 <= winw) {
                    smaller = winh - 200;
                } else {
                    smaller = winw;
                }
            } else {
                this.orientation = 'horizontal';
                if (this.showcomments && this.comtoshow &&
                        winw - 220 <= winh) {
                    smaller = winw - 220;
                } else {
                    smaller = winh;
                }
            }

            // Calculate the size of the goban and avoid bad display.
            this.sizecell = Math.floor(smaller / (size + 2));
            if (this.sizecell / 2 !== Math.round(this.sizecell / 2)) {
                this.sizecell--;
            }
            this.sizegoban = this.sizecell * (size + 2);

            // Redraw if size changed or if asked.
            if (this.sizegoban !== oldsizegoban || this.redraw) {
                this.redraw = true;
            }
            this.drawInterface(function () {
                fn();
            });
        },
        /*}}}*/

        /** yygo.view.toggleNavButtons {{{
         * Alternate active state of navigation buttons.
         */
        toggleNavButtons: function () {
            var curnode =       yygo.data.curnode,
                lastnode =      yygo.data.lastnode,
                butstart =     document.getElementById('butstart'),
                butprev =      document.getElementById('butprev'),
                butfastprev =  document.getElementById('butfastprev'),
                butnext =      document.getElementById('butnext'),
                butfastnext =  document.getElementById('butfastnext'),
                butend =       document.getElementById('butend');

            // Activate all buttons.
            butstart.classList.remove('disabled');
            butprev.classList.remove('disabled');
            butfastprev.classList.remove('disabled');
            butnext.classList.remove('disabled');
            butfastnext.classList.remove('disabled');
            butend.classList.remove('disabled');

            // We are at the start, make rewind buttons inactive.
            if (curnode === 0) {
                butstart.classList.add('disabled');
                butprev.classList.add('disabled');
                butfastprev.classList.add('disabled');
            }
            // We are at the end, make forward buttons inactive.
            if (curnode === lastnode) {
                butnext.classList.add('disabled');
                butfastnext.classList.add('disabled');
                butend.classList.add('disabled');
            }
        },
        /*}}}*/

        /** yygo.view.toggleComments {{{
         * Alternate the display of the comments.
         */
        toggleComments: function () {
            var comments =  document.getElementById('comments'),
                comment =   document.getElementById('comment');

            if (this.showcomments && this.comtoshow) {
                comments.style.display = 'block';
            } else {
                comments.style.display = 'none';
            }

            if (this.comtoshow) {
                comment.classList.remove('disabled');
            } else {
                comment.classList.add('disabled');
            }
        },
        /*}}}*/

        /** yygo.view.showGoban {{{
         * Alternate the display of the goban and panel.
         *
         * @param {Boolean} show Show goban and panel.
         */
        showGoban: function (show) {
            var goban = document.getElementById('goban'),
                panel = document.getElementById('panel');

            if (show) {
                goban.style.display = 'block';
                panel.style.display = 'block';
            } else {
                goban.style.display = 'none';
                panel.style.display = 'none';
            }
        },
        /*}}}*/

        /** yygo.view.showMenu {{{
         * Alternate the display of the options menu.
         *
         * @param {Boolean} show Show menu.
         */
        showMenu: function (show) {
            var menucontainer = document.getElementById('menucontainer'),
                menumask =      document.getElementById('menumask');

            if (show) {
                menucontainer.style.display = 'block';
                menumask.style.display = 'block';
            } else {
                menucontainer.style.display = 'none';
                menumask.style.display = 'none';
            }
        },
        /*}}}*/

        /** yygo.view.showLoading {{{
         * Alternate the display of Loading...
         *
         * @param {Boolean} show Loading...
         */
        showLoading: function (show) {
            var loading = document.getElementById('loading');

            if (show) {
                loading.style.display = 'block';
            } else {
                loading.style.display = 'none';
            }
        },
        /*}}}*/

        /** yygo.view.showLoad {{{
         * Alternate the display of the page to load a game.
         *
         * @param {Boolean} show Show page.
         * @param {Boolean} refresh Force list refresh.
         */
        showLoad: function (show, refresh) {
            var load =      document.getElementById('load'),
                prevpage =  document.getElementById('prevpage'),
                nextpage =  document.getElementById('nextpage'),
                gameslist = document.getElementById('gameslist'),
                page =      yygo.data.listpage,
                list =      yygo.data.gameslist,
                html = '',
                i;

            if (refresh === undefined) {
                refresh = false;
            }

            if (show) {
                if (page === 0) {
                    prevpage.style.display = 'none';
                } else {
                    prevpage.style.display = 'inline';
                }
                if (isEmpty(list) || refresh) { // Get fresh list from server.
                    jsonRequest('/gameslist/' + page, 'GET', function (data) {
                        var datalen = data.length,
                            ids = [];

                        // More than one page.
                        if (datalen === 11) {
                            nextpage.style.display = 'inline';
                            datalen--;
                            data.pop();
                        } else {
                            nextpage.style.display = 'none';
                        }
                        yygo.data.gameslist = data;
                        for (i = 0; i < datalen; i++) {
                            html += '<tr><td><a class="linkbutton brown2" ' +
                                'href="#">' + data[i].name + '</a></td></tr>';
                            ids.push(data[i]._id);
                        }
                        gameslist.innerHTML = html;
                        // Bind click events to list.
                        yygo.events.makeListBinds(ids);
                    });
                }
                yygo.view.showGoban(false);
                yygo.view.showMenu(false);
                load.style.display = 'block';
            } else {
                load.style.display = 'none';
                yygo.view.showGoban(true);
            }
        },
        /*}}}*/

        /** yygo.view.showSendSgf {{{
         * Alternate the display of the page to send sgf files.
         *
         * @param {Boolean} show Show page.
         */
        showSendSgf: function (show) {
            var sendsgf =       document.getElementById('sendsgf'),
                answersendsgf = document.getElementById('answersendsgf');

            if (show) {
                yygo.view.showGoban(false);
                yygo.view.showMenu(false);
                sendsgf.style.display = 'block';
                answersendsgf.style.display = 'none';
            } else {
                sendsgf.style.display = 'none';
                yygo.view.showGoban(true);
            }
        },
        /*}}}*/

        /** yygo.view.showSettings {{{
         * Alternate the display of the user settings.
         *
         * @param {Boolean} show Show page.
         */
        showSettings: function (show) {
            var settings =      document.getElementById('settings'),
                settingssaved = document.getElementById('settingssaved');

            if (show) {
                yygo.view.showGoban(false);
                yygo.view.showMenu(false);
                settings.style.display = 'block';
                settingssaved.style.display = 'none';
            } else {
                settings.style.display = 'none';
                yygo.view.showGoban(true);
            }
        }
        /*}}}*/

    };
    /*}}}*/

    /** yygo.events {{{
     * Events part of the yygo namespace.
     *
     * @property {String}   mode        Goban mode: replay, play, modify...
     * @property {String}   username    User name.
     * @property {String}   screen      Actual screen to show.
     */
    yygo.events = {

        // Properties.

        mode:           'replay',
        username:       '',
        screen:         'goban',

        // Methods.

        /** yygo.events.init {{{
         * This is where we start.
         */
        init: function () {
            // Get user session if it still exist.
            jsonRequest('/session', 'GET', function (session) {
                yygo.events.username = session.username;
                // Bind buttons to functions.
                yygo.events.makeBinds();
                if (session.data === '') {
                    // Load intro screen for guest and new users.
                    yygo.events.loadIntro();
                } else {
                    // Load game with provided data.
                    yygo.events.loadGame(session.data);
                }
            });

        },
        /*}}}*/

        /** yygo.events.loadGame {{{
         * Load a game.
         *
         * @param {Object} data Game data.
         */
        loadGame: function (data) {
            var oldsize = yygo.data.size;

            yygo.data.game = data;
            yygo.data.size = parseInt(yygo.data.game[0][0].SZ, 10);
            yygo.data.stones = yygo.data.calcStones(data);

            yygo.data.curnode = 0;
            yygo.data.curbranch = 0;
            yygo.data.lastbranch = 0;

            yygo.data.setLastNode();

            // Generate goban grid if necessary.
            if (yygo.data.size !== oldsize) {
                yygo.view.makeGoban();
            } else {
                yygo.view.emptyGoban();
            }

            yygo.view.makeVariations();
            //yygo.view.makeInfos();
            yygo.view.makeComments();

            yygo.view.placeStones();
            yygo.view.placeSymbols();

            yygo.events.mode = 'replay';
            yygo.events.screen = 'goban';

            yygo.view.toggleNavButtons();

            yygo.view.redraw = true;
            yygo.view.setGobanSize(function () {
                yygo.view.showLoading(false);
                yygo.view.showGoban(true);
            });
        },
        /*}}}*/

        /** yygo.events.loadIntro {{{
         * Load introductive goban data and show it.
         */
        loadIntro: function () {
            yygo.data.game = {0: {0: {
                'RU': ['Japanese'],
                'branchs': 1
            } } };
            yygo.data.stones = {0: {0: {
                'B': ['fm', 'fn', 'fo', 'fp', 'gl', 'gm', 'gn', 'go', 'gp',
                    'gq', 'hk', 'hl', 'hm', 'hn', 'ho', 'hp', 'hq', 'hr', 'ie',
                    'if', 'ik', 'il', 'im', 'in', 'ip', 'iq', 'ir', 'je', 'jf',
                    'jk', 'jl', 'jm', 'jp', 'jq', 'jr', 'js', 'ka', 'kj', 'kk',
                    'kl', 'km', 'kp', 'kq', 'kr', 'ks', 'la', 'lj', 'lk', 'll',
                    'lm', 'ln', 'lo', 'lp', 'lq', 'lr', 'ls', 'ma', 'mb', 'mi',
                    'mj', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms',
                    'nb', 'nc', 'nh', 'ni', 'nj', 'nk', 'nl', 'nm', 'nn', 'no',
                    'np', 'nq', 'nr', 'ob', 'oc', 'od', 'oe', 'of', 'og', 'oh',
                    'oi', 'oj', 'ok', 'ol', 'om', 'on', 'oo', 'op', 'oq', 'or',
                    'pc', 'pd', 'pe', 'pf', 'pg', 'ph', 'pi', 'pj', 'pk', 'pl',
                    'pm', 'pn', 'po', 'pp', 'pq', 'qd', 'qe', 'qf', 'qg', 'qh',
                    'qi', 'qj', 'qk', 'ql', 'qm', 'qn', 'qo', 'qp', 're', 'rf',
                    'rg', 'rh', 'ri', 'rj', 'rk', 'rl', 'rm', 'rn', 'ro', 'sg',
                    'sh', 'si', 'sj', 'sk', 'sl', 'sm'],
                'W': ['ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'be', 'bf',
                    'bg', 'bh', 'bi', 'bj', 'bk', 'bl', 'bm', 'bn', 'bo', 'cd',
                    'ce', 'cf', 'cg', 'ch', 'ci', 'cj', 'ck', 'cl', 'cm', 'cn',
                    'co', 'cp', 'dc', 'dd', 'de', 'df', 'dg', 'dh', 'di', 'dj',
                    'dk', 'dl', 'dm', 'dn', 'do', 'dp', 'dq', 'eb', 'ec', 'ed',
                    'ee', 'ef', 'eg', 'eh', 'ei', 'ej', 'ek', 'el', 'em', 'en',
                    'eo', 'ep', 'eq', 'er', 'fb', 'fc', 'fd', 'fe', 'ff', 'fg',
                    'fh', 'fi', 'fj', 'fk', 'fl', 'fq', 'fr', 'ga', 'gb', 'gc',
                    'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gj', 'gk', 'gr', 'gs',
                    'ha', 'hb', 'hc', 'hd', 'he', 'hf', 'hg', 'hh', 'hi', 'hj',
                    'hs', 'ia', 'ib', 'ic', 'id', 'ig', 'ih', 'ii', 'ij', 'is',
                    'ja', 'jb', 'jc', 'jd', 'jg', 'jh', 'ji', 'jn', 'jo', 'kb',
                    'kc', 'kd', 'kf', 'kg', 'kh', 'ki', 'kn', 'ko', 'lb', 'lc',
                    'ld', 'le', 'lf', 'lg', 'lh', 'li', 'mc', 'md', 'me', 'mf',
                    'mg', 'mh', 'nd', 'ne', 'nf', 'ng'],
                'K': []
            } } };

            yygo.data.size = 19;

            yygo.view.makeGoban();

            yygo.view.placeStones();
            yygo.view.placeSymbols();

            this.mode = 'replay';
            this.screen = 'goban';

            yygo.view.toggleNavButtons();

            yygo.view.redraw = true;
            yygo.view.setGobanSize(function () {
                yygo.view.showLoading(false);
                yygo.view.showGoban(true);
            });
        },
        /*}}}*/

        /** yygo.events.makeBinds {{{
         * Bind events to the elements.
         */
        makeBinds: function () {
            var menu =              document.getElementById('menu'),
                menucontainer =     document.getElementById('menucontainer'),
                menuload =          document.getElementById('menuload'),
                menusendsgf =       document.getElementById('menusendsgf'),
                menusettings =      document.getElementById('menusettings'),
                menulogout =        document.getElementById('menulogout'),
                menuback =          document.getElementById('menuback'),
                exitload =          document.getElementById('exitload'),
                prevpage =          document.getElementById('prevpage'),
                nextpage =          document.getElementById('nextpage'),
                refreshlist =       document.getElementById('refreshlist'),
                exitsettings =      document.getElementById('exitsettings'),
                submitsettings =    document.getElementById('submitsettings'),
                exitsendsgf =       document.getElementById('exitsendsgf'),
                submitsgf =         document.getElementById('submitsgf'),
                butmenu =           document.getElementById('butmenu'),
                butstart =          document.getElementById('butstart'),
                butfastprev =       document.getElementById('butfastprev'),
                butprev =           document.getElementById('butprev'),
                butnext =           document.getElementById('butnext'),
                butfastnext =       document.getElementById('butfastnext'),
                butend =            document.getElementById('butend');

            // Window resize.{{{
            window.addEventListener('resize', function () {
                yygo.view.setGobanSize(function () {});
            }, false);
            //}}}

            // Only registered users.{{{
            if (yygo.events.username !== 'guest') {
                menusendsgf.addEventListener('click', function () {
                    yygo.view.showSendSgf(true);
                }, false);
            }
            //}}}

            // Menu buttons.{{{
            menuload.addEventListener('click', function () {
                yygo.view.showLoad(true);
            }, false);
            menusettings.addEventListener('click', function () {
                yygo.view.showSettings(true);
            }, false);
            menulogout.addEventListener('click', function () {
                window.location.href = '/logout';
            }, false);
            menuback.addEventListener('click', function () {
                yygo.view.showMenu(false);
            }, false);
            menucontainer.addEventListener('click', function () {
                yygo.view.showMenu(false);
            }, false);
            menu.addEventListener('click', function (event) {
                event.stopPropagation();
            }, false);
            //}}}

            // Load page specific.{{{
            exitload.addEventListener('click', function () {
                yygo.view.showLoad(false);
            }, false);
            prevpage.addEventListener('click', function () {
                yygo.data.listpage--;
                yygo.view.showLoad(true, true);
            }, false);
            nextpage.addEventListener('click', function () {
                yygo.data.listpage++;
                yygo.view.showLoad(true, true);
            }, false);
            refreshlist.addEventListener('click', function () {
                yygo.view.showLoad(true, true);
            }, false);
            //}}}

            // Settings specific.{{{
            exitsettings.addEventListener('click', function () {
                yygo.view.showSettings(false);
            }, false);
            submitsettings.addEventListener('click', function () {
                var settingssaved = document.getElementById('settingssaved'),
                    settings =      new FormData(this.form);

                settingssaved.style.display = 'none';
                jsonRequest('/settings', 'POST', settings, function (data) {
                    if (data) {
                        settingssaved.style.display = 'block';
                    }
                });
            }, false);
            //}}}

            // Send sgf specific.{{{
            exitsendsgf.addEventListener('click', function () {
                yygo.view.showSendSgf(false);
            }, false);
            submitsgf.addEventListener('click', function () {
                var answersendsgf = document.getElementById('answersendsgf'),
                    errorinvalid =  document.getElementById('errorinvalid'),
                    errormd5 =      document.getElementById('errormd5'),
                    sendsuccess =   document.getElementById('sendsuccess'),
                    file =          new FormData(this.form);

                answersendsgf.style.display = 'none';
                errorinvalid.style.display = 'none';
                errormd5.style.display = 'none';
                sendsuccess.style.display = 'none';
                jsonRequest('/sendsgf', 'POST', file, function (data) {
                    if (data.answer === 'invalid') {
                        answersendsgf.style.display = 'inline-block';
                        errorinvalid.style.display = 'block';
                    } else if (data.answer === 'md5') {
                        answersendsgf.style.display = 'inline-block';
                        errormd5.style.display = 'block';
                    } else if (data.answer === 'success') {
                        answersendsgf.style.display = 'inline-block';
                        sendsuccess.style.display = 'block';
                    }
                });
            }, false);
            //}}}

            // Buttons bar.{{{
            butmenu.addEventListener('click', function () {
                yygo.view.showMenu(true);
            }, false);
            butstart.addEventListener('click', function () {
                if (yygo.data.curnode > 0) {
                    yygo.events.navigateNode(-999999);
                }
            }, false);
            butfastprev.addEventListener('click', function () {
                if (yygo.data.curnode > 0) {
                    yygo.events.navigateNode(-10);
                }
            }, false);
            butprev.addEventListener('click', function () {
                if (yygo.data.curnode > 0) {
                    yygo.events.navigateNode(-1);
                }
            }, false);
            butnext.addEventListener('click', function () {
                if (yygo.data.curnode < yygo.data.lastnode) {
                    yygo.events.navigateNode(1);
                }
            }, false);
            butfastnext.addEventListener('click', function () {
                if (yygo.data.curnode < yygo.data.lastnode) {
                    yygo.events.navigateNode(10);
                }
            }, false);
            butend.addEventListener('click', function () {
                if (yygo.data.curnode < yygo.data.lastnode) {
                    yygo.events.navigateNode(999999);
                }
            }, false);
            //}}}
        },
        /*}}}*/

        /** yygo.events.makeGobanBinds {{{
         * Assign each goban intersection a click event.
         */
        makeGobanBinds: function () {
            var size =      yygo.data.size,
                letter =    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
                             'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
                i,
                j;

            function bindStone(coord) {
                var stone = document.getElementById(coord);

                // Add listener to parent to catch click on <a> also.
                stone.parentNode.addEventListener('click', function () {
                    var stone = this.getElementsByClassName('stone')[0],
                        id =    stone.id,
                        mode =  yygo.events.mode;

                    if (mode === 'replay' && (stone.className === 'stone' ||
                            stone.className === 'stone brown')) {
                        yygo.events.playStone(id);
                    }
                    // TODO Other modes.
                }, false);
            }

            for (i = 0; i < size; i++) {
                for (j = 0; j < size; j++) {
                    bindStone(letter[i] + letter[j]);
                }
            }
        },
        /*}}}*/

        /** yygo.events.makeListBinds {{{
         * Assign a click event to each row in games list to load the proper
         * game index.
         *
         * @param {Array} ids Identifiers for database reference.
         */
        makeListBinds: function (ids) {
            var table =     document.getElementById('gameslist'),
                rows =      table.getElementsByTagName('tr'),
                rl =        rows.length,
                r;

            function bindRow(r) {
                rows[r].addEventListener('click', function () {
                    var row = this.rowIndex;

                    // Show loading screen.
                    yygo.view.showLoading(true);
                    yygo.view.showLoad(false);
                    yygo.view.showGoban(false);
                    // Get data of game corresponding clicked row.
                    jsonRequest('/load/' + ids[row], 'GET', function (data) {
                        yygo.events.loadGame(data);
                    });
                }, false);
            }

            for (r = 0; r < rl; r++) {
                bindRow(r);
            }
        },
        /*}}}*/

        /** yygo.events.makeVariationsBinds {{{
         * Assign each variation radio button a click event with proper
         * reference to it.
         */
        makeVariationsBinds: function (binds) {
            var ci = binds.length,
                varbut,
                i;

            function varbutClick(id) {
                return function () {
                    var branch = parseInt(id.substr(3), 10);

                    yygo.data.curbranch = branch;
                    yygo.data.lastbranch = branch;

                    yygo.data.setLastNode();

                    yygo.view.toggleNavButtons();

                    yygo.view.makeVariations();
                    yygo.view.makeComments();

                    yygo.view.emptyGoban();
                    yygo.view.placeStones();
                    yygo.view.placeSymbols();
                };
            }

            for (i = 0; i < ci; i++) {
                varbut = document.getElementById('var' + binds[i]);
                varbut.addEventListener('click', varbutClick(varbut.id),
                    false);
            }
        },
        /*}}}*/

        /** yygo.events.navigateNode {{{
         * Navigate the game depending on the defined last branch.
         *
         * @param {Number} move Move to apply to current position in game.
         */
        navigateNode: function (move) {
            var game =          yygo.data.game,
                branch =        yygo.data.curbranch,
                node =          yygo.data.curnode,
                lastbranch =    yygo.data.lastbranch,
                lastnode =      yygo.data.lastnode,
                prevnode,
                prevbranch,
                lastbranchp;

            // Define the new current node.
            if (node + move < 0) {
                node = 0;
            } else if (node + move > lastnode) {
                node = lastnode;
            } else {
                node = node + move;
            }

            // Get the parent of the last branch at new current node.
            lastbranchp = yygo.data.getParentBranch(node, lastbranch);

            // Define the new current branch.
            if (move < 0 && game[node][branch] === undefined) {
                // We are moving back and the current branch is no more so
                // current branch is now last branch parent.
                branch = lastbranchp;
            } else if (move > 0) {
                // We are moving forward.
                if (game[node][lastbranch] !== undefined) {
                    // Last branch exist at this new current node so make it
                    // the current branch.
                    branch = lastbranch;
                } else {
                    // Current branch is the branch that lead to last branch,
                    // that mean last branch parent.
                    branch = lastbranchp;
                }
            }

            // Who plays next ?
            if (game[node][branch].B !== undefined) { // Black just played.
                // Check for handicaps stones.
                if (game[0][0].HA !== undefined) {
                    if (node > game[0][0].HA[0] - 1) {
                        yygo.data.playerturn = 'W';
                    } else {
                        yygo.data.playerturn = 'B';
                    }
                } else {
                    yygo.data.playerturn = 'W';
                }
            } else if (game[node][branch].W !== undefined) { // White did.
                yygo.data.playerturn = 'B';
            } else { // Probably some demonstration or we are back to start.
                prevnode = node - 1 >= 0 ? node - 1 : 0;
                prevbranch = branch;
                while (prevnode >= 0) {
                    prevbranch =
                        yygo.data.getParentBranch(prevnode, prevbranch);
                    if (game[prevnode][prevbranch].B !== undefined) {
                        yygo.data.playerturn = 'W';
                        break;
                    } else if (game[prevnode][prevbranch].W !== undefined) {
                        yygo.data.playerturn = 'B';
                        break;
                    }
                    if (prevnode === 0) {
                        yygo.data.playerturn = 'B';
                        break;
                    }
                    prevnode--;
                }
            }

            yygo.data.curbranch = branch;
            yygo.data.curnode = node;

            yygo.view.toggleNavButtons();

            yygo.view.makeVariations();
            yygo.view.makeComments();

            yygo.view.emptyGoban();
            yygo.view.placeStones();
            yygo.view.placeSymbols();
        },
        /*}}}*/

        /** yygo.events.playStone {{{
         * User played a move.
         *
         * @param {String} coord Coordinate clicked.
         */
        playStone: function (coord) {
            var turn =      yygo.data.playerturn,
                game =      yygo.data.game,
                node =      yygo.data.curnode,
                branch =    yygo.data.curbranch,
                branchs =   game[0][0].branchs,
                exist =     false,
                parentbranch,
                i;

            // Browse next node branchs to check if that move exist.
            for (i = branch; i < branchs; i++) {
                parentbranch = yygo.data.getParentBranch(node, i);
                if (parentbranch === branch && game[node + 1] !== undefined &&
                        game[node + 1][i] !== undefined &&
                        game[node + 1][i][turn] !== undefined &&
                        game[node + 1][i][turn][0] === coord) {
                    // That move already exist in a child branch, change last
                    // branch and show it.
                    exist = true;
                    yygo.data.lastbranch = i;
                    yygo.events.navigateNode(1);
                    break;
                }
            }
            if (!exist) {
                if (game[node + 1] === undefined ||
                        game[node + 1][branch] === undefined) {
                    yygo.data.addMove(coord);
                } else {
                    yygo.data.addBranch(coord);
                }
            }
        },
        /*}}}*/

        /** yygo.events.serverResponse {{{
         * Show the response of the server after sending a sgf file,
         * user login or user registration.
         */
        serverResponse: function () {
            var locale =            yygo.data.locale,
                serverresponse =    document.getElementById('serverresponse'),
                response;

            response = frames.resframe
                .document.getElementsByTagName("body")[0].innerHTML;

            if (response === 'invalidsgf') {
                serverresponse.textContent = locale.invalidsgf;
            } else if (response === 'sendsuccess') {
                serverresponse.textContent = locale.sendsuccess;
            } else if (response === 'sgfexist') {
                serverresponse.textContent = locale.sgfexist;
            } else if (response === 'invalidnick') {
                serverresponse.textContent = locale.invalidnick;
            } else if (response === 'invalidmail') {
                serverresponse.textContent = locale.invalidmail;
            } else if (response === 'nickexist') {
                serverresponse.textContent = locale.nickexist;
            } else if (response === 'regsuccess') {
                serverresponse.textContent = locale.regsuccess;
            } else if (response === 'wrong') {
                serverresponse.textContent = locale.wrong;
            } else if (response === 'login') {
                this.username = document.getElementById('username').value;
                this.screen = 'options';
            } else if (response === 'logout') {
                // Reload page after logout.
                window.location.reload();
            } else {
                serverresponse.textContent = locale.error;
            }
        }
        /*}}}*/

    };
    /*}}}*/

    // Call init when DOM is loaded.
    document.addEventListener('DOMContentLoaded', yygo.events.init(), false);

}());
