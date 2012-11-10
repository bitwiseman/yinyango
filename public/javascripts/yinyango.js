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
     * @param {Function} callback Callback function.
     */
    function jsonRequest(url, callback) {
        var xhr = new XMLHttpRequest(); // Ignore old IE.

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 &&
                    (xhr.status === 200 || xhr.status === 0)) {
                callback(JSON.parse(xhr.responseText));
            }
        };

        xhr.open('GET', url, true); // Asynchronous GET.
        xhr.send(null);
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
        score:          {b: 0, w: 0},

        branchs:        0,
        size:           0,

        curbranch:      0,
        curnode:        0,
        lastbranch:     0,
        lastnode:       0,

        // Methods.

        /** yygo.data.calcStones {{{
         * Calculate all the stones present at each goban step.
         *
         * @param {Object} data Game data.
         *
         * @return {Object} Stones.
         */
        calcStones: function (data) {
            var stones = {},
                size = yygo.data.size,
                parentbranch,
                prevstones,
                key,
                node,
                branch;

            function keyAction(node, branch, key, value, stones) {
                var play;

                switch (key) {
                case 'B':
                    if (value[0] !== '') { // Did not pass.
                        play = gotools.playMove('b', value[0], size, stones); 
                        stones = play.stones;
                        yygo.data.score.b += play.prisonners; 
                    }
                    break;
                case 'W':
                    if (value[0] !== '') { // Did not pass.
                        play = gotools.playMove('w', value[0], size, stones); 
                        stones = play.stones;
                        yygo.data.score.w += play.prisonners; 
                    }
                    break;
                case 'AB':
                    stones = gotools.addStones('b', value, size, stones); 
                    break;
                case 'AW':
                    stones = gotools.addStones('w', value, size, stones); 
                    break;
                case 'AE':
                    stones = gotools.addStones('', value, size, stones); 
                    break;
                }
                return stones;
            }

            for (node in data) {
                stones[node] = {};
                for (branch in data[node]) {
                    stones[node][branch] = {b: [], w: [], k: []};
                    // Load previous stones.
                    parentbranch = yygo.data.getParentBranch(node - 1, branch);
                    if (node > 0) {
                        prevstones = stones[node - 1][parentbranch];
                    } else {
                        prevstones = stones[node][branch];
                    }
                    // Treat keys.
                    for (key in data[node][branch]) {
                        prevstones = keyAction(node, branch, key,
                                data[node][branch][key], prevstones);
                    }
                    // Save stones.
                    stones[node][branch] = prevstones;
                }
            }
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

            jsonRequest('games/' + id, function (data) {
                yygo.data.game = data;

                yygo.data.size = parseInt(yygo.data.game[0][0].SZ, 10);
                yygo.data.branchs = yygo.data.game[0][0].branchs;

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
        showmenu:       false,

        sizecell:       0,
        sizegoban:      0,

        // Methods.

        // Construction/insertion of html code.

        /** yygo.view.makeGoban {{{
         * Create and insert goban html code. This include the borders and
         * the grid.
         */
        makeGoban: function () {
            var size = yygo.data.size,
                gobanelem = document.getElementById('goban'),
                letters =   ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J',
                            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
                btop =      '<div id="btop"><div class="cell"></div>',
                bright =    '<div id="bright"><div class="cell vcell"></div>',
                bbottom =   '<div id="bbottom"><div class="cell"></div>',
                bleft =     '<div id="bleft"><div class="cell vcell"></div>',
                html,
                i;

            // Make borders.
            for (i = 0; i < size; i++) {
                btop += '<div class="cell">' + letters[i] + '</div>';
                bright += '<div class="cell vcell">' + (size - i) + '</div>';
                bbottom += '<div class="cell">' + letters[i] + '</div>';
                bleft += '<div class="cell vcell">' + (size - i) + '</div>';
            }

            btop += '</div>';
            bright += '</div>';
            bbottom += '</div>';
            bleft += '</div>';

            // Make grid and insert it with borders in goban element.
            html = btop + bright + bbottom + bleft +
                   '<div id="grid">' + this.makeGrid()  + '</div>';

            gobanelem.innerHTML = html;
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

        /** yygo.view.makeGrid {{{
         * Create grid to be inserted in goban element.
         *
         * @return {String} Grid html code.
         */
        makeGrid: function () {
            var size =      yygo.data.size,
                coord =     ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                            'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
                html =      '',
                cell,
                i,
                j;

            for (i = 0; i < size; i++) {
                html += '<div>'; // Row start.
                for (j = 0; j < size; j++) {
                    cell = coord[j] + coord[i];
                    html += '<div class="cell" id="' + cell + '"></div>';
                }
                html += '</div>'; // Row end.
            }
            return html;
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
                branchs =           yygo.data.branchs,
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
                            html += '<div class="varbutton plain black"></div>';
                        } else {
                            // Show a clickable empty radio button.
                            html += '<div id="var' + i + 
                                '" class="varbutton"></div>';
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

        /** yygo.view.changeButtons {{{
         * Change the displayed buttons depending on the actual screen.
         */
        changeButtons: function () {
            var mode =          yygo.events.mode,
                screen =        yygo.events.screen,
                navbuttons =    document.getElementById('navbuttons'),
                optbuttons =    document.getElementById('optbuttons'),
                sendsgf =       document.getElementById('sendsgf'),
                userstatus =    document.getElementById('userstatus'),
                gobbuttons =    document.getElementById('gobbuttons'),
                listbuttons =   document.getElementById('listbuttons'),
                game =          document.getElementById('game'),
                menu =          document.getElementById('menu');

            // Hide all buttons.
            navbuttons.style.display = 'none';
            optbuttons.style.display = 'none';
            gobbuttons.style.display = 'none';
            listbuttons.style.display = 'none';
            game.style.display = 'none';
            menu.style.display = 'none';

            // Show the buttons we need for the actual screen.
            if (screen === 'goban') {
                gobbuttons.style.display = 'block';
                menu.style.display = 'block';
                if (mode === 'replay') {
                    navbuttons.style.display = 'block';
                }
                // TODO Other modes.
            } else if (screen === 'options') {
                optbuttons.style.display = 'block';
                game.style.display = 'block';
                // Consider user login status.
                if (yygo.events.username === 'guest') {
                    sendsgf.style.display = 'none';
                    userstatus.style.backgroundColor = '#cf142b';
                } else {
                    sendsgf.style.display = 'block';
                    userstatus.style.backgroundColor = '#96b14e';
                }
            } else if (screen === 'list') {
                game.style.display = 'block';
                listbuttons.style.display = 'block';
                options.style.display = 'block';
            } else if (screen === 'sendsgf') {
                game.style.display = 'block';
                options.style.display = 'block';
            } else if (screen === 'login') {
                game.style.display = 'block';
                options.style.display = 'block';
            } else if (screen === 'register') {
                game.style.display = 'block';
                options.style.display = 'block';
            } else if (screen === 'param') {
                game.style.display = 'block';
                options.style.display = 'block';
            }
        },
        /*}}}*/

        /** yygo.view.changeGridImage {{{
         * Change the background svg image depending on the goban size.
         */
        changeGridImage: function () {
            var grid = document.getElementById('grid');

            grid.style.background = 'url(images/' + yygo.data.size + '.svg)';
        },
        /*}}}*/

        /** yygo.view.changeScreen {{{
         * Change the elements to display depending on the actual screen.
         */
        changeScreen: function () {
            var screen =            yygo.events.screen,
                buttonsbar =        document.getElementById('buttonsbar'),
                variations =        document.getElementById('variations'),
                goban =             document.getElementById('goban'),
                comments =          document.getElementById('comments'),
                infos =             document.getElementById('infos'),
                loadlist =          document.getElementById('loadlist');

            // Hide all elements.
            buttonsbar.style.display = 'none';
            variations.style.display = 'none';
            goban.style.display = 'none';
            comments.style.display = 'none';
            infos.style.display = 'none';
            loadlist.style.display = 'none';

            //this.changeButtons(); // Change the buttons to display.

            // Show the elements we need for the actual screen.
            if (screen === 'goban') {
                buttonsbar.style.display = 'inline-block';
                variations.style.display = 'block';
                goban.style.display = 'block';
                this.toggleComments();
            } else if (screen === 'options') {
                buttonsbar.style.display = 'inline-block';
                infos.style.display = 'block';
            } else if (screen === 'list') {
                buttonsbar.style.display = 'inline-block';
                loadlist.style.display = 'block';
            } else if (screen === 'sendsgf') {
                buttonsbar.style.display = 'inline-block';
            } else if (screen === 'login') {
                buttonsbar.style.display = 'inline-block';
            } else if (screen === 'register') {
                buttonsbar.style.display = 'inline-block';
            } else if (screen === 'param') {
                buttonsbar.style.display = 'inline-block';
            }
        },
        /*}}}*/

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
            var size =  yygo.data.size,
                coord = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                        'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
                stone,
                id,
                i,
                j;

            for (i = 0; i < size; i++) {
                for (j = 0; j < size; j++) {
                    id = coord[j] + coord[i];
                    stone = document.getElementById(id);
                    stone.className = 'stone';
                    stone.innerHTML = '';
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
         */
        placeStones: function () {
            var game =          yygo.data.game,
                curnode =       yygo.data.curnode,
                curbranch =     yygo.data.curbranch,
                stones =        yygo.data.stones[curnode][curbranch],
                cb =            stones.b.length,
                cw =            stones.w.length,
                ck =            stones.k.length,
                stone,
                b,
                w,
                k;

            for (b = 0; b < cb; b++) {
                stone = document.getElementById(stones.b[b]);
                stone.classList.add('black');
            }
            for (w = 0; w < cw; w++) {
                stone = document.getElementById(stones.w[w]);
                stone.classList.add('white');
            }
            for (k = 0; k < ck; k++) {
                stone = document.getElementById(stones.k[k]);
                stone.classList.add('ko');
            }
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

        /** yygo.view.setMenuPosition {{{
         * Define the position of options menu.
         */
        setMenuPosition: function () {
            var winw = window.innerWidth,
                winh = window.innerHeight,
                menu = document.getElementById('menu'),
                menuw = menu.offsetWidth,
                menuh = menu.offsetHeight,
                menuleft,
                menutop;

            menuleft = (winw / 2) - (menuw / 2);
            menutop = (winh / 2) - (menuh / 2);
            menu.style.left = menuleft + 'px';
            menu.style.top = menutop + 'px';
        },
        /*}}}*/

        /** yygo.view.toggleBorders {{{
         * Alternate the display of the goban borders.
         */
        toggleBorders: function () {
            var btop =      document.getElementById('btop'),
                bright =    document.getElementById('bright'),
                bbottom =   document.getElementById('bbottom'),
                bleft =     document.getElementById('bleft');

            if (this.showborders) {
                btop.style.display = 'block';
                bright.style.display = 'block';
                bbottom.style.display = 'block';
                bleft.style.display = 'block';
            } else {
                btop.style.display = 'none';
                bright.style.display = 'none';
                bbottom.style.display = 'none';
                bleft.style.display = 'none';
            }
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

        /** yygo.view.toggleMenu {{{
         * Alternate the display of the options menu.
         */
        toggleMenu: function () {
            var menu =      document.getElementById('menu'),
                menumask =  document.getElementById('menumask');

            if (!this.showmenu) {
                menu.style.display = 'inline-block';
                menumask.style.display = 'block';
                yygo.view.setMenuPosition();
                this.showmenu = true;
            } else {
                menu.style.display = 'none';
                menumask.style.display = 'none';
                this.showmenu = false;
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
            jsonRequest('/session', function (session) {
                yygo.events.username = session.username;
                // TODO: Ask user what to load, previous session ?
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
            var oldsize = yygo.data.size,
                goban = document.getElementById('goban'),
                panel = document.getElementById('panel'),
                loading = document.getElementById('loading');

            yygo.data.game = data;
            yygo.data.size = parseInt(yygo.data.game[0][0].SZ, 10);
            yygo.data.stones = yygo.data.calcStones(data);

            yygo.data.branchs = yygo.data.game[0][0].branchs;

            yygo.data.curnode = 0;
            yygo.data.curbranch = 0;
            yygo.data.lastbranch = 0;

            yygo.data.setLastNode();

            // Make view.
            //if (yygo.data.size !== oldsize) { // New size remake all.
                //yygo.view.makeGoban();
                //yygo.view.changeGridImage();
            //} else { // Empty goban only.
                //yygo.view.emptyGoban();
            //}

            yygo.view.makeVariations();
            //yygo.view.makeInfos();
            yygo.view.makeComments();

            yygo.view.placeStones();
            yygo.view.placeSymbols();

            yygo.events.mode = 'replay';
            yygo.events.screen = 'goban';

            //yygo.view.changeScreen();

            //yygo.view.toggleBorders();
            yygo.view.toggleNavButtons();

            yygo.view.redraw = true;
            yygo.view.setGobanSize(function () {
                loading.style.display = 'none';
                goban.style.display = 'block';
                panel.style.display = 'block';
            });
        },
        /*}}}*/

        /** yygo.events.loadIntro {{{
         * Load introductive goban data and show it.
         */
        loadIntro: function () {
            var goban = document.getElementById('goban'),
                panel = document.getElementById('panel'),
                loading = document.getElementById('loading');

            yygo.data.game = {0: {0: {} } };
            yygo.data.stones = {0: {0: {
                'b': ['fm', 'fn', 'fo', 'fp', 'gl', 'gm', 'gn', 'go', 'gp',
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
                'w': ['ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'be', 'bf',
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
                'k': []
            } } };

            yygo.data.size = 19;

            //yygo.view.makeGoban();
            //yygo.view.changeGridImage();

            yygo.view.placeStones();
            yygo.view.placeSymbols();

            this.mode = 'replay';
            this.screen = 'goban';

            //yygo.view.changeScreen();

            //yygo.view.toggleBorders();
            yygo.view.toggleNavButtons();

            yygo.view.redraw = true;
            yygo.view.setGobanSize(function () {
                loading.style.display = 'none';
                goban.style.display = 'block';
                panel.style.display = 'block';
            });
        },
        /*}}}*/

        /** yygo.events.makeBinds {{{
         * Bind events to the elements.
         */
        makeBinds: function () {
            var menuload =      document.getElementById('menuload'),
                menusendsgf =   document.getElementById('menusendsgf'),
                menusettings =  document.getElementById('menusettings'),
                menulogout =    document.getElementById('menulogout'),
                menuback =      document.getElementById('menuback'),
                menumask =      document.getElementById('menumask'),
                butmenu =       document.getElementById('butmenu'),
                butstart =      document.getElementById('butstart'),
                butfastprev =   document.getElementById('butfastprev'),
                butprev =       document.getElementById('butprev'),
                butnext =       document.getElementById('butnext'),
                butfastnext =   document.getElementById('butfastnext'),
                butend =        document.getElementById('butend');

            // Window resize.
            window.addEventListener('resize', function () {
                yygo.view.setGobanSize(function () {});
                if (yygo.view.showmenu === true) {
                    yygo.view.setMenuPosition();
                }
            }, false);

            // Only registered users.
            if (yygo.events.username !== 'guest') {
                menusendsgf.addEventListener('click', function () {
                    window.location.href = '/sendsgf';
                }, false);
            }
            // Menu buttons.
            menuload.addEventListener('click', function () {
                window.location.href = '/load';
            }, false);
            menusettings.addEventListener('click', function () {
                window.location.href = '/settings';
            }, false);
            menulogout.addEventListener('click', function () {
                window.location.href = '/logout';
            }, false);
            menuback.addEventListener('click', function () {
                yygo.view.toggleMenu();
            }, false);
            menumask.addEventListener('click', function () {
                yygo.view.toggleMenu();
            }, false);
            // Buttons bar.
            butmenu.addEventListener('click', function () {
                yygo.view.toggleMenu();
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
        },
        /*}}}*/

        /** yygo.events.makeListBinds {{{
         * Assign a click event to each row in games list to load the proper
         * game index.
         */
        makeListBinds: function () {
            var table =     document.getElementById('gameslist'),
                rows =      table.getElementsByTagName('tr'),
                rl =        rows.length,
                r;

            function rowClick(rowindex) {
                return function () {
                    yygo.events.loadGameFromList(rowindex);
                };
            }

            for (r = 0; r < rl; r++) {
                rows[r].addEventListener('click', rowClick(rows[r].rowIndex),
                    false);
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
                curbranch =     yygo.data.curbranch,
                curnode =       yygo.data.curnode,
                lastbranch =    yygo.data.lastbranch,
                lastnode =      yygo.data.lastnode,
                lastbranchp;

            // Define the new current node.
            if (curnode + move < 0) {
                curnode = 0;
            } else if (curnode + move > lastnode) {
                curnode = lastnode;
            } else {
                curnode = curnode + move;
            }

            // Get the parent of the last branch at new current node.
            lastbranchp = yygo.data.getParentBranch(curnode, lastbranch);

            // Define the new current branch.
            if (move < 0 && game[curnode][curbranch] === undefined) {
                // We are moving back and the current branch is no more so
                // current branch is now last branch parent.
                curbranch = lastbranchp;
            } else if (move > 0) {
                // We are moving forward.
                if (game[curnode][lastbranch] !== undefined) {
                    // Last branch exist at this new current node so make it
                    // the current branch.
                    curbranch = lastbranch;
                } else {
                    // Current branch is the branch that lead to last branch,
                    // that mean last branch parent.
                    curbranch = lastbranchp;
                }
            }

            yygo.data.curbranch = curbranch;
            yygo.data.curnode = curnode;

            yygo.view.toggleNavButtons();

            yygo.view.makeVariations();
            yygo.view.makeComments();

            yygo.view.emptyGoban();
            yygo.view.placeStones();
            yygo.view.placeSymbols();
        },
        /*}}}*/

        /** yygo.events.clickBorders {{{
         * Toggle display state of the goban borders.
         */
        clickBorders: function () {
            if (yygo.view.showborders) {
                yygo.view.showborders = false;
                yygo.view.toggleBorders();
            } else {
                yygo.view.showborders = true;
                yygo.view.toggleBorders();
            }
        },
        /*}}}*/

        /** yygo.events.clickComments {{{
         * Toggle display state of the comments.
         */
        clickComments: function () {
            if (yygo.view.showcomments && yygo.view.comtoshow) {
                yygo.view.showcomments = false;
                //yygo.view.toggleComments();
                yygo.view.setGobanSize();
            } else if (yygo.view.comtoshow) {
                yygo.view.showcomments = true;
                //yygo.view.toggleComments();
                yygo.view.setGobanSize();
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
                //yygo.view.changeScreen();
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
