//yygo = window.yygo || {};
yygo = {};

yygo.data = {//{{{

    // propriétés

    gameslist:      [],
    langs:          ['en','fr'],

    comments:       {},
    game:           {},
    infos:          {},
    symbols:        {},

    lang:           'en',

    branchs:        0,
    size:           0,

    currentbranch:  0,
    currentnode:    0,
    lastbranch:     0,
    lastnode:       0,

    // méthodes

    // manipulations de variables

    getParentBranch: function (node, branch) {//{{{
        var i;

        for (i = branch; i >= 0; i--) {
            if (this.game[node] != null && this.game[node][i] != null) {
                return i;
            }
        }
        return 0;
    },//}}}

    setLastNode: function () {//{{{
        this.lastnode = this.currentnode;
        while (this.game[this.lastnode+1] != null &&
               this.game[this.lastnode+1][this.currentbranch] != null) {
            this.lastnode++;
        }
    },//}}}

    setLang: function (lang) {//{{{
        var ci = this.langs.length;
        var i;

        for (i = 0; i < ci; i++) {
            if (this.langs[i] == lang) {
                this.lang = lang;
            }
        }

        // récupère le script de la langue et traduit les éléments
        $.getScript('lang/' + this.lang + '.js', function () {
            yygo.view.changeLang();
        });
    },//}}}

    // initialisations

    loadDataFromList: function (number) {//{{{
        this.infos = $.parseJSON(this.gameslist[number]['infos']);
        this.comments = $.parseJSON(this.gameslist[number]['comments']);
        this.symbols = $.parseJSON(this.gameslist[number]['symbols']);
        this.game = $.parseJSON(this.gameslist[number]['game']);

        this.size = parseInt(this.infos['SZ'], 10);
        this.branchs = this.infos['branchs'];

        this.currentnode = 0;
        this.currentbranch = 0;
        this.lastbranch = 0;

        this.setLastNode();
    },//}}}

};//}}}

yygo.view = {//{{{

    // propriétés

    htmlborders:    '',
    htmlcomments:   '',
    htmlgoban:      '',
    htmlinfos:      '',
    htmllist:       '',
    htmlvariations: '',

    showborders:    true,
    showgoban:      true,
    showtextzone:   false,
    showvariations: false,

    sizeborders:    0,
    sizecell:       0,
    sizetextzone:   200,
    sizegoban:      0,

    // méthodes

    // manipulations de variables

    getCellColor: function (cell) {//{{{
        var game = yygo.data.game;
        var curbranch = yygo.data.currentbranch;
        var curnode = yygo.data.currentnode;
        var bstones = game[curnode][curbranch]['b'].split(',');
        var wstones = game[curnode][curbranch]['w'].split(',');
        var cb = bstones.length;
        var cw = wstones.length;
        var b, w;
        

        for (b = 0; b < cb; b++) {
            if (bstones[b] == cell) {
                return 'b';
            }
        }
        for (w = 0; w < cw; w++) {
            if (wstones[w] == cell) {
                return 'w';
            }
        }

        return ''; // pas de pierre
    },//}}}

    getCellSymbol: function (cell, color) {//{{{
        var curbranch = yygo.data.currentbranch;
        var curnode = yygo.data.currentnode;
        var game = yygo.data.game;
        var symbols = yygo.data.symbols;
        var circles = [];
        var squares = [];
        var triangles = [];
        var labels = [];
        var label = [];
        var playedstone = [];
        var c, cc, s, cs, t, ct, l, cl;

        if (symbols != null && symbols[curnode] != null &&
            symbols[curnode][curbranch] != null) {
            if (symbols[curnode][curbranch]['CR'] != null) {
                circles = symbols[curnode][curbranch]['CR'].split(','); 
                cc = circles.length;
                for (c = 0; c < cc; c++) {
                    if (circles[c] == cell) {
                        return '>' + this.getSymbolSvg('CR', color);
                    }
                }
            }
            if (symbols[curnode][curbranch]['SQ'] != null) {
                squares = symbols[curnode][curbranch]['SQ'].split(',');
                cs = squares.length;
                for (s = 0; s < cs; s++) {
                    if (squares[s] == cell) {
                        return '>' + this.getSymbolSvg('SQ', color);
                    }
                }
            }
            if (symbols[curnode][curbranch]['TR'] != null) {
                triangles = symbols[curnode][curbranch]['TR'].split(',');
                ct = triangles.length;
                for (t = 0; t < ct; t++) {
                    if (triangles[t] == cell) {
                        return '>' + this.getSymbolSvg('TR', color);
                    }
                }
            }
            if (symbols[curnode][curbranch]['LB'] != null) {
                labels = symbols[curnode][curbranch]['LB'].split(',');
                cl = labels.length;
                for (l = 0; l < cl; l++) {
                    label = labels[l].split(':');
                    if (label[0] == cell) {
                        return ' title="' + label[1] + '">' + label[1];
                    }
                }
            }
        }

        // cercle pour indiquer la dernière pierre jouée
        if (game[curnode][curbranch]['p'] != null) {
            playedstone = game[curnode][curbranch]['p'].split(',');
            if (playedstone[1] == cell) {
                return '>' + this.getSymbolSvg('CR', playedstone[0]);
            }
        }

        return '">'; // pas de symbole
    },//}}}

    getSymbolSvg: function (symbol, color) {//{{{
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

        return svg;
    },//}}}

    setGobanSize: function () {//{{{
        var size = yygo.data.size;
        var winw = $(window).width();
        var winh = $(window).height();    
        var heightleft = winh - 50;
        var oldsizegoban = this.sizegoban;
        var smaller;
        
        if (this.sizetextzone > winh / 2) {
            this.sizetextzone = winh / 2;
        }
        if (this.showtextzone) {
            heightleft -= this.sizetextzone;
        }
        if (this.showvariations) {
            heightleft -= 20;
        }
        if (winw < heightleft) {
            smaller = winw;
        } else {
            smaller = heightleft;
        }

        // calcul la taille en pixels du goban pour être un multiple de
        // sa taille en intersections, cela évite un affichage baveux du SVG
        if (this.showborders) { // ajouter les bordures si affichées
            this.sizecell = Math.floor(smaller / (size + 2));
            this.sizeborders = this.sizecell * (size + 2);
            this.sizegoban =  this.sizecell * size;
        } else {
            this.sizecell = Math.floor(smaller / size);
            this.sizeborders = this.sizecell * (size + 2);
            this.sizegoban =  this.sizecell * size;
        }

        // redessine le goban si la taille a changé
        if (this.sizegoban != oldsizegoban) {
            this.drawGoban(); 
        }
    },//}}}

    // construction code html

    makeBorders: function () {//{{{
        var size = yygo.data.size;
        var letters = ['A','B','C','D','E','F','G','H','J',
                       'K','L','M','N','O','P','Q','R','S','T'];
        var htmltop = '<div id="bordertop"><div class="cb"></div>';
        var htmlright = '<div id="borderright"><div class="cb"></div>';
        var htmlbottom = '<div id="borderbottom"><div class="cb"></div>';
        var htmlleft = '<div id="borderleft"><div class="cb"></div>';

        for (var i = 0; i < size; i++) {
            htmltop += '<div class="cb">' + letters[i] + '</div>';
            htmlright += '<div class="cb">' + (size - i) + '</div>';
            htmlbottom += '<div class="cb">' + letters[i] + '</div>';
            htmlleft += '<div class="cb">' + (size - i) + '</div>';
        }

        htmltop += '</div>';
        htmlright += '</div>';
        htmlbottom += '</div>';
        htmlleft += '</div>';

        this.htmlborders = htmltop + htmlright + htmlbottom + htmlleft;

        $('#borders').html(this.htmlborders);
    },//}}}

    makeComments: function () {//{{{
        var comments = yygo.data.comments;
        var curnode = yygo.data.currentnode;
        var curbranch = yygo.data.currentbranch;
        var html = '';

        if (comments != null && comments[curnode] != null &&
            comments[curnode][curbranch] != null) {
            html = '<p>';
            html += comments[curnode][curbranch];
            html += '</p>';
        }

        this.htmlcomments = html;

        $('#comments').html(this.htmlcomments);
    },//}}}

    makeGoban: function () {//{{{
        var size = yygo.data.size;
        var cell = '';
        var coord = ['a','b','c','d','e','f','g','h','i','j',
                     'k','l','m','n','o','p','q','r','s'];
        var html = '';
        var color = '';
        var i, j;

        // TODO faire les pierres et symboles séparément
        for (i = 0; i < size; i++) {
            html += '<div>'; // début de ligne
            for (j = 0; j < size; j++) {
                cell = coord[j] + coord[i];
                html += '<div class="cell'; // début de cellule
                color = this.getCellColor(cell)
                html += color;
                html += '" id="' + cell + '"';
                html += this.getCellSymbol(cell, color);
                html += '</div>'; // fin de cellule
            }
            html += '</div>'; // fin de ligne
        }

        this.htmlgoban = html;

        $('#goban').html(this.htmlgoban);
    },//}}}

    makeGamesList: function () {//{{{
        var gameslist = yygo.data.gameslist;
        var html = '<table>';
        var infos = {};
        var ci = gameslist.length;
        var i;

        for (i = 0; i < ci; i ++) {
            infos = $.parseJSON(gameslist[i]['infos']);

            html += '<tr><td>' + gameslist[i]['file'] + '</td>';

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

        $('#loadlist').html(this.htmllist);
    },//}}}

    makeInfos: function () {//{{{
        var infos = yygo.data.infos;
        var locale = yygo.data.locale;
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

        $('#infos').html(this.htmlinfos);
    },//}}}

    makeTextzone: function () {//{{{
        if (yygo.data.infos != null) {
            this.createInfosHtml();
        }
        if (yygo.data.comments != null) {
            this.createCommentsHtml();
        }
    },//}}}

    makeVariations: function () {//{{{
        var game = yygo.data.game;
        var curbranch = yygo.data.currentbranch;
        var curnode = yygo.data.currentnode;
        var branchs = yygo.data.branchs;
        var pbranch = yygo.data.getParentBranch(curnode - 1, curbranch);
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
                $('#variations').html(this.htmlvariations);
            }
        } else { // pas de variantes
            // masquer la barre de variantes si affichée
            if (this.showvariations) {
                this.showvariations = false;
            }
        }
    },//}}}

    // affichage

    changeGobanImage: function () {//{{{
        $('#goban').css('background',
                        'url(images/' + yygo.data.size + '.svg)');
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

        if (yygo.data.infos != null) {
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
        var all = '[id$="buttons"],#variations,#borders,#goban,' +
                  '#textzone,#comments,#infos,#loadlist';
        var replay = '#navbuttons,#utibuttons,#variations,#borders,' +
                     '#goban,#textzone,#comments';
        var options = '#optbuttons,#utibuttons,#textzone,#infos';
        var list = '#optbuttons,#loadlist';

        $(all).hide();

        if (screen == 'goban') {
            if (mode == 'replay') {
                $(replay).show();
                this.toggleNavButtons();
                this.toggleVariations();
                this.toggleTextzone();
            }
            // TODO autres modes
        } else if (screen == 'options') {
            $(options).show();
            this.toggleTextzone();
        } else if (screen == 'list' || screen == 'intro') {
            $(list).show();
        }
    },//}}}

    drawGoban: function () {//{{{
        var gobantop = 50;

        if (this.showvariations) {
            gobantop += 20;
        }
        if (this.showborders) {
            gobantop += this.sizecell;
            $('#textzone').css('top', this.sizeborders + 50);
        } else {
            $('#textzone').css('top', this.sizegoban + 50);
        }

        $('#borders').css({
            height: this.sizeborders,
            width: this.sizeborders
        });

        $('#goban').css({
            top: gobantop,
            marginLeft: - this.sizegoban / 2,
            height: this.sizegoban,
            width: this.sizegoban
        });

        $('#goban div,.cb').css('height', this.sizecell);
        $('[class^="cell"],.cb').css({
            width: this.sizecell,
            lineHeight: this.sizecell + 'px',
            fontSize: this.sizecell / 1.5
        });
    },//}}}

    toggleBorders: function () {//{{{
        if (this.showborders) {
            $('#borders').show();
            this.setGobanSize();
        } else {
            $('#borders').hide();
            this.setGobanSize();
        }
    },//}}}

    toggleGoban: function () {//{{{
        if (this.showgoban) {
            $('#goban').show();
        } else {
            $('#goban').hide();
        }
    },//}}}

    toggleNavButtons: function () {//{{{
        var curnode = yygo.data.currentnode;
        var lastnode = yygo.data.lastnode;

        $('[id$="prev"],#start,[id$="next"],#end').attr('class','button');

        if (curnode == 0) {
            $('[id$="prev"],#start').attr('class','buttond');
        }
        if (curnode == lastnode) {
            $('[id$="next"],#end').attr('class','buttond');
        }
    },//}}}

    toggleTextzone: function () {//{{{
        if (this.showtextzone) {
            $('#textzone').show();
            this.setGobanSize();
        } else {
            $('#textzone').hide();
            this.setGobanSize();
        }
    },//}}}

    toggleVariations: function () {//{{{
        if (this.showvariations) {
            $('#variations').show();
            this.setGobanSize();
        } else {
            $('#variations').hide();
            this.setGobanSize();
        }
    },//}}}
 
};//}}}

yygo.events = {//{{{

    // propriétés

    mode:           'replay',
    screen:         'options',

    // méthodes

    loadGameFromList: function (number) {//{{{
        var oldsize = yygo.data.size;

        console.time('test');

        yygo.data.loadDataFromList(number);

        this.makeNavBinds();

        if (yygo.data.size != oldsize) {
            yygo.view.makeBorders();
            yygo.view.changeGobanImage();
        }

        yygo.view.makeGoban();
        yygo.view.makeVariations();
        yygo.view.makeInfos();
        yygo.view.makeComments();

        this.mode = 'replay';
        this.screen = 'goban';
    
        yygo.view.changeScreen();

        yygo.view.toggleBorders();
        yygo.view.toggleGoban();
        yygo.view.toggleVariations();
        yygo.view.toggleTextzone();

        yygo.view.setGobanSize();

        
        console.timeEnd('test');
    },//}}}

    makeBinds: function () {//{{{
        $(window).bind('resize', function () {
            yygo.view.setGobanSize()
        });
        $('#resizer').bind('mousedown', function (e) {
            // ref: http://bit.ly/gwL00h
            var winh = $(window).height();
            var sizebefore = yygo.view.sizetextzone;
            var cursory = winh - e.clientY;
            var moveHandler = function (e) {
                var sizeafter;

                sizeafter = Math.max(100, winh - e.clientY + sizebefore - cursory); 
                if (sizeafter > winh / 2) {
                    sizeafter = winh / 2;
                }
                yygo.view.sizetextzone = sizeafter;
                yygo.view.setGobanSize();
            };
            var upHandler = function (e) {
                $('html').unbind('mousemove', moveHandler)
                .unbind('mouseup', upHandler);
            };

            $('html').bind('mousemove', moveHandler).bind('mouseup', upHandler);
        });

        // boutons de navigation
        this.makeNavBinds();

        // bouton textzone
        $('#comment').bind('click', function () {
            if (yygo.view.showtextzone) {
                yygo.view.showtextzone = false;
                yygo.view.toggleTextzone();
            } else {
                yygo.view.showtextzone = true;
                yygo.view.toggleTextzone();
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
                $.getJSON('sgf.php', {list:'0'}, function (data) { 
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

            yygo.data.currentbranch = branch;
            yygo.data.lastbranch = branch;

            yygo.data.setLastNode();

            this.makeNavBinds();
            yygo.view.toggleNavButtons();

            yygo.view.makeVariations();
            yygo.view.makeGoban();
            yygo.view.makeComments();

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
        var curnode = yygo.data.currentnode;
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
            console.log("bindtest");
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
        var curbranch = yygo.data.currentbranch;
        var curnode = yygo.data.currentnode;
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

        yygo.data.currentbranch = curbranch;
        yygo.data.currentnode = curnode;

        this.makeNavBinds();
        yygo.view.toggleNavButtons();

        yygo.view.makeVariations();
        yygo.view.makeGoban();
        yygo.view.makeComments();

        yygo.view.toggleVariations();
    },//}}}

};//}}}

jQuery(document).ready(function ($) {

    /*
     * PLUGINS JQUERY
     */

    // désactive la sélection d'éléments
    $.fn.disableSelection = function () {//{{{
        return this.each(function () {           
            $(this).attr('unselectable', 'on')
            .css({
                '-moz-user-select':'none',
                '-webkit-user-select':'none',
                'user-select':'none',
                '-ms-user-select':'none'
            })
            .each(function () {
                this.onselectstart = function () {
                    return false;
                };
            });
        });
    };//}}}

    /*
     * INITIALISATION
     */

    // TODO récupère les paramètres de l'utilisateur

    // langue du navigateur ou langue par défaut
    var navlang = navigator.language.substr(0,2);

    yygo.data.setLang(navlang);

    yygo.events.makeBinds();

    yygo.view.changeScreen();
    $('#borders,#goban,#resizer').disableSelection();

    // charge le goban d'intro
    /*$.getJSON('sgf.php',{list:'-1'},function (data) {
        yygo.data.gameslist = data;
        yygo.events.loadGameFromList(0);

        yygo.view.changeScreen();

        yygo.data.gameslist = [];
    });*/

});
