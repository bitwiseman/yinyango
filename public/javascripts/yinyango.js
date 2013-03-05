/*
 * User interface of yinyango.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
/* jshint browser: true, globalstrict: true */
/* global gotools, io */
'use strict';
/* yygo {{{
 * Namespace that contains all properties and methods.
 */
var yygo = {};
/* Properties. {{{*/
yygo.curbranch =        0;          // Current branch (variation) navigated.
yygo.curnode =          0;          // Current node (move).
yygo.game =             {};         // All the game data.
yygo.gameslist =        {};         // Loadable games.
yygo.gamesscreen =      '';         // Actual games loading screen.
yygo.gobansize =        0;          // Size of goban in pixels.
yygo.isguest =          true;       // Is user a guest ?
yygo.lastbranch =       0;          // Last branch to reach.
yygo.lastmessage =      '';         // Identifier of last message.
yygo.lastnode =         0;          // Last node of the last branch.
yygo.menu =             true;       // Show menu at top ?
yygo.mode =             'replay';   // Game mode: replay, play, edit.
yygo.orientation =      '';         // Orientation of the screen.
yygo.playerturn =       'B';        // Color to play next.
yygo.screen =           'loading';  // Actual screen to show.
yygo.screenheight =     0;          // Screen height.
yygo.size =             0;          // Size of the goban (9, 13, 19).
yygo.socket =           null;       // IO Socket object.
yygo.stones =           {};         // Stones list at each goban state.
yygo.textpanel =        'comments'; // Content to show in text panel.
yygo.username =         '';         // User name.
yygo.userslist =        [];         // List of connected users.
/*}}}*/
/* addBranch {{{
 * Player move made a new branch.
 *
 * @param {String} coord Move coord.
 */
yygo.addBranch = function (coord) {
    var node =      yygo.curnode,
        branch =    yygo.curbranch,
        game =      yygo.game,
        stones =    yygo.stones,
        lastnode =  yygo.lastnode,
        branchs =   game[0][0].branchs,
        branchid =  0,
        i,
        j;

    /* increment {{{*/
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
    /*}}}*/

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
                        yygo.getParentBranch(i, j) === branch) {
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
        yygo.game = game;
    }
    // Create the new branch.
    //yygo.game[node + 1][branchid] = {};
    // Add the move to the new branch.
    //yygo.curbranch = branchid;
    yygo.lastbranch = branchid;
    yygo.addMove(coord);
};
/*}}}*/
/* addMove {{{
 * Add player move to game data.
 *
 * @param {String} coord Coord of move.
 */
yygo.addMove = function (coord) {
    var node =          yygo.curnode,
        branch =        yygo.lastbranch,
        size =          yygo.size,
        turn =          yygo.playerturn,
        rule =          yygo.game[0][0].RU[0],
        stones,
        prevscore,
        parentbranch,
        play;

    if (yygo.stones[node][branch] === undefined) {
        parentbranch = yygo.getParentBranch(node, branch);
        stones = yygo.stones[node][parentbranch];
        prevscore = yygo.game[node][parentbranch].score;
    } else {
        stones = yygo.stones[node][branch];
        prevscore = yygo.game[node][branch].score;
    }
    if (yygo.game[node + 1] === undefined) {
        yygo.game[node + 1] = {};
    }
    yygo.game[node + 1][branch] = {};
    yygo.game[node + 1][branch][turn] = [];
    yygo.game[node + 1][branch][turn].push(coord);
    yygo.game[node + 1][branch].score = {
        B: prevscore.B,
        W: prevscore.W
    };

    play = gotools.playMove(turn, coord, size, stones, rule);
    // Add stones state.
    if (yygo.stones[node + 1] === undefined) {
        yygo.stones[node + 1] = {};
    }
    yygo.stones[node + 1][branch] = play.stones;
    // Add prisonners to player score.
    yygo.game[node + 1][branch].score[turn] =
        prevscore[turn] + play.prisonners;
    // Move to next node.
    yygo.lastnode = yygo.curnode + 1;
    yygo.navigateNode(1);
};
/*}}}*/
/* ajax {{{
 * Simple ajax request expecting json in response.
 *
 * @param {String}      url         Destination url.
 * @param {String}      method      Method to send data.
 * @param {Object}      data        FormData Object to be sent by a POST.
 * @param {Function}    callback    Callback function.
 */
yygo.ajax = function (url, method, data, callback) {
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
};
/*}}}*/
/* bindEvents {{{
 * Bind events to the elements.
 */
yygo.bindEvents = function () {
    var messageok =         document.getElementById('message-ok'),
        mgame =             document.getElementById('m-game'),
        mhall =             document.getElementById('m-hall'),
        msettings =         document.getElementById('m-settings'),
        mlogout =           document.getElementById('m-logout'),
        grunninggames =     document.getElementById('g-running-games'),
        gcreategames =      document.getElementById('g-create-games'),
        gloadgames =        document.getElementById('g-load-games'),
        refreshlist =       document.getElementById('refreshlist'),
        settingsform =      document.getElementById('settingsform'),
        loadsgf =           document.getElementById('load-sgf'),
        creategame =        document.getElementById('create-game'),
        privategame =       document.getElementById('privategame'),
        textpanelswitch =   document.getElementById('textpanel-switch'),
        butstart =          document.getElementById('butstart'),
        butfastprev =       document.getElementById('butfastprev'),
        butprev =           document.getElementById('butprev'),
        butnext =           document.getElementById('butnext'),
        butfastnext =       document.getElementById('butfastnext'),
        butend =            document.getElementById('butend'),
        chatbar =           document.getElementById('chatbar'),
        chatmsg =           document.getElementById('chatmsg'),
        showchat =          document.getElementById('showchat'),
        showusers =         document.getElementById('showusers'),
        sgfselect =         document.getElementById('sgf-select'),
        sgfselectfile =     document.getElementById('sgf-select-file'),
        selects =           document.getElementsByClassName('select'),
        selectslen =        selects.length,
        i;

    function fillSelect(select) {
        selects[select].addEventListener('change', function () {
            this.parentNode.getElementsByClassName('selectvalue')[0].innerHTML =
                this.options[this.selectedIndex].text;
        }, false);
    }

    for (i = 0; i < selectslen; i++) {
        fillSelect(i);
    }
    messageok.addEventListener('click', function () {
        document.getElementById(yygo.lastmessage).className = 'none';
        document.getElementById('messages').className = 'none';
    }, false);
    /* Window.{{{*/
    window.addEventListener('resize', function () {
        yygo.setScreenTop();
        if (yygo.screen === 'game') {
            yygo.setGobanSize(false);
        }
        if (yygo.screen === 'hall') {
            yygo.setGamesScreenTop();
        }
    }, false);
    //}}}
    /* Menu.{{{*/
    mgame.addEventListener('click', function () {
        yygo.showScreen('game');
    }, false);
    mhall.addEventListener('click', function () {
        yygo.showScreen('hall');
    }, false);
    msettings.addEventListener('click', function () {
        // Hide previous answer from server.
        document.getElementById('settingssaved').classList.add('none');
        yygo.showScreen('settings');
    }, false);
    mlogout.addEventListener('click', function () {
        // Fire socket disconnection.
        yygo.socket.disconnect();
        // End Session.
        window.location.href = '/logout';
    }, false);
    //}}}
    /* Hall.{{{*/
    grunninggames.addEventListener('click', function () {
        yygo.showGamesScreen('running');
    }, false);
    gcreategames.addEventListener('click', function () {
        yygo.showGamesScreen('create');
    }, false);
    gloadgames.addEventListener('click', function () {
        yygo.showGamesScreen('load');
    }, false);
    sgfselect.addEventListener('click', function () {
        sgfselectfile.click();
    }, false);
    sgfselectfile.addEventListener('change', function () {
        sgfselect.value = this.value.replace('C:\\fakepath\\', '');
    }, false);
    creategame.addEventListener('submit', function (event) {
        var data = { 0: { 0: {
                PB:         'yin',
                PW:         'yang',
                RU:         this.rule.value,
                SZ:         this.size.value,
                branchs:    1
            } } };

        event.preventDefault();
        if (this.privategame.checked) {
            yygo.loadGame(data);
        }
    }, false);
    privategame.addEventListener('change', function () {
        if (this.checked === true) {
            document.getElementById('publicgame').className = 'none';
        } else {
            document.getElementById('publicgame').className = '';
        }
    }, false);
    loadsgf.addEventListener('submit', function (event) {
        var file = new FormData(this);

        event.preventDefault();
        yygo.ajax('/loadsgf/file', 'POST', file, function (data) {
            if (data.error === 'invalid') {
                yygo.showMessage('error', 'errorinvalid');
            } else {
                yygo.loadGame(data);
            }
        });
    }, false);
    refreshlist.addEventListener('click', function () {
        yygo.makeDbGamesList(true);
    }, false);
    chatbar.addEventListener('submit', function (event) {
        event.preventDefault();
        if (chatmsg.value !== '') {
            // Send message to server.
            yygo.socket.emit('chat', chatmsg.value);
            // Clear message input.
            chatmsg.value = '';
        }
    }, false);
    showchat.addEventListener('click', function () {
        yygo.toggleChat();
    }, false);
    showusers.addEventListener('click', function () {
        yygo.toggleUsersList();
    }, false);
    //}}}
    /* Game. {{{*/
    butstart.addEventListener('click', function () {
        if (yygo.curnode > 0) {
            yygo.navigateNode(-999999);
        }
    }, false);
    butfastprev.addEventListener('click', function () {
        if (yygo.curnode > 0) {
            yygo.navigateNode(-10);
        }
    }, false);
    butprev.addEventListener('click', function () {
        if (yygo.curnode > 0) {
            yygo.navigateNode(-1);
        }
    }, false);
    butnext.addEventListener('click', function () {
        if (yygo.curnode < yygo.lastnode) {
            yygo.navigateNode(1);
        }
    }, false);
    butfastnext.addEventListener('click', function () {
        if (yygo.curnode < yygo.lastnode) {
            yygo.navigateNode(10);
        }
    }, false);
    butend.addEventListener('click', function () {
        if (yygo.curnode < yygo.lastnode) {
            yygo.navigateNode(999999);
        }
    }, false);
    textpanelswitch.addEventListener('click', function () {
        if (yygo.textpanel === 'comments') {
            yygo.showTextPanel('gameinfos');
        } else {
            yygo.showTextPanel('comments');
        }
    }, false);
    // }}}
    /* Settings.{{{*/
    settingsform.addEventListener('submit', function (event) {
        var settings = new FormData(this);

        event.preventDefault();
        yygo.ajax('/settings', 'POST', settings, function (data) {
            if (data.error === '') {
                yygo.showMessage('success', 'settingssaved');
            } else {
                yygo.showMessage('error', 'error');
            }
        });
    }, false);
    //}}}
};
/*}}}*/
/* bindGamesListClick {{{
 * Assign a click event to each row in games list to load the proper
 * game index.
 *
 * @param {Array} ids Identifiers for database reference.
 */
yygo.bindGamesListClick = function (ids) {
    var table =     document.getElementById('load-gameslist'),
        rows =      table.getElementsByTagName('tr'),
        rl =        rows.length,
        r;

    /* bindRow {{{*/
    function bindRow(r) {
        rows[r].addEventListener('click', function () {
            var row = this.rowIndex;

            // Get data of game corresponding clicked row.
            yygo.ajax('/load/' + ids[row], 'GET', function (data) {
                yygo.loadGame(data);
            });
        }, true);
    }
    /*}}}*/

    for (r = 0; r < rl; r++) {
        bindRow(r);
    }
};
/*}}}*/
/* bindGobanClick {{{
 * Assign each goban intersection a click event.
 */
yygo.bindGobanClick = function () {
    var size =      yygo.size,
        letter =    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
                    'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
        i,
        j;

    /* bindStone {{{*/
    function bindStone(coord) {
        var stone = document.getElementById(coord);

        // Add listener to parent to catch click on <a> also.
        stone.parentNode.addEventListener('click', function () {
            var stone = this.getElementsByClassName('stone')[0],
                id =    stone.id,
                mode =  yygo.mode;

            if (mode === 'replay' && (stone.className === 'stone' ||
                    stone.className === 'stone brown')) {
                yygo.playStone(id);
            }
            // TODO Other modes.
        }, true);
    }
    /*}}}*/

    for (i = 0; i < size; i++) {
        for (j = 0; j < size; j++) {
            bindStone(letter[i] + letter[j]);
        }
    }
};
/*}}}*/
/* bindVariationChange {{{
 * Change branch according to selected variation.
 *
 * @param {String} select Select tag element.
 */
yygo.bindVariationChange = function (select) {
    var varvalue = document.getElementById('varvalue');

    select.addEventListener('change', function () {
        var branch = parseInt(this.value, 10),
            number = this.options[this.selectedIndex].innerHTML;

        varvalue.textContent = number;
        yygo.curbranch = branch;
        yygo.lastbranch = branch;
        yygo.setLastNode();
        yygo.toggleNavButtons();
        yygo.updatePlayersInfos();
        yygo.makeComments();
        yygo.emptyGoban();
        yygo.placeStones();
        yygo.placeSymbols();
    }, false);
};
/*}}}*/
/* calcStones {{{
 * Calculate all the stones present at each goban step.
 *
 * @param {Object} data Game data.
 *
 * @return {Object} Stones.
 */
yygo.calcStones = function (data) {
    var stones =        {},
        size =          yygo.size,
        rule =          yygo.game[0][0].RU[0],
        parentbranch,
        prevstones,
        prevscore,
        key,
        node,
        branch;

    /* keyAction {{{*/
    function keyAction(node, branch, key, value, stones, prevscore) {
        var play;

        switch (key) {
        case 'B':
            if (value[0] !== '') { // Did not pass.
                play =
                    gotools.playMove('B', value[0], size, stones, rule);
                stones = play.stones;
                yygo.game[node][branch].score.B = prevscore.B +
                    play.prisonners;
            }
            break;
        case 'W':
            if (value[0] !== '') { // Did not pass.
                play =
                    gotools.playMove('W', value[0], size, stones, rule);
                stones = play.stones;
                yygo.game[node][branch].score.W = prevscore.W +
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
    /*}}}*/

    for (node in data) {
        if (data.hasOwnProperty(node)) {
            stones[node] = {};
            for (branch in data[node]) {
                if (data[node].hasOwnProperty(branch)) {
                    stones[node][branch] = {B: [], W: [], BF: [],
                        WF: [], K: []};
                    yygo.game[node][branch].score = {B: 0, W: 0};
                    // Load previous stones.
                    parentbranch =
                        yygo.getParentBranch(node - 1, branch);
                    if (node > 0) {
                        prevstones = stones[node - 1][parentbranch];
                        prevscore =
                            yygo.game[node - 1][parentbranch].score;
                    } else {
                        prevstones = stones[node][branch];
                        prevscore = yygo.game[node][branch].score;
                    }
                    yygo.game[node][branch].score = {
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
};
/*}}}*/
/* connectHall {{{
 * Connect to main hall.
 */
yygo.connectHall = function () {
    var chat = document.getElementById('chat');

    if (yygo.socket === null) {
        yygo.socket = io.connect();
    } else if (yygo.socket.socket.connected !== true) {
        yygo.socket.socket.connect();
    }
    yygo.socket.emit('join', '', function (data) {
        if (!data.success) {
            yygo.socket.disconnect();
            yygo.connected = false;
            window.location.href = 'logout';
        } else {
            yygo.username = data.username;
            yygo.isguest = data.isguest;
            yygo.userslist = data.users;
            yygo.makeUsersList();
            yygo.connected = true;
        }
    });

    yygo.socket.on('chat', function (message) {
        var myname = new RegExp('\\b(' + yygo.username + ')\\b', 'g');
        message = message.replace(myname, '<strong class=tred>$1</strong>');
        chat.innerHTML += message + '</br>';
        chat.scrollTop = chat.scrollHeight; // Scroll to bottom.
    });
    yygo.socket.on('user-joined', function (user) {
        yygo.userslist.push(user);
        yygo.makeUsersList();
    });
    yygo.socket.on('user-left', function (user) {
        var id = yygo.userslist.indexOf(user);
        yygo.userslist.splice(id, 1);
        yygo.makeUsersList();
    });
};
/*}}}*/
/* emptyGoban {{{
 * Empty the goban of all stones, symbols, labels.
 */
yygo.emptyGoban = function () {
    var size =      yygo.size,
        classturn = yygo.playerturn === 'W' ? 'white' : 'black',
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
};
/*}}}*/
/* getParentBranch {{{
 * Find the branch of which depends a given branch at a given node.
 *
 * @param   {Number} node       Node to check.
 * @param   {Number} branch     Child branch.
 *
 * @return  {Number}            The parent branch.
 */
yygo.getParentBranch = function (node, branch) {
    var game = yygo.game,
        i;

    for (i = branch; i >= 0; i--) {
        if (game[node] !== undefined && game[node][i] !== undefined) {
            return i;
        }
    }
    return 0;
};
/*}}}*/
/* init {{{
 * This is where we start.
 */
yygo.init = function () {
    // Connect to main hall.
    yygo.connectHall();
    // Bind events to elements.
    yygo.bindEvents();
    // Set and show hall screen.
    yygo.setScreenTop();
    yygo.showGamesScreen('running');
    yygo.showScreen('hall');
    // Set games screen top.
    yygo.setGamesScreenTop();
};
/*}}}*/
/* insertSvgSymbol {{{
 * Insert SVG symbol in a cell.
 *
 * @param {String} symbol   Symbol to insert.
 * @param {String} id       Identifier of the cell.
 * @param {String} color    Color of the stone in cell.
 */
yygo.insertSvgSymbol = function (symbol, id, color) {
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
};
/*}}}*/
/* isObjectEmpty {{{
 * Test if an Object is empty.
 * @link http://stackoverflow.com/a/7864800
 *
 * @param {Object} obj Object to check.
 * @return {Boolean} TRUE if Object is empty.
 */
yygo.isObjectEmpty = function (obj) {
    return Object.keys(obj).length === 0;
};
/*}}}*/
/* loadGame {{{
 * Load a game.
 *
 * @param {Object} data Game data.
 */
yygo.loadGame = function (data) {
    var oldsize = yygo.size;

    // Show loading screen.
    yygo.showScreen('loading');

    yygo.game = data;
    yygo.game[0][0].score = {B: 0, W: 0};
    yygo.size = parseInt(yygo.game[0][0].SZ, 10);
    yygo.stones = yygo.calcStones(data);

    yygo.curnode = 0;
    yygo.curbranch = 0;
    yygo.lastbranch = 0;

    yygo.setLastNode();

    // Generate goban grid if necessary.
    if (yygo.size !== oldsize) {
        yygo.makeGoban();
    }

    // This will initialize cell links.
    yygo.emptyGoban();

    yygo.makeVariations();
    yygo.makeGameInfos();
    yygo.setPlayersInfos();
    yygo.makeComments();

    yygo.placeStones();
    yygo.placeSymbols();

    yygo.mode = 'replay';

    yygo.toggleNavButtons();

    // Activate game menu button.
    document.getElementById('m-game').classList.remove('none');

    // Set Screen top.
    yygo.setScreenTop();

    yygo.setGobanSize(true, function () {
        yygo.showScreen('game');
    });
};
/*}}}*/
/* makeComments {{{
 * Create and insert comments html code.
 */
yygo.makeComments = function () {
    var node =      yygo.curnode,
        branch =    yygo.curbranch,
        comments =  document.getElementById('comments'),
        html =      '',
        nameregex = /^(.+?):/gm,
        comment,
        clen,
        chr,
        i;

    if (yygo.game[node][branch].C !== undefined) {
        comment = yygo.game[node][branch].C[0];
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
};
/*}}}*/
/* makeDbGamesList {{{
 * Insert database games list.
 *
 * @param {Boolean} refresh Force list refresh?
 */
yygo.makeDbGamesList = function (refresh) {
    var gameslist = document.getElementById('load-gameslist'),
        list =      yygo.gameslist,
        page =      0,
        html =      '',
        i;

    if (refresh === undefined) {
        refresh = false;
    }

    if (yygo.isObjectEmpty(list) || refresh) { // Get fresh list from server.
        yygo.ajax('/gameslist/' + page, 'GET', function (data) {
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
            yygo.gameslist = data;
            for (i = 0; i < datalen; i++) {
                html += '<tr><td class="gameslist-entry">' +
                        '<a class="linkbutton brown3" href="#">' +
                        data[i].name + '</a></td></tr>';
                ids.push(data[i]._id);
            }
            gameslist.innerHTML = html;
            // Bind click events to list.
            yygo.bindGamesListClick(ids);
        });
    }
};
/*}}}*/
/* makeGameInfos {{{
 * Create and insert informations html code.
 */
yygo.makeGameInfos = function () {
    var infos =         yygo.game[0][0],
        gameblack =     document.getElementById('gameblack'),
        gamewhite =     document.getElementById('gamewhite'),
        gameresult =    document.getElementById('gameresult'),
        gamedate =      document.getElementById('gamedate'),
        gameplace =     document.getElementById('gameplace'),
        gameevent =     document.getElementById('gameevent'),
        gamename =      document.getElementById('gamename'),
        gamerule =      document.getElementById('gamerule'),
        gamekomi =      document.getElementById('gamekomi'),
        gametime =      document.getElementById('gametime'),
        gameovertime =  document.getElementById('gameovertime'),
        gameannotator = document.getElementById('gameannotator'),
        gamescribe =    document.getElementById('gamescribe'),
        gamesource =    document.getElementById('gamesource'),
        gamecopyright = document.getElementById('gamecopyright'),
        gamecomment =   document.getElementById('gamecomment');

    /* insertInfos {{{*/
    function insertInfo(info, element) {
        var infos = yygo.game[0][0];

        if (infos[info] !== undefined) {
            element.textContent = infos[info];
        } else {
            element.textContent = '';
        }
    }
    /*}}}*/

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
        gametime.textContent = yygo.secondsToTime(infos.TM);
    } else {
        gametime.textContent = '';
    }

    insertInfo('RE', gameresult);
    insertInfo('DT', gamedate);
    insertInfo('PC', gameplace);
    insertInfo('EV', gameevent);
    insertInfo('GN', gamename);
    insertInfo('RU', gamerule);
    insertInfo('KM', gamekomi);
    insertInfo('OT', gameovertime);
    insertInfo('AN', gameannotator);
    insertInfo('US', gamescribe);
    insertInfo('SO', gamesource);
    insertInfo('CP', gamecopyright);
    insertInfo('GC', gamecomment);
};
/*}}}*/
/* makeGoban {{{
 * Create and insert goban html code. This include the borders and
 * the grid.
 */
yygo.makeGoban = function () {
    var size =      yygo.size + 2,
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
        cl =        '<div class="cell-link"></div>',
        html =      '',
        content,
        id,
        i,
        j;

    /* isHoshi {{{
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
                    content = gr + gb + sto + id + stc + cl;
                } else if (j === size - 2) {
                    content = gb + gl + sto + id + stc + cl;
                } else if (j !== 0 && j !== size - 1) {
                    content = gr + gb + gl + sto + id + stc + cl;
                } else {
                    content = size - i - 1;
                }
            } else if (i === size - 2) {
                if (j === 1) {
                    content = gt + gr + sto + id + stc + cl;
                } else if (j === size - 2) {
                    content = gt + gl + sto + id + stc + cl;
                } else if (j !== 0 && j !== size - 1) {
                    content = gt + gr + gl + sto + id + stc + cl;
                } else {
                    content = size - i - 1;
                }
            } else if (j === 1 && i !== 0 && i !== size - 1) {
                content = gt + gr + gb + sto + id + stc + cl;
            } else if (j === size - 2 && i !== 0 && i !== size - 1) {
                content = gt + gb + gl + sto + id + stc + cl;
            } else if (i !== 0 && i !== size - 1 && j !== 0 && j !== size - 1) {
                content = gt + gr + gb + gl + sto + id + stc + cl;
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
    yygo.bindGobanClick();
};
/*}}}*/
/* makeUsersList {{{
 * Make chat users list.
 */
yygo.makeUsersList = function () {
    var userslist = document.getElementById('userslist'),
        html = '',
        s = yygo.userslist.length,
        i;

    for (i = 0; i < s; i++) {
        html += yygo.userslist[i] + '</br>';
    }
    userslist.innerHTML = html;
};
/*}}}*/
/* makeVariations {{{
 * Create and insert variations html code.
 */
yygo.makeVariations = function () {
    var game =          yygo.game,
        curbranch =     yygo.curbranch,
        curnode =       yygo.curnode,
        branchs =       game[0][0].branchs,
        variations =    document.getElementById('variations'),
        varselect =     document.getElementById('varselect'),
        varvalue =      document.getElementById('varvalue'),
        variationsnum = 0,
        html =          '',
        currentvar,
        pbranch,
        opbranch,
        i;

    // Get parent of the current branch at previous node.
    pbranch = yygo.getParentBranch(curnode - 1, curbranch);

    // Browse the branchs to find variations of the actual branch.
    for (i = 0; i < branchs; i++) {
        if (game[curnode][i] !== undefined && curnode > 0) {
            // Get parent of 'i' branch at previous node.
            opbranch = yygo.getParentBranch(curnode - 1, i);
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
        variations.classList.add('none');
    } else {
        varvalue.textContent = currentvar;
        varselect.innerHTML = html;
        variations.classList.remove('none');
        yygo.bindVariationChange(varselect);
    }
};
/*}}}*/
/* navigateNode {{{
 * Navigate the game depending on the defined last branch.
 *
 * @param {Number} move Move to apply to current position in game.
 */
yygo.navigateNode = function (move) {
    var game =          yygo.game,
        branch =        yygo.curbranch,
        node =          yygo.curnode,
        lastbranch =    yygo.lastbranch,
        lastnode =      yygo.lastnode,
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
    lastbranchp = yygo.getParentBranch(node, lastbranch);

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
                yygo.playerturn = 'W';
            } else {
                yygo.playerturn = 'B';
            }
        } else {
            yygo.playerturn = 'W';
        }
    } else if (game[node][branch].W !== undefined) { // White did.
        yygo.playerturn = 'B';
    } else { // Probably some demonstration or we are back to start.
        prevnode = node - 1 >= 0 ? node - 1 : 0;
        prevbranch = branch;
        while (prevnode >= 0) {
            prevbranch =
                yygo.getParentBranch(prevnode, prevbranch);
            if (game[prevnode][prevbranch].B !== undefined) {
                yygo.playerturn = 'W';
                break;
            } else if (game[prevnode][prevbranch].W !== undefined) {
                yygo.playerturn = 'B';
                break;
            }
            if (prevnode === 0) {
                yygo.playerturn = 'B';
                break;
            }
            prevnode--;
        }
    }

    yygo.curbranch = branch;
    yygo.curnode = node;

    yygo.toggleNavButtons();

    yygo.makeVariations();
    yygo.updatePlayersInfos();
    yygo.makeComments();

    yygo.emptyGoban();
    yygo.placeStones();
    yygo.placeSymbols();
};
/*}}}*/
/* parseDataFromList {{{
 * Parse the data of the selected game in list.
 *
 * @param {Number}      index       Index of the selected game in list.
 * @param {Function}    callback    Callback.
 */
yygo.parseDataFromList = function (index, callback) {
    var table = document.getElementById('load-gameslist'),
        id =    table.rows[index].cells[0].textContent;

    yygo.ajax('games/' + id, 'GET', function (data) {
        yygo.game = data;

        yygo.size = parseInt(yygo.game[0][0].SZ, 10);

        yygo.curnode = 0;
        yygo.curbranch = 0;
        yygo.lastbranch = 0;

        yygo.setLastNode();
        callback();
    });
};
/*}}}*/
/* placeStones {{{
 * Place the stones and kos of the actual state on the goban.
 * Also remove links of those to make them unplayable moves.
 */
yygo.placeStones = function () {
    var stones = yygo.stones[yygo.curnode][yygo.curbranch];

    /* placeColor {{{*/
    function placeColor(list, color) {
        var listlen = list.length,
            stone,
            link,
            i;

        for (i = 0; i < listlen; i++) {
            stone = document.getElementById(list[i]);
            stone.classList.add(color);
            link = stone.parentNode.getElementsByClassName('cell-link')[0];
            link.className = 'cell-link';
        }
    }
    /*}}}*/

    placeColor(stones.B, 'black');
    placeColor(stones.W, 'white');
    placeColor(stones.K, 'ko');
    // Add forbidden moves.
    if (yygo.playerturn === 'B') {
        placeColor(stones.BF, 'BF');
    } else {
        placeColor(stones.WF, 'WF');
    }
};
/*}}}*/
/* placeSymbols {{{
 * Place the symbols of the actual state on the goban.
 */
yygo.placeSymbols = function () {
    var ko =    yygo.stones[yygo.curnode][yygo.curbranch].K,
        game =  yygo.game[yygo.curnode][yygo.curbranch];

    /* insertSymbols {{{*/
    function insertSymbols(symbol, list) {
        var listlen =   list.length,
            color =     '',
            label =     [],
            cell,
            i;

        for (i = 0; i < listlen; i++) {
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
                yygo.insertSvgSymbol(symbol, list[i], color);
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
};
/*}}}*/
/* playStone {{{
 * User played a move.
 *
 * @param {String} coord Coordinate clicked.
 */
yygo.playStone = function (coord) {
    var branchs =       yygo.game[0][0].branchs,
        exist =         false,
        parentbranch =  0,
        i;

    // Browse next node branchs to check if that move exist.
    for (i = yygo.curbranch; i < branchs; i++) {
        parentbranch = yygo.getParentBranch(yygo.curnode, i);
        if (parentbranch === yygo.curbranch &&
                yygo.game[yygo.curnode + 1] !== undefined &&
                yygo.game[yygo.curnode + 1][i] !== undefined &&
                yygo.game[yygo.curnode + 1][i][yygo.playerturn] !== undefined &&
                yygo.game[yygo.curnode + 1][i][yygo.playerturn][0] === coord) {
            // That move already exist in a child branch, change last
            // branch and show it.
            exist = true;
            yygo.lastbranch = i;
            yygo.navigateNode(1);
            break;
        }
    }
    if (!exist) {
        if (yygo.game[yygo.curnode + 1] === undefined ||
                yygo.game[yygo.curnode + 1][yygo.curbranch] === undefined) {
            yygo.addMove(coord);
        } else {
            yygo.addBranch(coord);
        }
    }
};
/*}}}*/
/* secondsToTime {{{
 * Convert a time in seconds to "minutes:seconds".
 *
 * @param {Number} secs Time in seconds.
 *
 * @return {String} "minutes:seconds"
 */
yygo.secondsToTime = function (secs) {
    var hour =  0,
        min =   0,
        sec =   0;

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
};
/*}}}*/
/* setGamesScreenTop {{{
 * Set games screen top relatively to gamesmenu.
 */
yygo.setGamesScreenTop = function () {
    var gamesscreens =      document.getElementsByClassName('gamesscreen'),
        gamesscreenslen =   gamesscreens.length,
        screentop =         document.getElementById('games-menu').offsetHeight,
        i;

    for (i = 0; i < gamesscreenslen; i++) {
        gamesscreens[i].style.top = screentop + 'px';
    }
};
/*}}}*/
/* setGobanSize {{{
 * Define the size of the goban and elements depending on it. Redraw
 * if necessary or asked.
 *
 * @param {Boolean}  redraw     Do we need to redraw interface?
 * @param {Function} callback   Callback.
 */
yygo.setGobanSize = function (redraw, callback) {
    var screenwidth =   window.innerWidth,
        heightleft =    yygo.screenheight -
                        document.getElementById('fakebar').offsetHeight,
        cellsize =      0,
        smaller =       0;

    /* drawGame {{{
     * Place game elements depending on screen resolution.
     *
     * @param {Boolean}  redraw     Do we need to redraw interface?
     * @param {Function} callback   Callback.
     */
    function drawGame(redraw, callback) {
        var textpanel =     document.getElementById('textpanel'),
            goban =         document.getElementById('goban'),
            gobanpanel =    document.getElementById('goban-panel'),
            cells =         document.getElementsByClassName('cell'),
            cellslen =      cells.length,
            fontsize =      cellsize / 1.5,
            i;

        if (redraw) {
            // Resize goban.
            goban.style.height = yygo.gobansize + 'px';
            goban.style.width = yygo.gobansize + 'px';
            if (yygo.orientation === 'horizontal') {
                gobanpanel.style.width = yygo.gobansize + 'px';
            } else {
                gobanpanel.style.width = '100%';
            }
            // Resize each goban cell.
            for (i = 0; i < cellslen; i++) {
                cells[i].style.height = cellsize + 'px';
                cells[i].style.width = cellsize + 'px';
                cells[i].style.lineHeight = cellsize + 'px';
                cells[i].style.fontSize = fontsize + 'px';
            }
        }
        // Place game elements depending on orientation.
        if (yygo.orientation === 'horizontal') {
            goban.style.margin = 0;
            textpanel.style.left = yygo.gobansize + 'px';
            textpanel.className = '';
        } else {
            goban.style.margin = 'auto';
            textpanel.style.left = 0;
            textpanel.className = 'none';
        }
        if (callback !== undefined) {
            callback();
        }
    }
    /*}}}*/

    if (screenwidth < heightleft) {
        yygo.orientation = 'vertical';
        smaller = screenwidth;
    } else {
        yygo.orientation = 'horizontal';
        if (screenwidth - 220 <= heightleft) {
            smaller = screenwidth - 220;
        } else {
            smaller = heightleft;
        }
    }

    // Calculate the size of the goban and avoid bad display.
    cellsize = Math.floor(smaller / (yygo.size + 2));
    if (cellsize / 2 !== Math.round(cellsize / 2)) {
        cellsize--;
    }
    // Redraw if size changed.
    if (yygo.gobansize !== cellsize * (yygo.size + 2)) {
        redraw = true;
    }
    yygo.gobansize = cellsize * (yygo.size + 2);

    drawGame(redraw, callback);
};
/*}}}*/
/* setLastNode {{{
 * Define the last node of the current branch.
 */
yygo.setLastNode = function () {
    var node = yygo.curnode;

    while (yygo.game[node + 1] !== undefined &&
            yygo.game[node + 1][yygo.curbranch] !== undefined) {
        node++;
    }
    yygo.lastnode = node;
};
/*}}}*/
/* setPlayersInfos {{{
 * Insert players names, starting scores and times.
 */
yygo.setPlayersInfos = function () {
    var infos = yygo.game[0][0],
        name =  '???',
        time =  '--',
        rank =  '[?]';

    if (infos.PB !== undefined) {
        name = infos.PB;
    }
    if (infos.BR !== undefined) {
        rank = '[' + infos.BR + ']';
    }
    document.getElementById('blackname').textContent = name;
    document.getElementById('blackname').title = name;
    name = '???';
    document.getElementById('blackrank').textContent = rank;
    rank = '[?]';
    document.getElementById('blackscore').textContent = infos.score.B;

    if (infos.PW !== undefined) {
        name = infos.PW;
    }
    if (infos.WR !== undefined) {
        rank = ' [' + infos.WR + ']';
    }
    document.getElementById('whitename').textContent = name;
    document.getElementById('whitename').title = name;
    document.getElementById('whiterank').textContent = rank;
    document.getElementById('whitescore').textContent = infos.score.W;

    // Initiate players time.
    if (infos.TM !== undefined) {
        time = yygo.secondsToTime(infos.TM);
    }
    document.getElementById('blacktime').textContent = time;
    document.getElementById('whitetime').textContent = time;
};
/*}}}*/
/* setScreenTop {{{
 * Set screen top relatively to menu.
 */
yygo.setScreenTop = function () {
    var screens =   document.getElementsByClassName('screen'),
        nscreens =  screens.length,
        screentop = 0,
        i;

    if (yygo.menu) {
        screentop = document.getElementById('menu').offsetHeight;
    }

    for (i = 0; i < nscreens; i++) {
        screens[i].style.top = screentop + 'px';
    }
    // Set screen height.
    yygo.screenheight = window.innerHeight - screentop;
};
/*}}}*/
/* showGamesScreen {{{
 * Switch to another games screen.
 *
 * @param {String} show Element reference to screen to show.
 */
yygo.showGamesScreen = function (show) {
    show = show + '-games';
    if (yygo.gamesscreen !== '') {
        document.getElementById(yygo.gamesscreen).classList.add('none');
        document.getElementById('g-' + yygo.gamesscreen).classList.
            add('inactive');
    }
    document.getElementById(show).classList.remove('none');
    document.getElementById('g-' + show).classList.remove('inactive');
    yygo.gamesscreen = show;
};
/*}}}*/
/* showMessage {{{
 * Show a message on screen.
 *
 * @param {String} type Type of message (error, success, help).
 * @param {String} id   Identifier of element containing the message.
 */
yygo.showMessage = function (type, id) {
    var messages = document.getElementById('messages');

    yygo.lastmessage = id;
    document.getElementById(id).className = '';

    if (type === 'error') {
        messages.className = 'red';
    } else if (type === 'success') {
        messages.className = 'green';
    } else {
        messages.className = 'brown4';
    }
    document.getElementById('message-ok').focus();
};
/*}}}*/
/* showScreen {{{
 * Switch to another screen.
 *
 * @param {String} show Element reference to screen to show.
 */
yygo.showScreen = function (show) {
    document.getElementById(yygo.screen).classList.add('none');
    if (yygo.screen !== 'loading') {
        document.getElementById('m-' + yygo.screen).classList.add('inactive');
    }
    document.getElementById(show).classList.remove('none');
    if (show !== 'loading') {
        document.getElementById('m-' + show).classList.remove('inactive');
    }
    yygo.screen = show;
};
/*}}}*/
/* showTextPanel {{{
 * Switch between comment and game infos.
 *
 * @param {String} show Element reference to show.
 */
yygo.showTextPanel = function (show) {
    document.getElementById(yygo.textpanel).classList.add('none');
    document.getElementById(show).classList.remove('none');
    yygo.textpanel = show;
};
/*}}}*/
/* toggleChat {{{
 * Toggle visibility of chat.
 */
yygo.toggleChat = function () {
    var chat = document.getElementById('chat');

    if (yygo.showchat) {
        chat.style.display = 'none';
        yygo.showchat = false;
    } else {
        chat.style.display = 'block';
        yygo.showchat = true;
    }
};
/*}}}*/
/* toggleNavButtons {{{
 * Alternate active state of navigation buttons.
 */
yygo.toggleNavButtons = function () {
    var butstart =     document.getElementById('butstart'),
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
    if (yygo.curnode === 0) {
        butstart.classList.add('disabled');
        butprev.classList.add('disabled');
        butfastprev.classList.add('disabled');
    }
    // We are at the end, make forward buttons inactive.
    if (yygo.curnode === yygo.lastnode) {
        butnext.classList.add('disabled');
        butfastnext.classList.add('disabled');
        butend.classList.add('disabled');
    }
};
/*}}}*/
/* toggleUsersList {{{
 * Toggle visibility of users list.
 */
yygo.toggleUsersList = function () {
    var userslist = document.getElementById('userslist'),
        chat =      document.getElementById('chat');

    if (userslist.style.display === '' || userslist.style.display === 'none') {
        userslist.style.display = 'block';
        if (yygo.showchat) {
            chat.style.display = 'none';
        }
    } else {
        userslist.style.display = 'none';
        if (yygo.showchat) {
            chat.style.display = 'block';
        }
    }
};
/*}}}*/
/* updatePlayersInfos {{{
 * Update players time and score.
 */
yygo.updatePlayersInfos = function () {
    var game = yygo.game[yygo.curnode][yygo.curbranch];

    // Update scores.
    document.getElementById('blackscore').textContent = game.score.B;
    document.getElementById('whitescore').textContent = game.score.W;

    // Update time.
    if (game.BL !== undefined) {
        document.getElementById('blacktime').textContent =
            yygo.secondsToTime(game.BL);
    }
    if (game.WL !== undefined) {
        document.getElementById('whitetime').textContent =
            yygo.secondsToTime(game.WL);
    }
};
/*}}}*/
/*}}}*/
// Call init when DOM is loaded.
document.addEventListener('DOMContentLoaded', yygo.init(), false);
