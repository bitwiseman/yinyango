var yygo = {}; // espace de nom yygo

(function () {
    'use strict';

    // fonctions utilitaires

    function jsonRequest(url, callback) {//{{{
        // requête ajax simple qui retourne un JSON
        var xhr = new XMLHttpRequest(); // ignorer vieux IE

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 &&
                    (xhr.status === 200 || xhr.status === 0)) {
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

    // création de yygo

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
            var game = this.game,
                i;

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
            var langs = this.langs,
                i;

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

        comtoshow:      false,
        redraw:         false,
        showborders:    false,
        showcomments:   true,

        sizecell:       0,
        sizegoban:      0,

        // méthodes

        // construction code html

        makeGoban: function () {//{{{
            // création du code HTML du goban
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

            // création des bordures
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

            // insère les bordures et la grille dans l'élément 'goban'
            html = btop + bright + bbottom + bleft +
                   '<div id="grid">' + this.makeGrid()  + '</div>';

            gobanelem.innerHTML = html;
        },//}}}

        makeComments: function () {//{{{
            var comments =      yygo.data.comments || {},
                curnode =       yygo.data.curnode,
                curbranch =     yygo.data.curbranch,
                commentselem =  document.getElementById('comments'),
                html =          '';

            if (!isEmpty(comments) && comments[curnode] !== undefined &&
                    comments[curnode][curbranch] !== undefined) {
                html = '<p>';
                html += comments[curnode][curbranch];
                html += '</p>';

                if (this.comtoshow === false) {
                    this.comtoshow = true;
                    this.setGobanSize();
                }
            } else {
                if (this.comtoshow === true) {
                    this.comtoshow = false;
                    this.setGobanSize();
                }
            }

            this.htmlcomments = html;
            commentselem.innerHTML = this.htmlcomments;

            this.toggleComments();
        },//}}}

        makeGrid: function () {//{{{
            var size =      yygo.data.size,
                coord =     ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                            'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'],
                html =      '',
                cell,
                i,
                j;

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
            var gameslist =     yygo.data.gameslist,
                loadlistelem =  document.getElementById('loadlist'),
                html =          '<table id="gameslist">',
                infos =         {},
                ci =            gameslist.length,
                i;

            for (i = 0; i < ci; i++) {
                infos = JSON.parse(gameslist[i].infos);

                html += '<tr><td>' + gameslist[i].file + '</td>';

                if (infos.PB !== undefined) {
                    html += '<td>' + infos.PB + '</td>';
                } else {
                    html += '<td></td>';
                }
                if (infos.PW !== undefined) {
                    html += '<td>' + infos.PW + '</td>';
                } else {
                    html += '<td></td>';
                }
                if (infos.DT !== undefined) {
                    html += '<td>' + infos.DT + '</td>';
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
            var infos =         yygo.data.infos,
                locale =        yygo.data.locale,
                infoselem =     document.getElementById('infos'),
                html =          '<p>';

            if (infos.PB !== undefined) {
                html += '<em>' + locale.black + ':</em> ' + infos.PB;
            }
            if (infos.BR !== undefined) {
                html += ' [' + infos.BR + ']';
            }
            if (infos.PW !== undefined) {
                html += ' <br /><em>' + locale.white + ':</em> ' + infos.PW;
            }
            if (infos.WR !== undefined) {
                html += ' [' + infos.WR + ']';
            }
            if (infos.DT !== undefined) {
                html += ' <br /><em>' + locale.date + ':</em> ' + infos.DT;
            }
            if (infos.PC !== undefined) {
                html += ' <br /><em>' + locale.place + ':</em> ' + infos.PC;
            }
            if (infos.RU !== undefined) {
                html += ' <br /><em>' + locale.rules + ':</em> ' + infos.RU;
            }

            html += '</p>';

            this.htmlinfos = html;

            infoselem.innerHTML = this.htmlinfos;
        },//}}}

        makeVariations: function () {//{{{
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

            // cherche la branche parent de la branche actuelle
            // du noeud précédent
            pbranch = yygo.data.getParentBranch(curnode - 1, curbranch);

            for (i = 0; i < branchs; i++) {
                if (game[curnode][i] !== undefined && curnode > 0) {
                    // cherche la branche parent d'une autre branche
                    // du noeud précédent
                    opbranch = yygo.data.getParentBranch(curnode - 1, i);
                    if (opbranch === pbranch) {
                        // si les branches parents correspondent alors
                        // c'est une variante
                        variations++;
                        if (i === curbranch) { // variante actuelle
                            html += '<div id="varbua' + i + '"></div>';
                        } else { // autre variante
                            html += '<div id="varbut' + i + '"></div>';
                            binds.push(i);
                        }
                    }
                }
            }

            if (variations <= 1) { // pas de variantes, effacer le code HTML
                html = '';
            }

            this.htmlvariations = html;
            variationselem.innerHTML = this.htmlvariations;

            if (this.htmlvariations !== '') {
                // lier les boutons à leur variante respective
                yygo.events.makeVariationsBinds(binds);
            }
        },//}}}

        // affichage

        changeGridImage: function () {//{{{
            var grid = document.getElementById('grid');

            grid.style.background = 'url(images/' + yygo.data.size + '.svg)';
        },//}}}

        changeLang: function () {//{{{
            var locale =    yygo.data.locale,
                lang =      yygo.data.lang,
                langs =     document.getElementsByClassName('lang'),
                cl =        langs.length,
                l;

            // étiquettes des boutons
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
            document.getElementById('options').title =  locale.options;
            document.getElementById('sendsgf').title =  locale.sendsgf;
            document.getElementById('downsgf').title =  locale.downsgf;

            if (!isEmpty(yygo.data.infos)) {
                this.makeInfos(); // réécris le code HTML des infos
            }

            // change l'apparence du bouton pour prendre celle de la langue
            document.getElementById('lang').className = 'button' + lang;
            for (l = 0; l < cl; l++) {
                langs[l].style.display = 'block';
            }
            document.getElementById('lang' + lang).style.display = 'none';
        },//}}}

        changeScreen: function () {//{{{
            var mode =          yygo.events.mode,
                screen =        yygo.events.screen,
                navbuttons =    document.getElementById('navbuttons'),
                optbuttons =    document.getElementById('optbuttons'),
                gobbuttons =    document.getElementById('gobbuttons'),
                options =       document.getElementById('options'),
                variations =    document.getElementById('variations'),
                goban =         document.getElementById('goban'),
                comments =      document.getElementById('comments'),
                infos =         document.getElementById('infos'),
                loadlist =      document.getElementById('loadlist');

            if (screen === 'goban') {
                optbuttons.style.display = 'none';
                infos.style.display = 'none';
                loadlist.style.display = 'none';

                gobbuttons.style.display = 'block';
                options.style.display = 'block';
                variations.style.display = 'block';
                goban.className = '';
                if (mode === 'replay') {
                    navbuttons.style.display = 'block';
                }
                // TODO autres modes
            } else if (screen === 'options') {
                navbuttons.style.display = 'none';
                gobbuttons.style.display = 'none';
                variations.style.display = 'none';
                goban.className = 'hide'; // déplace plus rapide
                comments.style.display = 'none';
                loadlist.style.display = 'none';

                optbuttons.style.display = 'block';
                options.style.display = 'block';
                infos.style.display = 'block';
            } else if (screen === 'list') {
                options.style.display = 'none';
                goban.className = 'hide'; // déplace plus rapide
                infos.style.display = 'none';

                loadlist.style.display = 'block';
            } else if (screen === 'intro') {
                // TODO
            }
        },//}}}

        drawGoban: function (redraw) {//{{{
            var commentselem =  document.getElementById('comments'),
                gobanelem =     document.getElementById('goban'),
                gridelem =      document.getElementById('grid'),
                cellelems =     document.getElementsByClassName('cell'),
                cc =            cellelems.length,
                fontsize =      this.sizecell / 1.5,
                comtop =        70,
                c;

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
            if (this.viewmode === 'horizontal') {
                if (this.showcomments && this.comtoshow) {
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
        },//}}}

        insertSymbolSvg: function (symbol, id, color) {//{{{
            var cell =  document.getElementById(id),
                svg =   '<svg xmlns="http://www.w3.org/2000/svg"' +
                        'version="1.1" viewBox="0 0 10 10">';

            if (symbol === 'CR') { // cercle
                svg += '<circle cx="5" cy="5" r="2.5"' +
                    'stroke-width="0.7" fill="none"';
            } else if (symbol === 'SQ') { // carré
                svg += '<rect x="1.8" y="1.8" width="6.5"' +
                    'height="6.5" stroke-width="0.7" fill="none"';
            } else if (symbol === 'TR') { // triangle
                svg += '<path d="M5 0.5 L8.8 7.4 L1.2 7.4 Z"' +
                    'stroke-width="0.7" fill="none"';
            }

            if (color === 'b') { // si pierre noire afficher en blanc
                svg += ' stroke="#fff"/></svg>';
            } else {
                svg += ' stroke="#000"/></svg>';
            }

            cell.innerHTML = svg;
        },//}}}

        placeStones: function () {//{{{
            var game =          yygo.data.game,
                curbranch =     yygo.data.curbranch,
                curnode =       yygo.data.curnode,
                bstones =       game[curnode][curbranch].b.split(','),
                wstones =       game[curnode][curbranch].w.split(','),
                cb =            bstones.length,
                cw =            wstones.length,
                cell,
                b,
                w;

            // lister et afficher les pierres de l'état actuel
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
        },//}}}

        placeSymbols: function () {//{{{
            var curbranch =     yygo.data.curbranch,
                curnode =       yygo.data.curnode,
                game =          yygo.data.game,
                symbols =       yygo.data.symbols || {},
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

            // afficher les symboles de l'état actuel
            if (!isEmpty(symbols) && symbols[curnode] !== undefined &&
                    symbols[curnode][curbranch] !== undefined) {
                if (symbols[curnode][curbranch].CR !== undefined) {
                    circles = symbols[curnode][curbranch].CR.split(',');
                    cc = circles.length;
                    for (c = 0; c < cc; c++) {
                        cell = document.getElementById(circles[c]);
                        color = cell.className.substr(9);
                        this.insertSymbolSvg('CR', circles[c], color);
                    }
                }
                if (symbols[curnode][curbranch].SQ !== undefined) {
                    squares = symbols[curnode][curbranch].SQ.split(',');
                    cs = squares.length;
                    for (s = 0; s < cs; s++) {
                        cell = document.getElementById(squares[s]);
                        color = cell.className.substr(9);
                        this.insertSymbolSvg('SQ', squares[s], color);
                    }
                }
                if (symbols[curnode][curbranch].TR !== undefined) {
                    triangles = symbols[curnode][curbranch].TR.split(',');
                    ct = triangles.length;
                    for (t = 0; t < ct; t++) {
                        cell = document.getElementById(triangles[t]);
                        color = cell.className.substr(9);
                        this.insertSymbolSvg('TR', triangles[t], color);
                    }
                }
                if (symbols[curnode][curbranch].LB !== undefined) {
                    labels = symbols[curnode][curbranch].LB.split(',');
                    cl = labels.length;
                    for (l = 0; l < cl; l++) {
                        label = labels[l].split(':');
                        cell = document.getElementById(label[0]);
                        color = cell.className.substr(9);
                        if (color === '') {
                            cell.className += ' celle';
                        }
                        cell.title = label[1];
                        cell.textContent = label[1];
                    }
                }
            }

            // cercle pour indiquer la dernière pierre jouée
            if (game[curnode][curbranch].p !== undefined) {
                playedstone = game[curnode][curbranch].p.split(',');
                if (playedstone[1] !== '') {
                    this.insertSymbolSvg('CR', playedstone[1], playedstone[0]);
                }
            }
        },//}}}

        setGobanSize: function () {//{{{
            var size =          yygo.data.size,
                winw =          window.innerWidth,
                winh =          window.innerHeight,
                heightleft =    winh - 70,
                oldsizegoban =  this.sizegoban,
                smaller;

            if (winw < heightleft) {
                this.viewmode = 'vertical';
                if (this.showcomments && this.comtoshow &&
                        heightleft - 150 <= winw) {
                    smaller = heightleft - 150;
                } else {
                    smaller = winw;
                }
            } else {
                this.viewmode = 'horizontal';
                if (this.showcomments && this.comtoshow &&
                        winw - 200 <= heightleft) {
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
            if (this.sizegoban !== oldsizegoban || this.redraw) {
                if (this.redraw) {
                    this.redraw = false;
                }
                this.drawGoban(true);
            } else {
                this.drawGoban(false);
            }
        },//}}}

        toggleBorders: function () {//{{{
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
        },//}}}

        toggleNavButtons: function () {//{{{
            var curnode =   yygo.data.curnode,
                lastnode =  yygo.data.lastnode,
                start =     document.getElementById('start'),
                prev =      document.getElementById('prev'),
                fastprev =  document.getElementById('fastprev'),
                next =      document.getElementById('next'),
                fastnext =  document.getElementById('fastnext'),
                end =       document.getElementById('end');

            start.className = 'button';
            prev.className = 'button';
            fastprev.className = 'button';
            next.className = 'button';
            fastnext.className = 'button';
            end.className = 'button';

            if (curnode === 0) {
                start.className = 'buttond';
                prev.className = 'buttond';
                fastprev.className = 'buttond';
            }
            if (curnode === lastnode) {
                next.className = 'buttond';
                fastnext.className = 'buttond';
                end.className = 'buttond';
            }
        },//}}}

        toggleComments: function () {//{{{
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
        }//}}}

    };//}}}

    yygo.events = {//{{{

        // propriétés

        mode:           'replay',
        screen:         'options',

        // méthodes

        init: function () {//{{{
            var navlang =   (navigator.language ||
                            navigator.systemLanguage ||
                            navigator.userLanguage ||
                            'en').substr(0, 2).toLowerCase();

            // TODO récupère les paramètres de l'utilisateur

            yygo.data.setLang(navlang, function () {
                // callback pour être sûr d'avoir chargé la langue
                yygo.events.makeBinds();
                // charge le goban d'intro
                jsonRequest('sgf.php?list=-1', function (data) {
                    yygo.data.gameslist = data;
                    yygo.events.loadGameFromList(0);
                    yygo.data.gameslist = [];
                });
            });
        },//}}}

        loadGameFromList: function (number) {//{{{
            var oldsize = yygo.data.size;

            yygo.data.loadDataFromList(number);

            if (yygo.data.size !== oldsize) { // nouvelle taille tout refaire
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
            yygo.view.toggleNavButtons();

            yygo.view.redraw = true;
            yygo.view.setGobanSize();
        },//}}}

        loadList: function () {//{{{
            var htmllist = yygo.view.htmllist;

            // TODO prévoir rafraichissement, limiter les données affichées
            // afficher sur plusieurs pages

            if (htmllist === '') { // récupère la liste si non chargée
                jsonRequest('sgf.php?list=0', function (data) {
                    yygo.data.gameslist = data;
                    yygo.view.makeGamesList();
                    yygo.events.makeListBinds();
                });
            }

            if (yygo.events.screen === 'options') {
                yygo.events.screen = 'list';
                yygo.view.changeScreen();
            } else {
                yygo.events.screen = 'options';
                yygo.view.changeScreen();
            }
        },//}}}

        makeBinds: function () {//{{{
            var comment =   document.getElementById('comment'),
                border =    document.getElementById('border'),
                options =   document.getElementById('options'),
                load =      document.getElementById('load'),
                langen =    document.getElementById('langen'),
                langfr =    document.getElementById('langfr'),
                sendsgf =   document.getElementById('sendsgf'),
                selfile =   document.getElementById('selfile'),
                sendinput = document.getElementById('sendinput'),
                start =     document.getElementById('start'),
                fastprev =  document.getElementById('fastprev'),
                prev =      document.getElementById('prev'),
                next =      document.getElementById('next'),
                fastnext =  document.getElementById('fastnext'),
                end =       document.getElementById('end');

            // redimensionnement de la fenêtre
            window.addEventListener('resize', function () {
                yygo.view.setGobanSize();
            }, false);
            // clic bouton commentaires
            comment.addEventListener('click', function () {
                yygo.events.clickComments();
            }, false);
            // clic bouton bordures
            border.addEventListener('click', function () {
                yygo.events.clickBorders();
            }, false);
            // clic bouton options
            options.addEventListener('click', function () {
                yygo.events.clickOptions();
            }, false);
            // clic bouton de chargement liste
            load.addEventListener('click', function () {
                yygo.events.loadList();
            }, false);
            // clic boutons langues
            langen.addEventListener('click', function () {
                yygo.data.setLang('en');
            }, false);
            langfr.addEventListener('click', function () {
                yygo.data.setLang('fr');
            }, false);
            // clic bouton envoi de fichier SGF
            sendsgf.addEventListener('click', function () {
                selfile.click();
            }, false);
            selfile.addEventListener('change', function () {
                sendinput.submit();
            }, false);
            // boutons de navigation
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
        },//}}}

        makeListBinds: function () {//{{{
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
        },//}}}

        makeVariationsBinds: function (binds) {//{{{
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
        },//}}}

        navigateNode: function (move) {//{{{
            var game =          yygo.data.game,
                curbranch =     yygo.data.curbranch,
                curnode =       yygo.data.curnode,
                lastbranch =    yygo.data.lastbranch,
                lastnode =      yygo.data.lastnode,
                lastbranchp,
                i;

            // défini le nouveau noeud actuel
            if (curnode + move < 0) {
                curnode = 0;
            } else if (curnode + move > lastnode) {
                curnode = lastnode;
            } else {
                curnode = curnode + move;
            }

            lastbranchp = yygo.data.getParentBranch(curnode, lastbranch);

            // défini la nouvelle branche actuelle
            if (move < 0 && game[curnode][curbranch] === undefined) {
                // branche parent de la dernière
                curbranch = lastbranchp;
            } else if (move > 0) {
                if (game[curnode][lastbranch] !== undefined) {
                    // dernière branche
                    curbranch = lastbranch;
                } else {
                    // cherche la branche menant à la dernière
                    for (i = curbranch + 1; i < lastbranch; i++) {
                        if (game[curnode][i] !== undefined &&
                                lastbranchp === i) {
                            curbranch = i;
                            break;
                        }
                    }
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
        },//}}}

        clickBorders: function () {//{{{
            if (yygo.view.showborders) {
                yygo.view.showborders = false;
                yygo.view.toggleBorders();
            } else {
                yygo.view.showborders = true;
                yygo.view.toggleBorders();
            }
        },//}}}

        clickComments: function () {//{{{
            if (yygo.view.showcomments && yygo.view.comtoshow) {
                yygo.view.showcomments = false;
                yygo.view.toggleComments();
                yygo.view.setGobanSize();
            } else if (yygo.view.comtoshow) {
                yygo.view.showcomments = true;
                yygo.view.toggleComments();
                yygo.view.setGobanSize();
            }
        },//}}}

        clickOptions: function () {//{{{
            if (yygo.events.screen === 'goban') {
                yygo.events.screen = 'options';
                yygo.view.changeScreen();
            } else {
                yygo.events.screen = 'goban';
                yygo.view.changeScreen();
            }
        }//}}}

    };//}}}

    // initialisation quand le DOM est chargé (navigateurs récents)

    document.addEventListener('DOMContentLoaded', yygo.events.init(), false);

}());
