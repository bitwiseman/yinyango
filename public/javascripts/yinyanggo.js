/**
 * User interface of yinyanggo.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0
 * @link     https://github.com/hickop/yinyanggo
 */

/**
 * @namespace Contains all properties and methods of interface.
 */
var yygo = {};

(function () {
    'use strict';

    // Utilities functions.

    /** jsonRequest {{{
     * Simple ajax request expecting json in answer.
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
     * @property {String[]} langs       Actually supported languages.
     * @property {Object}   game        All the game data.
     * @property {Object}   gameslist   Loadable games.
     * @property {String}   lang        Language set by the user.
     * @property {Number}   branchs     Total number of branchs (variations).
     * @property {Number}   size        Size of the goban (9, 13, 19).
     * @property {Number}   curbranch   Current branch (variation) navigated.
     * @property {Number}   curnode     Current node (move).
     * @property {Number}   lastbranch  Last branch to reach.
     * @property {Number}   lastnode    Last node of the last branch.
     */
    yygo.data = {

        // Properties.

        langs:          ['en', 'fr'],

        game:           {},
        gameslist:      {},

        lang:           'en',

        branchs:        0,
        size:           0,

        curbranch:      0,
        curnode:        0,
        lastbranch:     0,
        lastnode:       0,

        // Methods.

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

            jsonRequest('model.php?game=' + id, function (data) {
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
        },
        /*}}}*/

        /** yygo.data.setLang {{{
         * Define the current language to use.
         *
         * @param {String}      lang        Language to use.
         * @param {Function}    callback    Callback function.
         */
        setLang: function (lang, callback) {
            var langs = this.langs,
                i;

            for (i in langs) {
                if (langs[i] === lang) {
                    this.lang = lang;
                }
            }

            // Get language json file and translate elements.
            jsonRequest('lang/' + this.lang + '.json', function (data) {
                yygo.data.locale = data;
                yygo.view.changeLang();
                if (callback !== undefined) {
                    callback();
                }
            });
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
     * @property {Number}   sizecell        Size of a goban cell in pixels.
     * @property {Number}   sizegoban       Size of goban in pixels.
     */
    yygo.view = {

        // Properties.

        orientation:    '',

        comtoshow:      false,
        redraw:         false,
        showborders:    false,
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
            var game =          yygo.data.game,
                curnode =       yygo.data.curnode,
                curbranch =     yygo.data.curbranch,
                commentselem =  document.getElementById('comments'),
                html =          '';

            if (game[curnode][curbranch].C !== undefined) {
                html = '<p>';
                html += game[curnode][curbranch].C;
                html += '</p>';

                commentselem.innerHTML = html; // Insert html.

                if (this.comtoshow === false) {
                    this.comtoshow = true;
                    if (this.showcomments) {
                        // Resize if we are showing comments.
                        this.setGobanSize();
                    }
                }
            } else {
                if (this.comtoshow === true) {
                    this.comtoshow = false;
                    if (this.showcomments) {
                        // Resize if we are showing comments.
                        this.setGobanSize();
                    }
                }
            }
            this.toggleComments(); // Show/hide comments if needed.
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
                            html += '<div id="varbua' + i + '"></div>';
                        } else {
                            // Show a clickable empty radio button.
                            html += '<div id="varbut' + i + '"></div>';
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
                options =       document.getElementById('options');

            // Hide all buttons.
            navbuttons.style.display = 'none';
            optbuttons.style.display = 'none';
            gobbuttons.style.display = 'none';
            listbuttons.style.display = 'none';
            game.style.display = 'none';
            options.style.display = 'none';

            // Show the buttons we need for the actual screen.
            if (screen === 'goban') {
                gobbuttons.style.display = 'block';
                options.style.display = 'block';
                if (mode === 'replay') {
                    navbuttons.style.display = 'block';
                }
                // TODO Other modes.
            } else if (screen === 'options') {
                optbuttons.style.display = 'block';
                game.style.display = 'block';
                // Consider user login status.
                if (yygo.events.nickname === '') {
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

        /** yygo.view.changeLang {{{
         * Change elements showing informations based on language.
         */
        changeLang: function () {
            var locale =        yygo.data.locale,
                lang =          yygo.data.lang,
                buttonlang =    document.getElementsByClassName('buttonlang'),
                cl =            buttonlang.length,
                l;

            // Buttons labels.
            document.getElementById('comment').title =  locale.comment;
            document.getElementById('border').title =   locale.border;
            document.getElementById('load').title =     locale.load;
            document.getElementById('lang').title =     locale.language;
            document.getElementById('start').title =    locale.start;
            document.getElementById('prev').title =     locale.prev;
            document.getElementById('fastprev').title = locale.fastprev;
            document.getElementById('next').title =     locale.next;
            document.getElementById('fastnext').title = locale.fastnext;
            document.getElementById('end').title =      locale.end;
            document.getElementById('game').title =     locale.game;
            document.getElementById('options').title =  locale.options;
            document.getElementById('sendsgf').title =  locale.sendsgf;
            document.getElementById('downsgf').title =  locale.downsgf;
            document.getElementById('user').title =     locale.user;
            document.getElementById('refresh').title =  locale.refresh;

            // Forms labels.
            document.getElementById('logname').textContent = locale.nickname;
            document.getElementById('regname').textContent = locale.nickname;
            document.getElementById('logpass').textContent = locale.password;
            document.getElementById('regpass').textContent = locale.password;
            document.getElementById('regmail').textContent = locale.email;
            document.getElementById('reglink').textContent = locale.register;
            // Forms submit buttons.
            document.getElementById('register').value = locale.register;
            document.getElementById('sendfile').value = locale.sendfile;
            document.getElementById('login').value = locale.login;
            document.getElementById('logout').value = locale.logout;

            if (!isEmpty(yygo.data.game)) {
                this.makeInfos(); // Remake infos as it depends on locale.
            }

            // Change button shape to reflect the actual language.
            document.getElementById('lang').className = 'button' + lang;

            // Hide current language button in the languages list.
            for (l = 0; l < cl; l++) {
                buttonlang[l].style.display = 'block';
            }
            document.getElementById('lang' + lang).style.display = 'none';
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
                serverforms =       document.getElementById('serverforms'),
                serverresponse =    document.getElementById('serverresponse'),
                sendsgfform =       document.getElementById('sendsgfform'),
                loginform =         document.getElementById('loginform'),
                registerform =      document.getElementById('registerform'),
                paramform =         document.getElementById('paramform'),
                loadlist =          document.getElementById('loadlist');

            // Hide all elements.
            buttonsbar.style.display = 'none';
            variations.style.display = 'none';
            goban.style.display = 'none';
            comments.style.display = 'none';
            infos.style.display = 'none';
            serverforms.style.display = 'none';
            sendsgfform.style.display = 'none';
            loginform.style.display = 'none';
            registerform.style.display = 'none';
            paramform.style.display = 'none';
            loadlist.style.display = 'none';

            serverresponse.textContent = ''; // Empty the server response.

            this.changeButtons(); // Change the buttons to display.

            // Show the elements we need for the actual screen.
            if (screen === 'goban') {
                buttonsbar.style.display = 'block';
                variations.style.display = 'block';
                goban.style.display = 'block';
                this.toggleComments();
            } else if (screen === 'options') {
                buttonsbar.style.display = 'block';
                infos.style.display = 'block';
            } else if (screen === 'list') {
                buttonsbar.style.display = 'block';
                loadlist.style.display = 'block';
            } else if (screen === 'sendsgf') {
                buttonsbar.style.display = 'block';
                serverforms.style.display = 'block';
                sendsgfform.style.display = 'block';
            } else if (screen === 'login') {
                buttonsbar.style.display = 'block';
                serverforms.style.display = 'block';
                loginform.style.display = 'block';
            } else if (screen === 'register') {
                buttonsbar.style.display = 'block';
                serverforms.style.display = 'block';
                registerform.style.display = 'block';
            } else if (screen === 'param') {
                buttonsbar.style.display = 'block';
                serverforms.style.display = 'block';
                paramform.style.display = 'block';
            }
        },
        /*}}}*/

        /** yygo.view.drawGoban {{{
         * Draw the goban and the comments.
         */
        drawGoban: function () {
            var commentselem =  document.getElementById('comments'),
                gobanelem =     document.getElementById('goban'),
                gridelem =      document.getElementById('grid'),
                cellelems =     document.getElementsByClassName('cell'),
                cc =            cellelems.length,
                fontsize =      this.sizecell / 1.5,
                comtop =        70,
                c;

            if (this.redraw) { // Redraw only when needed.
                this.redraw = false;
                // Resize goban.
                gobanelem.style.height = this.sizegoban + 'px';
                gobanelem.style.width = this.sizegoban + 'px';
                // Center grid into goban.
                gridelem.style.top = this.sizecell + 'px';
                gridelem.style.right = this.sizecell + 'px';
                gridelem.style.bottom = this.sizecell + 'px';
                gridelem.style.left = this.sizecell + 'px';
                // Resize the cells.
                for (c = 0; c < cc; c++) {
                    cellelems[c].style.height = this.sizecell + 'px';
                    cellelems[c].style.width = this.sizecell + 'px';
                    cellelems[c].style.lineHeight = this.sizecell + 'px';
                    cellelems[c].style.fontSize = fontsize + 'px';
                }
            }
            // Place comments depending on orientation.
            if (this.orientation === 'horizontal') {
                // Move goban on left side and place comments on the right.
                if (this.showcomments && this.comtoshow) {
                    gobanelem.style.margin = 0;
                } else {
                    gobanelem.style.margin = 'auto';
                }
                commentselem.style.top = comtop + 'px';
                commentselem.style.right = 0;
                commentselem.style.left = this.sizegoban + 'px';
            } else {
                // Keep goban centered and comments at bottom.
                gobanelem.style.margin = 'auto';
                commentselem.style.top =  this.sizegoban + comtop + 'px';
                commentselem.style.right = 0;
                commentselem.style.left = 0;
            }
        },
        /*}}}*/

        /** yygo.view.emptyGoban {{{
         * Empty the goban of all stones, symbols, labels.
         */
        emptyGoban: function () {
            var size =  yygo.data.size,
                coord = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                        'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
                cell,
                id,
                i,
                j;

            for (i = 0; i < size; i++) {
                for (j = 0; j < size; j++) {
                    id = coord[j] + coord[i];
                    cell = document.getElementById(id);
                    cell.className = 'cell';
                    cell.title = '';
                    cell.innerHTML = '';
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
            var cell =  document.getElementById(id),
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
                svg += ' stroke="#fff"/></svg>';
            } else {
                svg += ' stroke="#000"/></svg>';
            }

            cell.innerHTML = svg;
        },
        /*}}}*/

        /** yygo.view.placeStones {{{
         * Place the stones of the actual state on the goban.
         */
        placeStones: function () {
            var game =          yygo.data.game,
                curnode =       yygo.data.curnode,
                curbranch =     yygo.data.curbranch,
                stones =        game[curnode][curbranch].stones,
                bstones =       stones.b.split(','),
                wstones =       stones.w.split(','),
                cb =            bstones.length,
                cw =            wstones.length,
                cell,
                b,
                w;

            for (b = 0; b < cb; b++) {
                if (bstones[b] !== '') {
                    cell = document.getElementById(bstones[b]);
                    cell.className += ' cellb';
                }
            }
            for (w = 0; w < cw; w++) {
                if (wstones[w] !== '') {
                    cell = document.getElementById(wstones[w]);
                    cell.className += ' cellw';
                }
            }
        },
        /*}}}*/

        /** yygo.view.placeSymbols {{{
         * Place the symbols of the actual state on the goban.
         */
        placeSymbols: function () {
            var curbranch =     yygo.data.curbranch,
                curnode =       yygo.data.curnode,
                game =          yygo.data.game,
                circles =       [],
                squares =       [],
                triangles =     [],
                labels =        [],
                label =         [],
                playedstone =   [],
                color,
                cell,
                c,
                cc,
                s,
                cs,
                t,
                ct,
                l,
                cl;

            // Circles.
            if (game[curnode][curbranch].CR !== undefined) {
                circles = game[curnode][curbranch].CR.split(',');
                cc = circles.length;
                for (c = 0; c < cc; c++) {
                    cell = document.getElementById(circles[c]);
                    color = cell.className.substr(9);
                    this.insertSymbolSvg('CR', circles[c], color);
                }
            }
            // Squares.
            if (game[curnode][curbranch].SQ !== undefined) {
                squares = game[curnode][curbranch].SQ.split(',');
                cs = squares.length;
                for (s = 0; s < cs; s++) {
                    cell = document.getElementById(squares[s]);
                    color = cell.className.substr(9);
                    this.insertSymbolSvg('SQ', squares[s], color);
                }
            }
            // Triangles.
            if (game[curnode][curbranch].TR !== undefined) {
                triangles = game[curnode][curbranch].TR.split(',');
                ct = triangles.length;
                for (t = 0; t < ct; t++) {
                    cell = document.getElementById(triangles[t]);
                    color = cell.className.substr(9);
                    this.insertSymbolSvg('TR', triangles[t], color);
                }
            }
            // Labels.
            if (game[curnode][curbranch].LB !== undefined) {
                labels = game[curnode][curbranch].LB.split(',');
                cl = labels.length;
                for (l = 0; l < cl; l++) {
                    label = labels[l].split(':');
                    cell = document.getElementById(label[0]);
                    color = cell.className.substr(9);
                    if (color === '') {
                        // Empty cell background for better visibility.
                        cell.className += ' celle';
                    }
                    cell.title = label[1];
                    cell.textContent = label[1];
                }
            }

            // Circle to indicate the last played stone.
            if (game[curnode][curbranch].W !== undefined) {
                playedstone = game[curnode][curbranch].W;
                if (playedstone !== '') { // If player did no pass.
                    this.insertSymbolSvg('CR', playedstone, 'w');
                }
            } else if (game[curnode][curbranch].B !== undefined) {
                playedstone = game[curnode][curbranch].B;
                if (playedstone !== '') { // If player did no pass.
                    this.insertSymbolSvg('CR', playedstone, 'b');
                }
            }
        },
        /*}}}*/

        /** yygo.view.setGobanSize {{{
         * Define the size of the goban and elements depending on it. Redraw
         * if necessary or asked.
         */
        setGobanSize: function () {
            var size =          yygo.data.size,
                winw =          window.innerWidth,
                winh =          window.innerHeight,
                heightleft =    winh - 70,
                oldsizegoban =  this.sizegoban,
                smaller;

            if (winw < heightleft) {
                this.orientation = 'vertical';
                if (this.showcomments && this.comtoshow &&
                        heightleft - 150 <= winw) {
                    smaller = heightleft - 150;
                } else {
                    smaller = winw;
                }
            } else {
                this.orientation = 'horizontal';
                if (this.showcomments && this.comtoshow &&
                        winw - 200 <= heightleft) {
                    smaller = winw - 200;
                } else {
                    smaller = heightleft;
                }
            }

            // Calculate the size of the goban in pixels to be a multiple of
            // his size in intersections. This avoid bad display with svg and
            // minimize redraws.
            this.sizecell = Math.floor(smaller / (size + 2));
            this.sizegoban = this.sizecell * (size + 2);

            // Redraw if size changed or if asked.
            if (this.sizegoban !== oldsizegoban || this.redraw) {
                this.redraw = true;
            }
            this.drawGoban();
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
            var curnode =   yygo.data.curnode,
                lastnode =  yygo.data.lastnode,
                start =     document.getElementById('start'),
                prev =      document.getElementById('prev'),
                fastprev =  document.getElementById('fastprev'),
                next =      document.getElementById('next'),
                fastnext =  document.getElementById('fastnext'),
                end =       document.getElementById('end');

            // Activate all buttons.
            start.className = 'button';
            prev.className = 'button';
            fastprev.className = 'button';
            next.className = 'button';
            fastnext.className = 'button';
            end.className = 'button';

            // We are at the start, make rewind buttons inactive.
            if (curnode === 0) {
                start.className = 'buttond';
                prev.className = 'buttond';
                fastprev.className = 'buttond';
            }
            // We are at the end, make forward buttons inactive.
            if (curnode === lastnode) {
                next.className = 'buttond';
                fastnext.className = 'buttond';
                end.className = 'buttond';
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
                comment.className = 'button';
            } else {
                comment.className = 'buttond';
            }
        }
        /*}}}*/

    };
    /*}}}*/

    /** yygo.events {{{
     * Events part of the yygo namespace.
     *
     * @property {String}   mode        Goban mode: replay, play, modify...
     * @property {String}   nickname    Nickname of user.
     * @property {String}   screen      Actual screen to show.
     */
    yygo.events = {

        // Properties.

        mode:           'replay',
        nickname:       '',
        screen:         'goban',

        // Methods.

        /** yygo.events.init {{{
         * This is where we start.
         */
        init: function () {
            var navlang =   (navigator.language ||
                            navigator.systemLanguage ||
                            navigator.userLanguage ||
                            'en').substr(0, 2).toLowerCase();

            // Get user session if it still exist.
            jsonRequest('nickname', function (data) {
                if (data !== '') {
                    yygo.events.nickname = data;
                }
                // Define language.
                yygo.data.setLang(navlang, function () {
                    // Callback to be sure we have the locale data.
                    yygo.events.makeBinds();
                    yygo.events.loadIntro();
                });
            });
        },
        /*}}}*/

        /** yygo.events.loadGameFromList {{{
         * Load a game selected in games list.
         *
         * @param {Number} index Index of the selected game.
         */
        loadGameFromList: function (index) {
            var oldsize = yygo.data.size;

            yygo.data.parseDataFromList(index, function () {
                // Make view when data is acquired.

                if (yygo.data.size !== oldsize) { // New size remake all.
                    yygo.view.makeGoban();
                    yygo.view.changeGridImage();
                } else { // Empty goban only.
                    yygo.view.emptyGoban();
                }

                yygo.view.makeVariations();
                yygo.view.makeInfos();
                yygo.view.makeComments();

                yygo.view.placeStones();
                yygo.view.placeSymbols();

                yygo.events.mode = 'replay';
                yygo.events.screen = 'goban';

                yygo.view.changeScreen();

                yygo.view.toggleBorders();
                yygo.view.toggleNavButtons();

                yygo.view.redraw = true;
                yygo.view.setGobanSize();
            });
        },
        /*}}}*/

        /** yygo.events.loadIntro {{{
         * Load introductive goban data and show it.
         */
        loadIntro: function () {

            yygo.data.game = {0: {0: {
                "stones": {
                    "b": "fm,fn,fo,fp,gl,gm,gn,go,gp,gq,hk,hl,hm,hn,ho,hp," +
                        "hq,hr,ie,if,ik,il,im,in,ip,iq,ir,je,jf,jk,jl,jm," +
                        "jp,jq,jr,js,ka,kj,kk,kl,km,kp,kq,kr,ks,la,lj,lk," +
                        "ll,lm,ln,lo,lp,lq,lr,ls,ma,mb,mi,mj,mk,ml,mm,mn," +
                        "mo,mp,mq,mr,ms,nb,nc,nh,ni,nj,nk,nl,nm,nn,no,np," +
                        "nq,nr,ob,oc,od,oe,of,og,oh,oi,oj,ok,ol,om,on,oo," +
                        "op,oq,or,pc,pd,pe,pf,pg,ph,pi,pj,pk,pl,pm,pn,po," +
                        "pp,pq,qd,qe,qf,qg,qh,qi,qj,qk,ql,qm,qn,qo,qp,re," +
                        "rf,rg,rh,ri,rj,rk,rl,rm,rn,ro,sg,sh,si,sj,sk,sl,sm",
                    "w": "ag,ah,ai,aj,ak,al,am,be,bf,bg,bh,bi,bj,bk,bl,bm," +
                        "bn,bo,cd,ce,cf,cg,ch,ci,cj,ck,cl,cm,cn,co,cp,dc," +
                        "dd,de,df,dg,dh,di,dj,dk,dl,dm,dn,do,dp,dq,eb,ec," +
                        "ed,ee,ef,eg,eh,ei,ej,ek,el,em,en,eo,ep,eq,er,fb," +
                        "fc,fd,fe,ff,fg,fh,fi,fj,fk,fl,fq,fr,ga,gb,gc,gd," +
                        "ge,gf,gg,gh,gi,gj,gk,gr,gs,ha,hb,hc,hd,he,hf,hg," +
                        "hh,hi,hj,hs,ia,ib,ic,id,ig,ih,ii,ij,is,ja,jb,jc," +
                        "jd,jg,jh,ji,jn,jo,kb,kc,kd,kf,kg,kh,ki,kn,ko,lb," +
                        "lc,ld,le,lf,lg,lh,li,mc,md,me,mf,mg,mh,nd,ne,nf,ng"
                },
                "LB": "ch:Y,dh:I,eh:N,gh:Y,hh:A,ih:N,jh:G,nl:G,ol:O"
            } } };

            yygo.data.size = 19;

            yygo.view.makeGoban();
            yygo.view.changeGridImage();

            yygo.view.placeStones();
            yygo.view.placeSymbols();

            this.mode = 'replay';
            this.screen = 'goban';

            yygo.view.changeScreen();

            yygo.view.toggleBorders();
            yygo.view.toggleNavButtons();

            yygo.view.redraw = true;
            yygo.view.setGobanSize();
        },
        /*}}}*/

        /** yygo.events.makeBinds {{{
         * Bind events to the elements.
         */
        makeBinds: function () {
            var comment =       document.getElementById('comment'),
                border =        document.getElementById('border'),
                game =          document.getElementById('game'),
                options =       document.getElementById('options'),
                load =          document.getElementById('load'),
                refresh =       document.getElementById('refresh'),
                langen =        document.getElementById('langen'),
                langfr =        document.getElementById('langfr'),
                user =          document.getElementById('user'),
                sendsgf =       document.getElementById('sendsgf'),
                responseframe = document.getElementById('responseframe'),
                reglink =       document.getElementById('reglink'),
                start =         document.getElementById('start'),
                fastprev =      document.getElementById('fastprev'),
                prev =          document.getElementById('prev'),
                next =          document.getElementById('next'),
                fastnext =      document.getElementById('fastnext'),
                end =           document.getElementById('end');

            // Window resize.
            window.addEventListener('resize', function () {
                yygo.view.setGobanSize();
            }, false);

            // Clicks.
            comment.addEventListener('click', function () {
                yygo.events.clickComments();
            }, false);
            border.addEventListener('click', function () {
                yygo.events.clickBorders();
            }, false);
            game.addEventListener('click', function () {
                yygo.events.clickGame();
            }, false);
            options.addEventListener('click', function () {
                yygo.events.clickOptions();
            }, false);
            load.addEventListener('click', function () {
                yygo.events.clickLoadList();
            }, false);
            refresh.addEventListener('click', function () {
                yygo.data.gameslist = [];
                yygo.events.clickLoadList();
            }, false);
            langen.addEventListener('click', function () {
                yygo.data.setLang('en');
            }, false);
            langfr.addEventListener('click', function () {
                yygo.data.setLang('fr');
            }, false);
            user.addEventListener('click', function () {
                yygo.events.clickUser();
            }, false);
            reglink.addEventListener('click', function () {
                yygo.events.clickRegister();
            }, false);
            sendsgf.addEventListener('click', function () {
                yygo.events.clickSendSgf();
            }, false);
            start.addEventListener('click', function () {
                if (yygo.data.curnode > 0) {
                    yygo.events.navigateNode(-999999);
                }
            }, false);
            fastprev.addEventListener('click', function () {
                if (yygo.data.curnode > 0) {
                    yygo.events.navigateNode(-10);
                }
            }, false);
            prev.addEventListener('click', function () {
                if (yygo.data.curnode > 0) {
                    yygo.events.navigateNode(-1);
                }
            }, false);
            next.addEventListener('click', function () {
                if (yygo.data.curnode < yygo.data.lastnode) {
                    yygo.events.navigateNode(1);
                }
            }, false);
            fastnext.addEventListener('click', function () {
                if (yygo.data.curnode < yygo.data.lastnode) {
                    yygo.events.navigateNode(10);
                }
            }, false);
            end.addEventListener('click', function () {
                if (yygo.data.curnode < yygo.data.lastnode) {
                    yygo.events.navigateNode(999999);
                }
            }, false);

            // Load response after sending sgf file, login or registering.
            responseframe.addEventListener('load', function () {
                yygo.events.serverResponse();
            }, false);

            // Show a message when submiting data to server.
            window.addEventListener('submit', function () {
                yygo.events.submitData();
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
                    var branch = parseInt(id.substr(6), 10);

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
                varbut = document.getElementById('varbut' + binds[i]);
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

        /** yygo.events.submitData {{{
         * Show message while sending data to server and waiting for answer.
         */
        submitData: function () {
            var locale =            yygo.data.locale,
                serverresponse =    document.getElementById('serverresponse');

            serverresponse.textContent = locale.loading;
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
                yygo.view.toggleComments();
                yygo.view.setGobanSize();
            } else if (yygo.view.comtoshow) {
                yygo.view.showcomments = true;
                yygo.view.toggleComments();
                yygo.view.setGobanSize();
            }
        },
        /*}}}*/

        /** yygo.events.clickGame {{{
         * Show the current game.
         */
        clickGame: function () {
            this.screen = 'goban';
            yygo.view.changeScreen();
        },
        /*}}}*/

        /** yygo.events.clickLoadList {{{
         * Load and show the games list.
         */
        clickLoadList: function () {
            var gameslist = yygo.data.gameslist || {};

            if (isEmpty(gameslist)) {
                jsonRequest('model.php?list', function (data) {
                    yygo.data.gameslist = data;
                    yygo.view.makeGamesList();
                    yygo.events.makeListBinds();
                });
            }

            this.screen = 'list';
            yygo.view.changeScreen();
        },
        /*}}}*/

        /** yygo.events.clickOptions {{{
         * Show the options.
         */
        clickOptions: function () {
            this.screen = 'options';
            yygo.view.changeScreen();
        },
        /*}}}*/

        /** yygo.events.clickRegister {{{
         * Registration of the user.
         */
        clickRegister: function () {
            this.screen = 'register';
            yygo.view.changeScreen();
        },
        /*}}}*/

        /** yygo.events.clickSendSgf {{{
         * Show the form to send sgf files.
         */
        clickSendSgf: function () {
            this.screen = 'sendsgf';
            yygo.view.changeScreen();
        },
        /*}}}*/

        /** yygo.events.clickUser {{{
         * Login/logout and parameters of the user.
         */
        clickUser: function () {
            jsonRequest('model.php?nickname', function (data) {
                if (data !== '') {
                    yygo.events.nickname = data;
                    yygo.events.screen = 'param';
                    yygo.view.changeScreen();
                } else {
                    yygo.events.screen = 'login';
                    yygo.view.changeScreen();
                }
            });
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

            response = frames.responseframe
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
                this.nickname = document.getElementById('nickname').value;
                this.screen = 'options';
                yygo.view.changeScreen();
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
