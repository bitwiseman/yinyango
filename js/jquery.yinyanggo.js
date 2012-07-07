var yygo = {}; // espace de nom yygo

(function () {
    'use strict';

    // fonctions utilitaires

    function jsonRequest(url, callback) {//{{{
        // requête ajax simple qui retourne un JSON
        var xhr = new XMLHttpRequest(); // ignorer vieux IE

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 &&
                    (xhr.status == 200 || xhr.status == 0)) {
                callback(JSON.parse(xhr.responseText));
            }
        };

        xhr.open('GET', url, true); // GET asynchrone
        xhr.send(null);
    }//}}}

    function isEmpty(obj) {//{{{
        // test si un objet est vide (navigateurs récents)
        return Object.keys(obj).length === 0;
    }//}}}

    // création de l'objet yygo

    yygo.data = {//{{{

        // propriétés

        langs:          ['en', 'fr'],

        comments:       {},
        game:           {},
        gameslist:      {},
        infos:          {},
        symbols:        {},

        lang:           'en',

        branchs:        0,
        size:           0,

        curbranch:      0,
        curnode:        0,
        lastbranch:     0,
        lastnode:       0,

        // méthodes

        getParentBranch: function (node, branch) {//{{{
            var game = this.game, i;

            for (i = branch; i >= 0; i--) {
                if (game[node] !== undefined && game[node][i] !== undefined) {
                    return i;
                }
            }
            return 0;
        },//}}}

        loadDataFromList: function (number) {//{{{
            this.infos = JSON.parse(this.gameslist[number].infos);
            this.comments = JSON.parse(this.gameslist[number].comments);
            this.symbols = JSON.parse(this.gameslist[number].symbols);
            this.game = JSON.parse(this.gameslist[number].game);

            this.size = parseInt(this.infos.SZ, 10);
            this.branchs = this.infos.branchs;

            this.curnode = 0;
            this.curbranch = 0;
            this.lastbranch = 0;

            this.setLastNode();
        },//}}}

        setLastNode: function () {//{{{
            var game =      this.game,
                lastnode =  this.curnode,
                curbranch = this.curbranch;

            while (game[lastnode + 1] !== undefined &&
                    game[lastnode + 1][curbranch] !== undefined) {
                lastnode++;
            }
            this.lastnode = lastnode;
        },//}}}

        setLang: function (lang, callback) {//{{{
            var langs = this.langs, i;

            for (i in langs) {
                if (langs[i] === lang) {
                    this.lang = lang;
                }
            }

            // récupère le json de la langue et traduit les éléments
            jsonRequest('lang/' + this.lang + '.json', function (data) {
                yygo.data.locale = data;
                yygo.view.changeLang();
                if (callback !== undefined) {
                    callback();
                }
            });
        }//}}}

    };//}}}

    yygo.view = {//{{{

        // propriétés

        htmlcomments:   '',
        htmlinfos:      '',
        htmllist:       '',
        htmlvariations: '',

        viewmode:       '',

        showborders:    false,
        showcomments:   true,
        showvariations: false,

        sizecell:       0,
        sizegoban:      0,

        // méthodes

        // construction code html

        makeGoban: function () {//{{{
            var size = yygo.data.size;
            var gobanelem = document.getElementById('goban');
            var letters = ['A','B','C','D','E','F','G','H','J',
            'K','L','M','N','O','P','Q','R','S','T'];
            var htmltop = '<div id="bordertop"><div class="cell"></div>';
            var htmlright = '<div id="borderright"><div class="cell vcell"></div>';
            var htmlbottom = '<div id="borderbottom"><div class="cell"></div>';
            var htmlleft = '<div id="borderleft"><div class="cell vcell"></div>';
            var html, i;

            for (i = 0; i < size; i++) {
                htmltop += '<div class="cell">' + letters[i] + '</div>';
                htmlright += '<div class="cell vcell">' + (size - i) + '</div>';
                htmlbottom += '<div class="cell">' + letters[i] + '</div>';
                htmlleft += '<div class="cell vcell">' + (size - i) + '</div>';
            }

            htmltop += '</div>';
            htmlright += '</div>';
            htmlbottom += '</div>';
            htmlleft += '</div>';

            // bordures et grille dans l'élément 'goban'
            html = htmltop + htmlright + htmlbottom + htmlleft +
                '<div id="grid">' + this.makeGrid()  + '</div>';

            gobanelem.innerHTML = html;
        },//}}}

        makeComments: function () {//{{{
            var comments = yygo.data.comments;
            var curnode = yygo.data.curnode;
            var curbranch = yygo.data.curbranch;
            var commentselem = document.getElementById('comments');
            var html = '';

            if (comments != null && comments[curnode] != null &&
            comments[curnode][curbranch] != null) {
                html = '<p>';
                html += comments[curnode][curbranch];
                html += '</p>';
            }

            this.htmlcomments = html;

            commentselem.innerHTML = this.htmlcomments;
        },//}}}

        makeGrid: function () {//{{{
            var size = yygo.data.size;
            var gridelem = document.getElementById('grid');
            var cell = '';
            var coord = ['a','b','c','d','e','f','g','h','i','j',
            'k','l','m','n','o','p','q','r','s'];
            var html = '';
            var i, j;

            for (i = 0; i < size; i++) {
                html += '<div>'; // début de ligne
                for (j = 0; j < size; j++) {
                    cell = coord[j] + coord[i];
                    html += '<div class="cell" id="' + cell + '"></div>';
                }
                html += '</div>'; // fin de ligne
            }

            return html;
        },//}}}

        makeGamesList: function () {//{{{
            var gameslist = yygo.data.gameslist;
            var loadlistelem = document.getElementById('loadlist');
            var html = '<table>';
            var infos = {};
            var ci = gameslist.length;
            var i;

            for (i = 0; i < ci; i ++) {
                infos = JSON.parse(gameslist[i].infos);

                html += '<tr><td>' + gameslist[i].file + '</td>';

                if (infos['PB'] != null) {
                    html += '<td>' + infos['PB'] + '</td>';
                } else {
                    html += '<td></td>';
                }
                if (infos['PW'] != null) {
                    html += '<td>' + infos['PW'] + '</td>';
                } else {
                    html += '<td></td>';
                }
                if (infos['DT'] != null) {
                    html += '<td>' + infos['DT'] + '</td>';
                } else {
                    html += '<td></td>';
                }

                html += '</tr>';
            }

            html += '</table>';

            this.htmllist = html;

            loadlistelem.innerHTML = this.htmllist;
        },//}}}

        makeInfos: function () {//{{{
            var infos = yygo.data.infos;
            var locale = yygo.data.locale;
            var infoselem = document.getElementById('infos');
            var html = '<p>';

            if (infos['PB'] != null) {
                html += '<em>' + locale.black + ':</em> ' + infos['PB'];
            }
            if (infos['BR'] != null) {
                html += ' [' + infos['BR'] + ']';
            }
            if (infos['PW'] != null) {
                html += ' <br /><em>' + locale.white + ':</em> ' + infos['PW'];
            }
            if (infos['WR'] != null) {
                html += ' [' + infos['WR'] + ']';
            }
            if (infos['DT'] != null) {
                html += ' <br /><em>' + locale.date + ':</em> ' + infos['DT'];
            }
            if (infos['PC'] != null) {
                html += ' <br /><em>' + locale.place + ':</em> ' + infos['PC'];
            }
            if (infos['RU'] != null) {
                html += ' <br /><em>' + locale.rules + ':</em> ' + infos['RU'];
            }

            html += '</p>';

            this.htmlinfos = html;

            infoselem.innerHTML = this.htmlinfos;
        },//}}}

        makeVariations: function () {//{{{
            var game = yygo.data.game;
            var curbranch = yygo.data.curbranch;
            var curnode = yygo.data.curnode;
            var branchs = yygo.data.branchs;
            var pbranch = yygo.data.getParentBranch(curnode - 1, curbranch);
            var variationselem = document.getElementById('variations');
            var variations = 0;
            var html = '';
            var i;

            for (i = 0; i < branchs; i++) {
                if (game[curnode][i] != null && curnode > 0) {
                    if (yygo.data.getParentBranch(curnode - 1, i) == pbranch) {
                        variations++;
                        if (i == curbranch) { // variante actuelle
                            html += '<div id="varbua' + i + '"></div>';
                        } else { // autre variante
                            html += '<div id="varbut' + i + '"></div>';
                        }
                    }
                }
            }

            if (variations <= 1) { // pas de variantes, effacer le code HTML
                html = '';
            }

            this.htmlvariations = html;

            if (this.htmlvariations != '') { // il y a des variantes
                // afficher la barre de variantes si masquée
                if (!this.showvariations) {
                    this.showvariations = true;
                    this.setGobanSize();
                }
            } else { // pas de variantes
                // masquer la barre de variantes si affichée
                if (this.showvariations) {
                    this.showvariations = false;
                    this.setGobanSize();
                }
            }
            variationselem.innerHTML = this.htmlvariations;
        },//}}}

        // affichage

        changeGridImage: function () {//{{{
            var gridelem = document.getElementById('grid');

            gridelem.style.background = 'url(images/' + yygo.data.size + '.svg)';
        },//}}}

        changeLang: function () {//{{{
            var locale = yygo.data.locale;
            var lang = yygo.data.lang;

            // étiquettes des boutons
            $('#comment').attr('title', locale.comment);
            $('#load').attr('title', locale.load);
            $('#lang').attr('title', locale.language);
            $('#start').attr('title', locale.start);
            $('#prev').attr('title', locale.prev);
            $('#fastprev').attr('title', locale.fastprev);
            $('#next').attr('title', locale.next);
            $('#fastnext').attr('title', locale.fastnext);
            $('#end').attr('title', locale.end);
            $('#options').attr('title', locale.options);
            $('#sendsgf').attr('title', locale.sendsgf);
            $('#downsgf').attr('title', locale.downsgf);

            if (!isEmpty(yygo.data.infos)) {
                this.makeInfos(); // réécris le code HTML des infos
            }

            // change l'apparence du bouton pour prendre celle de la langue
            $('#lang').attr('class', 'button' + lang);
            $('[class^="lang"]').show();
            $('.lang' + lang).hide();
        },//}}}

        changeScreen: function () {//{{{
            var mode = yygo.events.mode;
            var screen = yygo.events.screen;
            var navbuttons = document.getElementById('navbuttons');
            var optbuttons = document.getElementById('optbuttons');
            var gobbuttons = document.getElementById('gobbuttons');
            var options = document.getElementById('options');
            var variations = document.getElementById('variations');
            var goban = document.getElementById('goban');
            var comments = document.getElementById('comments');
            var infos = document.getElementById('infos');
            var loadlist = document.getElementById('loadlist');

            if (screen == 'goban') {
                optbuttons.style.display = 'none';
                infos.style.display = 'none';
                loadlist.style.display = 'none';

                gobbuttons.style.display = 'block';
                options.style.display = 'block';
                goban.className = '';
                if (mode == 'replay') {
                    navbuttons.style.display = 'block';
                    this.toggleNavButtons();
                    this.toggleVariations();
                    this.toggleComments();
                }
                // TODO autres modes
            } else if (screen == 'options') {
                navbuttons.style.display = 'none';
                gobbuttons.style.display = 'none';
                variations.style.display = 'none';
                goban.className = 'hide'; // déplace plus rapide
                comments.style.display = 'none';
                loadlist.style.display = 'none';

                optbuttons.style.display = 'block';
                options.style.display = 'block';
                infos.style.display = 'block';
            } else if (screen == 'list') {
                options.style.display = 'none';
                goban.className = 'hide'; // déplace plus rapide
                infos.style.display = 'none';

                loadlist.style.display = 'block';
            } else if (screen == 'intro') {
                // TODO
            }
        },//}}}

        drawGoban: function (redraw) {//{{{
            var commentselem = document.getElementById('comments');
            var gobanelem = document.getElementById('goban');
            var gridelem = document.getElementById('grid');
            var cellelems = document.getElementsByClassName('cell');
            var cc = cellelems.length;
            var fontsize = this.sizecell / 1.5;
            var comtop = 50;
            var c;

            if (this.showvariations) {
                comtop += 20;
            }
            if (redraw) { // c'est un redimenssionnement
                // redimensionne le goban
                gobanelem.style.height = this.sizegoban + 'px';
                gobanelem.style.width = this.sizegoban + 'px';
                // redimensionne la grille
                gridelem.style.top = this.sizecell + 'px';
                gridelem.style.right = this.sizecell + 'px';
                gridelem.style.bottom = this.sizecell + 'px';
                gridelem.style.left = this.sizecell + 'px';
                // redimensionne les cellules
                for (c = 0; c < cc; c++) {
                    cellelems[c].style.height = this.sizecell + 'px';
                    cellelems[c].style.width = this.sizecell + 'px';
                    cellelems[c].style.lineHeight = this.sizecell + 'px';
                    cellelems[c].style.fontSize = fontsize + 'px';
                }
            }
            // place les commentaires
            if (this.viewmode == 'horizontal') {
                if (this.showcomments) {
                    gobanelem.style.margin = 0;
                } else {
                    gobanelem.style.margin = 'auto';
                }
                commentselem.style.top = comtop + 'px';
                commentselem.style.right = 0;
                commentselem.style.left = this.sizegoban + 'px';
            } else {
                gobanelem.style.margin = 'auto';
                commentselem.style.top =  this.sizegoban + comtop + 'px';
                commentselem.style.right = 0;
                commentselem.style.left = 0;
            }
        },//}}}

        emptyGoban: function () {//{{{
            var size = yygo.data.size;
            var coord = ['a','b','c','d','e','f','g','h','i','j',
            'k','l','m','n','o','p','q','r','s'];
            var cell, id, i, j;

            for (i = 0; i < size; i++) {
                for (j = 0; j < size; j++) {
                    id = coord[j] + coord[i];
                    cell = document.getElementById(id);
                    cell.className = 'cell';
                    cell.innerHTML = '';
                }
            }

            /* var oldb = document.getElementsByClassName('cellb');
            var oldw = document.getElementsByClassName('cellw');
            var olds = document.getElementsByTagName('svg');
            var cob = oldb.length;
            var cow = oldw.length;
            var cos = olds.length;
            var ob, ow, os;

            console.log(oldb);
            // enlever les anciennes pierres
            for (ob = 0; ob < cob; ob++) {
            oldb[ob].className = 'cell';
            }
            for (ow = 0; ow < cow; ow++) {
            oldw[ow].className = 'cell';
            }
            // effacer les anciens symboles
            for (os = 0; os < cos; os++) {
            olds[os].parentNode.removeChild(olds[os]);
            }*/
        },//}}}

        insertSymbolSvg: function (symbol, id, color) {//{{{
            var cell = document.getElementById(id);
            var svg = '<svg xmlns="http://www.w3.org/2000/svg"' +
                'version="1.1" viewBox="0 0 10 10">';

            if (symbol == 'CR') { // cercle
                svg += '<circle cx="5" cy="5" r="2.5"' +
                    'stroke-width="0.7" fill="none"';
            } else if (symbol == 'SQ') { // carré
                svg += '<rect x="1.8" y="1.8" width="6.5"' +
                    'height="6.5" stroke-width="0.7" fill="none"';
            } else if (symbol == 'TR') { // triangle
                svg += '<path d="M5 0.5 L8.8 7.4 L1.2 7.4 Z"' +
                    'stroke-width="0.7" fill="none"';
            }

            if (color == 'b') { // si pierre noire afficher en blanc
                svg += ' stroke="#fff"/></svg>';
            } else {
                svg += ' stroke="#000"/></svg>';
            }

            cell.innerHTML = svg;
        },//}}}

        placeStones: function () {//{{{
            var game = yygo.data.game;
            var curbranch = yygo.data.curbranch;
            var curnode = yygo.data.curnode;
            var bstones = game[curnode][curbranch]['b'].split(',');
            var wstones = game[curnode][curbranch]['w'].split(',');
            var cb = bstones.length;
            var cw = wstones.length;
            var b, w, cell;

            // lister et afficher les pierres de l'état actuel
            for (b = 0; b < cb; b++) {
                if (bstones[b] != '') {
                    cell = document.getElementById(bstones[b]);
                    cell.className += ' cellb';
                }
            }
            for (w = 0; w < cw; w++) {
                if (wstones[w] != '') {
                    cell = document.getElementById(wstones[w]);
                    cell.className += ' cellw';
                }
            }
        },//}}}

        placeSymbols: function () {//{{{
            var curbranch = yygo.data.curbranch;
            var curnode = yygo.data.curnode;
            var game = yygo.data.game;
            var symbols = yygo.data.symbols;
            var circles = [];
            var squares = [];
            var triangles = [];
            var labels = [];
            var label = [];
            var playedstone = [];
            var c, cc, s, cs, t, ct, l, cl, cell, color;

            // afficher les symboles de l'état actuel
            if (symbols != null && symbols[curnode] != null &&
            symbols[curnode][curbranch] != null) {
                if (symbols[curnode][curbranch]['CR'] != null) {
                    circles = symbols[curnode][curbranch]['CR'].split(','); 
                    cc = circles.length;
                    for (c = 0; c < cc; c++) {
                        cell = document.getElementById(circles[c]);
                        color = cell.className.substr(9);
                        this.insertSymbolSvg('CR', circles[c], color);
                    }
                }
                if (symbols[curnode][curbranch]['SQ'] != null) {
                    squares = symbols[curnode][curbranch]['SQ'].split(',');
                    cs = squares.length;
                    for (s = 0; s < cs; s++) {
                        cell = document.getElementById(squares[s]);
                        color = cell.className.substr(9);
                        this.insertSymbolSvg('SQ', squares[s], color);
                    }
                }
                if (symbols[curnode][curbranch]['TR'] != null) {
                    triangles = symbols[curnode][curbranch]['TR'].split(',');
                    ct = triangles.length;
                    for (t = 0; t < ct; t++) {
                        cell = document.getElementById(triangles[t]);
                        color = cell.className.substr(9);
                        this.insertSymbolSvg('TR', triangles[t], color);
                    }
                }
                if (symbols[curnode][curbranch]['LB'] != null) {
                    labels = symbols[curnode][curbranch]['LB'].split(',');
                    cl = labels.length;
                    for (l = 0; l < cl; l++) {
                        label = labels[l].split(':');
                        cell = document.getElementById(label[0]);
                        color = cell.className.substr(9);
                        if (color == '') {
                            cell.className += ' celle';
                        }
                        cell.title = label[1];
                        cell.textContent = label[1];
                    }
                }
            }

            // cercle pour indiquer la dernière pierre jouée
            if (game[curnode][curbranch]['p'] != null) {
                playedstone = game[curnode][curbranch]['p'].split(',');
                if (playedstone[1] != '') {
                    this.insertSymbolSvg('CR', playedstone[1], playedstone[0]);
                }
            }
        },//}}}

        setGobanSize: function () {//{{{
            var size = yygo.data.size;
            var winw = window.innerWidth;
            var winh = window.innerHeight;
            var heightleft = winh - 50;
            var oldsizegoban = this.sizegoban;
            var smaller;

            if (this.showvariations) {
                heightleft -= 20;
            }
            if (winw < heightleft) {
                this.viewmode = 'vertical';
                if (this.showcomments && heightleft - 150 <= winw) {
                    smaller = heightleft - 150;
                } else {
                    smaller = winw;
                }
            } else {
                this.viewmode = 'horizontal';
                if (this.showcomments && winw - 200 <= heightleft) {
                    smaller = winw - 200;
                } else {
                    smaller = heightleft;
                }
            }

            // calcul la taille en pixels du goban pour être un multiple de
            // sa taille en intersections, cela évite un affichage baveux du SVG
            this.sizecell = Math.floor(smaller / (size + 2));
            this.sizegoban = this.sizecell * (size + 2);

            // redessine si la taille a changé
            if (this.sizegoban != oldsizegoban) {
                this.drawGoban(true);
            } else {
                this.drawGoban(false);
            }
        },//}}}

        toggleBorders: function () {//{{{
            if (this.showborders) {
                $('#bordertop,#borderright,#borderbottom,#borderleft').show();
            } else {
                $('#bordertop,#borderright,#borderbottom,#borderleft').hide();
            }
        },//}}}

        toggleNavButtons: function () {//{{{
            var curnode = yygo.data.curnode;
            var lastnode = yygo.data.lastnode;

            $('[id$="prev"],#start,[id$="next"],#end').attr('class','button');

            if (curnode == 0) {
                $('[id$="prev"],#start').attr('class','buttond');
            }
            if (curnode == lastnode) {
                $('[id$="next"],#end').attr('class','buttond');
            }
        },//}}}

        toggleComments: function () {//{{{
            if (this.showcomments) {
                $('#comments').show();
            } else {
                $('#comments').hide();
            }
        },//}}}

        toggleVariations: function () {//{{{
            if (this.showvariations) {
                $('#variations').show();
            } else {
                $('#variations').hide();
            }
        },//}}}

    };//}}}

    yygo.events = {//{{{

        // propriétés

        mode:           'replay',
        screen:         'options',

        // méthodes

        init: function () {//{{{
            // TODO récupère les paramètres de l'utilisateur
            // langue du navigateur ou langue par défaut
            var navlang = (navigator.language ||
                navigator.systemLanguage ||
                navigator.userLanguage ||
                'en').substr(0, 2).toLowerCase();

            yygo.data.setLang(navlang, function () {
                // callback pour être sûr d'avoir chargé la langue
                yygo.events.makeBinds();
                // charge le goban d'intro
                jsonRequest('sgf.php?list=-1', function (data) {
                    yygo.data.gameslist = data;
                    yygo.events.loadGameFromList(0);
                    yygo.view.showborders = true;
                    yygo.data.gameslist = [];
                });
            });
        },//}}}

        loadGameFromList: function (number) {//{{{
            var oldsize = yygo.data.size;

            yygo.data.loadDataFromList(number);

            this.makeNavBinds();

            if (yygo.data.size != oldsize) { // nouvelle taille tout refaire
                yygo.view.makeGoban();
                yygo.view.changeGridImage();
            } else { // vider le goban seulement
                yygo.view.emptyGoban();
            }

            yygo.view.makeVariations();
            yygo.view.makeInfos();
            yygo.view.makeComments();

            yygo.view.placeStones();
            yygo.view.placeSymbols();

            this.mode = 'replay';
            this.screen = 'goban';

            yygo.view.changeScreen();

            yygo.view.toggleBorders();
            yygo.view.toggleVariations();
            yygo.view.toggleComments();

            yygo.view.setGobanSize();
        },//}}}

        makeBinds: function () {//{{{
            $(window).bind('resize', function () {
                yygo.view.setGobanSize()
            });

            // boutons de navigation
            this.makeNavBinds();

            // bouton commentaires
            $('#comment').bind('click', function () {
                if (yygo.view.showcomments) {
                    yygo.view.showcomments = false;
                    yygo.view.toggleComments();
                    yygo.view.setGobanSize();
                } else {
                    yygo.view.showcomments = true;
                    yygo.view.toggleComments();
                    yygo.view.setGobanSize();
                }
            });
            // bouton options
            $('#options').bind('click', function () {
                if (yygo.events.screen == 'goban') {
                    yygo.events.screen = 'options';
                    yygo.view.changeScreen();
                } else {
                    yygo.events.screen = 'goban';
                    yygo.view.changeScreen();
                }
            });
            // bouton de chargement liste
            $('#load').bind('click', function () {
                var htmllist = yygo.view.htmllist;


                // TODO prévoir rafraichissement, limiter les données affichées
                // afficher sur plusieurs pages

                if (htmllist == '') { // récupère la liste si non chargée
                    jsonRequest('sgf.php?list=0', function (data) {
                        yygo.data.gameslist = data;
                        yygo.view.makeGamesList();
                    });
                }

                if (yygo.events.screen == 'options') {
                    yygo.events.screen = 'list';
                    yygo.view.changeScreen();
                } else {
                    yygo.events.screen = 'options';
                    yygo.view.changeScreen();
                }
            });
            // bouton langues
            $('[class^="lang"]').bind('click', function () {
                var lang = $(this).attr('class').substr(4);

                yygo.data.setLang(lang);
            });
            // bouton envoi de fichier SGF
            $('#sendsgf').bind('click', function () {
                $('#sendinput input[type="file"]').trigger('click');
            });
            // boutons de variantes
            $('[id^="varbut"]').live('click', function () {
                var branch = $(this).attr('id').substr(6);

                yygo.data.curbranch = branch;
                yygo.data.lastbranch = branch;

                yygo.data.setLastNode();

                yygo.events.makeNavBinds();
                yygo.view.toggleNavButtons();

                yygo.view.makeVariations();
                yygo.view.makeComments();

                yygo.view.emptyGoban();
                yygo.view.placeStones();
                yygo.view.placeSymbols();

                yygo.view.toggleVariations();
            });
            // ligne de la liste de chargement
            $('#loadlist tr').live('click',function () {
                var number = $(this).index();

                yygo.events.loadGameFromList(number); 
            });
            // fichier à envoyer
            $('#sendinput input[type="file"]').bind('change', function () {
                $('#sendinput').submit();
            });
        },//}}}

        makeNavBinds: function () {//{{{
            var curnode = yygo.data.curnode;
            var lastnode = yygo.data.lastnode;

            $('#start,[id$="prev"],[id$="next"],#end').unbind();

            if (curnode > 0) {
                $('#start').bind('click', function () {
                    yygo.events.navigateNode(-999999)
                });
                $('#fastprev').bind('click', function () {
                    yygo.events.navigateNode(-10)
                });
                $('#prev').bind('click', function () {
                    yygo.events.navigateNode(-1)
                });
            }
            if (curnode < lastnode) {
                $('#next').bind('click', function () {
                    yygo.events.navigateNode(1)
                });
                $('#fastnext').bind('click', function () {
                    yygo.events.navigateNode(10)
                });
                $('#end').bind('click', function () {
                    yygo.events.navigateNode(999999)
                });
            }
        },//}}}

        navigateNode: function (move) {//{{{
            var game = yygo.data.game;
            var curbranch = yygo.data.curbranch;
            var curnode = yygo.data.curnode;
            var lastbranch = yygo.data.lastbranch;
            var lastnode = yygo.data.lastnode;
            var i;

            // défini le nouveau noeud actuel
            if (curnode + move < 0) {
                curnode = 0;
            } else if (curnode + move > lastnode) {
                curnode = lastnode;
            } else {
                curnode = curnode + move;
            }

            // défini la nouvelle branche actuelle
            if (move < 0 && game[curnode][curbranch] == null) {
                curbranch = yygo.data.getParentBranch(curnode, lastbranch);
            } else if (move > 0) {
                if (game[curnode][lastbranch] != null) { // dernière branche
                    curbranch = lastbranch;
                } else {
                    // cherche la première branche entre l'actuelle et la dernière
                    for (i = curbranch + 1; i < lastbranch; i++) {
                        if (game[curnode][i] != null) {
                            curbranch = i;
                            break;
                        }
                    }
                }
            }

            yygo.data.curbranch = curbranch;
            yygo.data.curnode = curnode;

            this.makeNavBinds();
            yygo.view.toggleNavButtons();

            yygo.view.makeVariations();
            yygo.view.makeComments();

            yygo.view.emptyGoban();
            yygo.view.placeStones();
            yygo.view.placeSymbols();

            yygo.view.toggleVariations();
        },//}}}

    };//}}}

    // initialisation quand le DOM est chargé (navigateurs récents)

    document.addEventListener("DOMContentLoaded", yygo.events.init(), false);

})();
