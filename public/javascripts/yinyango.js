/**
 * User interface of yinyango.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

var yygo = {}; // Namespace that contains all properties and methods.

(function () {
    'use strict';

    // Utilities functions.
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
    /** secToTime {{{
     * Convert a time in seconds to "minutes:seconds".
     *
     * @param {Number} time Time in seconds.
     *
     * @return {String} "minutes:seconds"
     */
    function secToTime(secs) {
        var hour,
            min,
            sec;

        hour = Math.floor(secs / 3600);
        min = Math.floor((secs % 3600) / 60);
        sec = Math.ceil((secs % 3600) % 60);
        if (sec < 10) {
            sec = '0' + sec;
        }
        if (hour > 0) {
            return hour + ':' + min + ':' + sec;
        }
        return min + ':' + sec;
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
        stones:         {},
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
                size =          this.size,
                turn =          this.playerturn,
                rule =          this.game[0][0].RU[0],
                stones,
                prevscore,
                parentbranch,
                play;

            if (this.stones[node][branch] === undefined) {
                parentbranch = this.getParentBranch(node, branch);
                stones = this.stones[node][parentbranch];
                prevscore = this.game[node][parentbranch].score;
            } else {
                stones = this.stones[node][branch];
                prevscore = this.game[node][branch].score;
            }
            if (this.game[node + 1] === undefined) {
                this.game[node + 1] = {};
            }
            this.game[node + 1][branch] = {};
            this.game[node + 1][branch][turn] = [];
            this.game[node + 1][branch][turn].push(coord);
            this.game[node + 1][branch].score = {
                B: prevscore.B,
                W: prevscore.W
            };

            play = gotools.playMove(turn, coord, size, stones, rule);
            // Add stones state.
            if (this.stones[node + 1] === undefined) {
                this.stones[node + 1] = {};
            }
            this.stones[node + 1][branch] = play.stones;
            // Add prisonners to player score.
            this.game[node + 1][branch].score[turn] =
                prevscore[turn] + play.prisonners;
            // Move to next node.
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
                size =          this.size,
                rule =          this.game[0][0].RU[0],
                parentbranch,
                prevstones,
                prevscore,
                key,
                node,
                branch;

            function keyAction(node, branch, key, value, stones, prevscore) {
                var play;

                switch (key) {
                case 'B':
                    if (value[0] !== '') { // Did not pass.
                        play =
                            gotools.playMove('B', value[0], size, stones, rule);
                        stones = play.stones;
                        yygo.data.game[node][branch].score.B = prevscore.B +
                            play.prisonners;
                    }
                    break;
                case 'W':
                    if (value[0] !== '') { // Did not pass.
                        play =
                            gotools.playMove('W', value[0], size, stones, rule);
                        stones = play.stones;
                        yygo.data.game[node][branch].score.W = prevscore.W +
                            play.prisonners;
                    }
                    break;
                case 'AB':
                    stones = gotools.addStones('B', value, size, stones, rule);
                    break;
                case 'AW':
                    stones = gotools.addStones('W', value, size, stones, rule);
                    break;
                case 'AE':
                    stones = gotools.addStones('', value, size, stones, rule);
                    break;
                }
                return stones;
            }

            for (node in data) {
                if (data.hasOwnProperty(node)) {
                    stones[node] = {};
                    for (branch in data[node]) {
                        if (data[node].hasOwnProperty(branch)) {
                            stones[node][branch] = {B: [], W: [], BF: [],
                                    WF: [], K: []};
                            this.game[node][branch].score = {B: 0, W: 0};
                            // Load previous stones.
                            parentbranch =
                                yygo.data.getParentBranch(node - 1, branch);
                            if (node > 0) {
                                prevstones = stones[node - 1][parentbranch];
                                prevscore =
                                    this.game[node - 1][parentbranch].score; 
                            } else {
                                prevstones = stones[node][branch];
                                prevscore = this.game[node][branch].score; 
                            }
                            this.game[node][branch].score = {
                                B: prevscore.B,
                                W: prevscore.W
                            };
                            // Treat keys.
                            for (key in data[node][branch]) {
                                if (data[node][branch].hasOwnProperty(key)) {
                                    prevstones = keyAction(node, branch, key,
                                            data[node][branch][key],
                                            prevstones, prevscore);
                                }
                            }
                            // Save stones.
                            stones[node][branch] = prevstones;
                        }
                    }
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
            var table = document.getElementById('db-gameslist'),
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
     * @property {Number}   sizecell        Size of a goban cell in pixels.
     * @property {Number}   sizegoban       Size of goban in pixels.
     */
    yygo.view = {
        // Properties.
        orientation:    '',
        screen:         '',
        screenh:        0,
        gamesscreen:    '',
        sizecell:       0,
        sizegoban:      0,

        // Methods.
        // Construction/insertion of html code.
        /** yygo.view.makeComments {{{
         * Create and insert comments html code.
         */
        makeComments: function () {
            var node =      yygo.data.curnode,
                branch =    yygo.data.curbranch,
                comments =  document.getElementById('comments'),
                html =      '',
                nameregex = /^(.+?):/gm,
                comment,
                clen,
                chr,
                i;

            if (yygo.data.game[node][branch].C !== undefined) {
                comment = yygo.data.game[node][branch].C[0];
            }
            if (comment !== undefined) {
                comment = comment.replace(nameregex, '<strong>$1</strong>:');
                clen = comment.length;
                for (i = 0; i < clen; i++) {
                    chr = comment.charAt(i);
                    if (chr === '\n') { // Translate new line.
                        html += '<br/>';
                    } else {
                        html += chr;
                    }
                }
            }
            
            comments.innerHTML = html; // Insert html.
        },
        /*}}}*/
        /** yygo.view.makeGameInfos {{{
         * Create and insert informations html code.
         */
        makeGameInfos: function () {
            var infos =         yygo.data.game[0][0],
                gameinfosbox =  document.getElementById('gameinfosbox'),
                gameblack =     document.getElementById('gameblack'),
                gamewhite =     document.getElementById('gamewhite'),
                gameresult =    document.getElementById('gameresult'),
                gamedate =      document.getElementById('gamedate'),
                gameplace =     document.getElementById('gameplace'),
                gameevent =     document.getElementById('gameevent'),
                gamename =      document.getElementById('gamename'),
                gamerules =     document.getElementById('gamerules'),
                gamekomi =      document.getElementById('gamekomi'),
                gametime =      document.getElementById('gametime'),
                gameovertime =  document.getElementById('gameovertime'),
                gameannotator = document.getElementById('gameannotator'),
                gamescribe =    document.getElementById('gamescribe'),
                gamesource =    document.getElementById('gamesource'),
                gamecopyright = document.getElementById('gamecopyright'),
                gamecomment =   document.getElementById('gamecomment');

            function insertInfo(info, element) {
                var infos = yygo.data.game[0][0];

                if (infos[info] !== undefined) {
                    element.textContent = infos[info];
                } else {
                    element.textContent = '';
                }
            }

            if (infos.PB !== undefined) {
                gameblack.textContent = infos.PB;
                if (infos.BR !== undefined) {
                    gameblack.textContent += ' [' + infos.BR + ']';
                }
                if (infos.BT !== undefined) {
                    gameblack.textContent += ' (' + infos.BT + ')';
                }
            } else {
                gameblack.textContent = '';
            }
            if (infos.PW !== undefined) {
                gamewhite.textContent = infos.PW;
                if (infos.WR !== undefined) {
                    gamewhite.textContent += ' [' + infos.WR + ']';
                }
                if (infos.WT !== undefined) {
                    gamewhite.textContent += ' (' + infos.WT + ')';
                }
            } else {
                gamewhite.textContent = '';
            }
            if (infos.TM !== undefined) {
                gametime.textContent = secToTime(infos.TM);
            } else {
                gametime.textContent = '';
            }

            insertInfo('RE', gameresult);
            insertInfo('DT', gamedate);
            insertInfo('PC', gameplace);
            insertInfo('EV', gameevent);
            insertInfo('GN', gamename);
            insertInfo('RU', gamerules);
            insertInfo('KM', gamekomi);
            insertInfo('OT', gameovertime);
            insertInfo('AN', gameannotator);
            insertInfo('US', gamescribe);
            insertInfo('SO', gamesource);
            insertInfo('CP', gamecopyright);
            insertInfo('GC', gamecomment);
        },
        /*}}}*/
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
                a =         '<a href="#" class="cell-link"></a>',
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
        /** yygo.view.makeVariations {{{
         * Create and insert variations html code.
         */
        makeVariations: function () {
            var game =          yygo.data.game,
                curbranch =     yygo.data.curbranch,
                curnode =       yygo.data.curnode,
                branchs =       game[0][0].branchs,
                variations =    document.getElementById('variations'),
                varselect =     document.getElementById('varselect'),
                varvalue =      document.getElementById('varvalue'),
                variationsnum = 0,
                html =          '',
                currentvar,
                select,
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
                        variationsnum++;
                        if (i === curbranch) { // This is our branch.
                            currentvar = variationsnum;
                            html += '<option value="' + i +
                                '" selected="selected">' +
                                currentvar + '</option>';
                        } else { // Add variation to select list.
                            html += '<option value="' + i + '">' +
                                variationsnum + '</option>';
                        }
                    }
                }
            }

            if (variationsnum <= 1) { // No variations to show.
                variations.style.display = 'none';
            } else {
                varvalue.textContent = currentvar;
                varselect.innerHTML = html;
                variations.style.display = 'block';
                yygo.events.makeVariationsBind(varselect);
            }
        },
        /*}}}*/
        /** yygo.view.updatePlayersInfos {{{
         * Update players time and score.
         */
        updatePlayersInfos: function () {
            var node =          yygo.data.curnode,
                branch =        yygo.data.curbranch,
                game =          yygo.data.game[node][branch],
                blackscore =    document.getElementById('blackscore'),
                blacktime =     document.getElementById('blacktime'),
                whitescore =    document.getElementById('whitescore'),
                whitetime =     document.getElementById('whitetime');

            // Update scores.
            blackscore.textContent = game.score.B;
            whitescore.textContent = game.score.W;

            // Update time.
            if (game.BL !== undefined) {
                blacktime.textContent = secToTime(game.BL);
            }
            if (game.WL !== undefined) {
                whitetime.textContent = secToTime(game.WL);
            }
        },
        /*}}}*/
        /** yygo.view.setPlayersInfos {{{
         * Insert players names, starting scores and times.
         */
        setPlayersInfos: function () {
            var infos =         yygo.data.game[0][0],
                blackname =     document.getElementById('blackname'),
                blackscore =    document.getElementById('blackscore'),
                blacktime =     document.getElementById('blacktime'),
                whitename =     document.getElementById('whitename'),
                whitescore =    document.getElementById('whitescore'),
                whitetime =     document.getElementById('whitetime');

            if (infos.PB !== undefined) {
                blackname.textContent = infos.PB;
                if (infos.BR !== undefined) {
                    blackname.textContent += ' [' + infos.BR + ']';
                }
            } else {
                blackname.textContent = '???';
            }
            blackscore.textContent = infos.score.B;

            if (infos.PW !== undefined) {
                whitename.textContent = infos.PW;
                if (infos.WR !== undefined) {
                    whitename.textContent += ' [' + infos.WR + ']';
                }
            } else {
                whitename.textContent = '???';
            }
            whitescore.textContent = infos.score.W;

            // Initiate players time.
            if (infos.TM !== undefined) {
                blacktime.textContent = secToTime(infos.TM);
                whitetime.textContent = secToTime(infos.TM);
            } else {
                blacktime.textContent = '--';
                whitetime.textContent = '--';
            }
        },
        /*}}}*/

        // Display.
        /** yygo.view.drawInterface {{{
         * Draw the goban and the panel.
         *
         * @param {Boolean}  redraw Do we need to redraw interface?
         * @param {Function} fn     Callback.
         */
        drawInterface: function (redraw, fn) {
            var panel =         document.getElementById('panel'),
                goban =         document.getElementById('goban'),
                cells =         document.getElementsByClassName('cell'),
                cc =            cells.length,
                fontsize =      this.sizecell / 1.5,
                c;

            if (redraw) { // Redraw only when needed.
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
                goban.style.margin = 0;
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
                links =     document.getElementsByClassName('cell-link'),
                linkslen =  links.length,
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
            // Make Cell links.
            for (i = 0; i < linkslen; i++) {
                links[i].className = 'cell-link ' + classturn + ' playable';
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
                stones =        yygo.data.stones[node][branch],
                turn =          yygo.data.playerturn;

            function placeColor(list, color) {
                var listlen = list.length,
                    stone,
                    link,
                    i;

                for (i = 0; i < listlen; i++) {
                    stone = document.getElementById(list[i]);
                    stone.classList.add(color);
                    link = stone.parentNode.
                        getElementsByClassName('cell-link')[0];
                    link.className = 'cell-link';
                }
            }

            placeColor(stones.B, 'black');
            placeColor(stones.W, 'white');
            placeColor(stones.K, 'ko');
            // Add forbidden moves.
            if (turn === 'B') {
                placeColor(stones.BF, 'BF');
            } else {
                placeColor(stones.WF, 'WF');
            }
        },
        /*}}}*/
        /** yygo.view.placeSymbols {{{
         * Place the symbols of the actual state on the goban.
         */
        placeSymbols: function () {
            var branch =        yygo.data.curbranch,
                node =          yygo.data.curnode,
                ko =            yygo.data.stones[node][branch].K,
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
            // Square to indicate eventual ko.
            if (ko[0] !== undefined) {
                insertSymbols('SQ', ko);
            }
        },
        /*}}}*/
        /** yygo.view.setCommentsTop {{{
         * Set comments top at bottom of top panel part.
         */
        setCommentsTop: function () {
            var toppanel =  document.getElementById('toppanel'),
                comments =  document.getElementById('comments');
        
            comments.style.top = toppanel.offsetHeight + 5 + 'px';
        },
        /*}}}*/
        /** yygo.view.setGamesScreenTop {{{
         * Set games screen top relatively to gamesmenu.
         */
        setGamesScreenTop: function () {
            var gamesmenu =     document.getElementById('games-menu'),
                gamesscreens =  document.getElementsByClassName('gamesscreen'),
                nscreens =      gamesscreens.length,
                screentop =     gamesmenu.offsetHeight,
                i;


            for (i = 0; i < nscreens; i++) {
                gamesscreens[i].style.top = screentop + 'px';
            }
        },
        /*}}}*/
        /** yygo.view.setGobanSize {{{
         * Define the size of the goban and elements depending on it. Redraw
         * if necessary or asked.
         *
         * @param {Boolean}  redraw Do we need to redraw interface?
         * @param {Function} fn     Callback.
         */
        setGobanSize: function (redraw, fn) {
            var size =          yygo.data.size,
                winw =          window.innerWidth,
                winh =          yygo.view.screenh,
                oldsizegoban =  this.sizegoban,
                smaller;

            if (winw < winh) {
                this.orientation = 'vertical';
                if (winh - 200 <= winw) {
                    smaller = winh - 200;
                } else {
                    smaller = winw;
                }
            } else {
                this.orientation = 'horizontal';
                if (winw - 220 <= winh) {
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

            // Redraw if size changed.
            if (this.sizegoban !== oldsizegoban) {
                redraw = true;
            }
            this.drawInterface(redraw, fn);
        },
        /*}}}*/
        /** yygo.view.setScreenTop {{{
         * Set screen top relatively to navbar.
         */
        setScreenTop: function () {
            var navbar = document.getElementById('navbar'),
                screens = document.getElementsByClassName('screen'),
                nscreens = screens.length,
                screentop = 0,
                i;

            if (yygo.events.navbar) {
                screentop = navbar.offsetHeight;
            }

            for (i = 0; i < nscreens; i++) {
                screens[i].style.top = screentop + 'px';
            }
            // Set screen height.
            yygo.view.screenh = window.innerHeight - screentop;
        },
        /*}}}*/
        /** yygo.view.showGamesScreen {{{
         * Switch to another games screen.
         *
         * @param {String} show Element reference to screen to show.
         */
        showGamesScreen: function (show) {
            show = show + '-games';
            if (this.gamesscreen !== '') {
                document.getElementById(this.gamesscreen).style.display =
                    'none';
                document.getElementById('g-' + this.gamesscreen).classList.
                    remove('twhite');
            }
            document.getElementById(show).style.display = 'block';
            document.getElementById('g-' + show).classList.add('twhite');
            this.gamesscreen = show;
        },
        /*}}}*/
        /** yygo.view.showLoadList {{{
         * Alternate the display of the page to load a game.
         *
         * @param {Boolean} refresh Force list refresh.
         */
        showLoadList: function (refresh) {
            var gameslist = document.getElementById('db-gameslist'),
                list =      yygo.data.gameslist,
                page =      0,
                html =      '',
                i;

            if (refresh === undefined) {
                refresh = false;
            }

            if (isEmpty(list) || refresh) { // Get fresh list from server.
                jsonRequest('/gameslist/' + page, 'GET', function (data) {
                    var datalen = data.length,
                        ids = [];

                    // More than one page.
                    //if (datalen === 11) {
                        //nextpage.style.display = 'inline';
                        //datalen--;
                        //data.pop();
                    //} else {
                        //nextpage.style.display = 'none';
                    //}
                    yygo.data.gameslist = data;
                    for (i = 0; i < datalen; i++) {
                        html += '<tr><td class="gameslist-entry">' + 
                            '<a class="linkbutton brown2" href="#">' +
                            data[i].name + '</a></td></tr>';
                        ids.push(data[i]._id);
                    }
                    gameslist.innerHTML = html;
                    // Bind click events to list.
                    yygo.events.makeListBinds(ids);
                });
            }
        },
        /*}}}*/
        /** yygo.view.showScreen {{{
         * Switch to another screen.
         *
         * @param {String} show Element reference to screen to show.
         */
        showScreen: function (show) {
            if (this.screen !== '') {
                document.getElementById(this.screen).style.display = 'none';
                if (this.screen !== 'loading') {
                    document.getElementById('n-' + this.screen).classList.
                        remove('twhite');
                }
            }
            document.getElementById(show).style.display = 'block';
            if (show !== 'loading') {
                document.getElementById('n-' + show).classList.add('twhite');
            }
            this.screen = show;
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
        /** yygo.view.toggleUsersList {{{
         * Toggle visibility of users list.
         */
        toggleUsersList: function () {
            var userslist = document.getElementById('userslist');
        
            if (userslist.style.display === '' ||
                    userslist.style.display === 'none') {
                userslist.style.display = 'block';
            } else {
                userslist.style.display = 'none';
            }
        },
        /*}}}*/
        /** yygo.view.usersList {{{
         * Make chat users list.
         */
        usersList: function () {
            var userslist = document.getElementById('userslist'),
                html = '',
                s = yygo.events.userslist.length,
                i;
            
            for (i = 0; i < s; i++) {
                html += yygo.events.userslist[i] + '</br>';
            }
            userslist.innerHTML = html;
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
        navbar:         true,
        username:       '',
        userslist:      [],
        socket:         null,

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
                // Set screen top.
                yygo.view.setScreenTop();
                // Connect to main hall.
                yygo.events.joinHall();
                yygo.view.showGamesScreen('online');
                yygo.view.showScreen('hall');
                // Set games screen top.
                yygo.view.setGamesScreenTop();
                document.getElementById('chatmsg').focus();
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
            yygo.data.game[0][0].score = {B: 0, W: 0};
            yygo.data.size = parseInt(yygo.data.game[0][0].SZ, 10);
            yygo.data.stones = yygo.data.calcStones(data);

            yygo.data.curnode = 0;
            yygo.data.curbranch = 0;
            yygo.data.lastbranch = 0;

            yygo.data.setLastNode();

            // Generate goban grid if necessary.
            if (yygo.data.size !== oldsize) {
                yygo.view.makeGoban();
            }

            // This will initialize cell links.
            yygo.view.emptyGoban();

            yygo.view.makeVariations();
            yygo.view.makeGameInfos();
            yygo.view.setPlayersInfos();
            yygo.view.makeComments();

            yygo.view.placeStones();
            yygo.view.placeSymbols();

            yygo.events.mode = 'replay';

            yygo.view.toggleNavButtons();

            // Activate menu buttons related to game.
            document.getElementById('n-game').style.display = 'inline-block';
            document.getElementById('n-gameinfos').style.display =
                'inline-block';
            // Set Screen top.
            yygo.view.setScreenTop();

            yygo.view.setGobanSize(true, function () {
                yygo.view.showScreen('game');
                yygo.view.setCommentsTop();
            });
        },
        /*}}}*/
        /** yygo.events.makeBinds {{{
         * Bind events to the elements.
         */
        makeBinds: function () {
            var navswitch =         document.getElementById('navswitch'),
                navbar =            document.getElementById('navbar'),
                ngame =             document.getElementById('n-game'),
                nhall =             document.getElementById('n-hall'),
                nsendsgf =          document.getElementById('n-sendsgf'),
                nsettings =         document.getElementById('n-settings'),
                ngameinfos =        document.getElementById('n-gameinfos'),
                nlogout =           document.getElementById('n-logout'),
                gonlinegames =      document.getElementById('g-online-games'),
                gdbgames =          document.getElementById('g-db-games'),
                gsgfgames =         document.getElementById('g-sgf-games'),
                refreshlist =       document.getElementById('refreshlist'),
                submitsettings =    document.getElementById('submitsettings'),
                submitsgf =         document.getElementById('submitsgf'),
                butstart =          document.getElementById('butstart'),
                butfastprev =       document.getElementById('butfastprev'),
                butprev =           document.getElementById('butprev'),
                butnext =           document.getElementById('butnext'),
                butfastnext =       document.getElementById('butfastnext'),
                butend =            document.getElementById('butend'),
                chat =              document.getElementById('chat'),
                chatmsg =           document.getElementById('chatmsg'),
                chatform =          document.getElementById('chatform'),
                showusers =         document.getElementById('showusers');

            // Window resize.{{{
            window.addEventListener('resize', function () {
                yygo.view.setScreenTop();
                if (yygo.view.screen === 'game') {
                    yygo.view.setGobanSize(false, function () {});
                }
                if (yygo.view.screen === 'hall') {
                    yygo.view.setGamesScreenTop();
                }
            }, false);
            //}}}
            // Navbar.{{{
            navswitch.addEventListener('click', function () {
                if (yygo.events.navbar) {
                    navbar.style.display = 'none';
                    yygo.events.navbar = false;
                } else {
                    navbar.style.display = 'inline-block';
                    yygo.events.navbar = true;
                }
                yygo.view.setScreenTop();
                if (yygo.view.screen === 'game') {
                    yygo.view.setGobanSize(false, function () {});
                }
            }, false);
            // Navbar Menu.{{{
            ngame.addEventListener('click', function () {
                yygo.view.showScreen('game');
            }, false);
            nhall.addEventListener('click', function () {
                // Show screen.
                yygo.view.showScreen('hall');
                // Focus chat message input.
                chatmsg.focus();
            }, false);
            nsettings.addEventListener('click', function () {
                // Hide previous answer from server.
                document.getElementById('settingssaved').
                    style.display = 'none';
                yygo.view.showScreen('settings');
            }, false);
            ngameinfos.addEventListener('click', function () {
                yygo.view.showScreen('gameinfos');
            }, false);
            nlogout.addEventListener('click', function () {
                // Fire socket disconnection.
                yygo.events.socket.disconnect();
                // End Session.
                window.location.href = '/logout';
            }, false);
            //}}}
            //}}}
            // Hall specific.{{{
            // Menus. {{{
            gonlinegames.addEventListener('click', function () {
                yygo.view.showGamesScreen('online');
            }, false);
            gdbgames.addEventListener('click', function () {
                yygo.view.showGamesScreen('db');
            }, false);
            gsgfgames.addEventListener('click', function () {
                yygo.view.showGamesScreen('sgf');
            }, false);
            // }}}
            // Open sgf.{{{
            submitsgf.addEventListener('click', function () {
                var errorinvalid =  document.getElementById('errorinvalid'),
                    file =          new FormData(this.form);

                errorinvalid.style.display = 'none';
                jsonRequest('/loadsgf/file', 'POST', file, function (data) {
                    if (data.answer === 'invalid') {
                        errorinvalid.style.display = 'block';
                    } else {
                        yygo.events.loadGame(data);
                    }
                });
            }, false);
            //}}}
            refreshlist.addEventListener('click', function () {
                yygo.view.showLoadList(true);
            }, false);
            chatform.addEventListener('submit', function () {
                if (chatmsg.value !== '') {
                    // Send message to server.
                    yygo.events.socket.emit('chat', chatmsg.value);
                    // Clear message input.
                    chatmsg.value = '';
                }
            }, false);
            showusers.addEventListener('click', function () {
                // Toggle users list visibility.
                yygo.view.toggleUsersList();
            }, false);
            //}}}
            // Settings specific.{{{
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
            // Buttons bar.{{{
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
                }, true);
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
            var table =     document.getElementById('db-gameslist'),
                rows =      table.getElementsByTagName('tr'),
                rl =        rows.length,
                r;

            function bindRow(r) {
                rows[r].addEventListener('click', function () {
                    var row = this.rowIndex;

                    // Show loading screen.
                    yygo.view.showScreen('loading');
                    // Get data of game corresponding clicked row.
                    jsonRequest('/load/' + ids[row], 'GET', function (data) {
                        yygo.events.loadGame(data);
                    });
                }, true);
            }

            for (r = 0; r < rl; r++) {
                bindRow(r);
            }
        },
        /*}}}*/
        /** yygo.events.makeVariationsBind {{{
         * Change branch according to selected variation.
         *
         * @param {Element} select Select tag element.
         */
        makeVariationsBind: function (select) {
            var varvalue = document.getElementById('varvalue');

            select.addEventListener('change', function () {
                var branch = parseInt(this.value, 10),
                    number = this.options[this.selectedIndex].innerHTML;

                varvalue.textContent = number;
                yygo.data.curbranch = branch;
                yygo.data.lastbranch = branch;
                yygo.data.setLastNode();
                yygo.view.toggleNavButtons();
                yygo.view.updatePlayersInfos();
                yygo.view.makeComments();
                yygo.view.emptyGoban();
                yygo.view.placeStones();
                yygo.view.placeSymbols();
            }, false);
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
            yygo.view.updatePlayersInfos();
            yygo.view.makeComments();
            yygo.view.setCommentsTop();

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
        /** yygo.events.joinHall {{{
         * Connect to main hall.
         */
        joinHall: function () {
            var chat =      document.getElementById('chat');

            if (yygo.events.socket === null) {
                yygo.events.socket = io.connect();
            } else if (yygo.events.socket.socket.connected !== true) {
                yygo.events.socket.socket.connect();
            }
            yygo.events.socket.emit('join', '', function (data) {
                if (!data.success) {
                    yygo.events.socket.disconnect();
                    yygo.events.connected = false;
                } else {
                    yygo.events.userslist = data.users;
                    yygo.view.usersList();
                    yygo.events.connected = true;
                }
            });

            yygo.events.socket.on('chat', function (message) {
                var myname = new RegExp('\\b(' + yygo.events.username + ')\\b', 'g');
                message = message.replace(myname, '<strong class=tred>$1</strong>');
                chat.innerHTML += message + '</br>';
                chat.scrollTop = chat.scrollHeight; // Scroll to bottom.
            });
            yygo.events.socket.on('user-joined', function (user) {
                yygo.events.userslist.push(user);
                yygo.view.usersList();
            });
            yygo.events.socket.on('user-left', function (user) {
                var id = yygo.events.userslist.indexOf(user);
                yygo.events.userslist.splice(id, 1);
                yygo.view.usersList();
            });
        }
        /*}}}*/
    };
    /*}}}*/

    // Call init when DOM is loaded.
    document.addEventListener('DOMContentLoaded', yygo.events.init(), false);

}());
