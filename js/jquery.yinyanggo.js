yygo = window.yygo || {};

// données
yygo.data = {//{{{

    // propriétés

    gameslist:      [],
    langs:          ['en','fr'],

    comments:       {},
    game:           {},
    infos:          {},
    symbols:        {},

    lang:           'en',
    mode:           'replay',

    branchs:        0,
    size:           0,

    currentbranch:  0,
    currentnode:    0,
    lastbranch:     0,
    lastnode:       0,

    // méthodes

    // défini la branche actuelle en fonction de la dernière branche
    setCurrentBranch: function () {//{{{
        if (this.game[this.currentnode][this.lastbranch] != null) {
            this.currentbranch = this.lastbranch;
        } else {
            for (var i = this.currentbranch+1; i < this.lastbranch; i ++) {
                if (this.game[this.currentnode][i] != null) {
                    this.currentbranch = i;
                    break;
                }
            }
        }
    }//}}}

    // défini le dernier noeud de la branche actuelle
    setLastNode: function () {//{{{
        this.lastnode = this.currentnode;
        while (this.game[this.lastnode+1] != null &&
               this.game[this.lastnode+1][this.currentbranch] != null) {
            this.lastnode++;
        }
    },//}}}

    // retourne la branche parent d'une branche
    getParentBranch: function (node, branch) {//{{{
        for (var i = branch; i >= 0; i--) {
            if (this.game[node] != null && this.game[node][i] != null) {
                return i;
            }
        }
        return 0;
    },//}}}

    // défini la langue
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

    // charge les données de la partie de la liste
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

// affichage
yygo.view = {//{{{

    // propriétés

    htmlborders:    '',
    htmlcomments:   '',
    htmlgoban:      '',
    htmlinfos:      '',

    showborders:    true,
    showlist:       false,
    showoptions:    false,
    showtextzone:   false,
    showvariations: false,

    sizecell:       0,
    sizetextzone:   200,
    sizegoban:      0,

    // méthodes

    // retourne la couleur de pierre de la cellule
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

    // retourne le symbol présent dans la cellule
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

        return ''; // pas de symbole
    },//}}}

    // retourne un symbole SVG
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

    // modifie les éléments impactés par un changement de langue
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
            this.createInfosHtml(); // réécris le code HTML des infos
        }

        // change l'apparence du bouton pour prendre celle de la langue
        $('#lang').attr('class', 'button' + lang);
        $('[class^="lang"]').show();
        $('.lang' + lang).hide();
    },//}}}

    // ajuste l'interface en fonction de la fenêtre du navigateur
    resizeInterface: function (force) {//{{{
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
        // sa taille en intersections. cela évite un affichage baveux du SVG
        if (this.showborders) { // ajouter les bordures si affichées
            this.sizecell = Math.floor(smaller / (size + 2));
            this.sizeborders = this.sizecell * (size + 2);
            this.sizegoban =  this.sizecell * size;
        } else {
            this.sizecell = Math.floor(smaller / size);
            this.sizeborders = this.sizecell * (size + 2);
            this.sizegoban =  this.sizecell * size;
        }


        // redessine le goban si la taille a changé ou si forcé
        if (this.sizegoban != oldsizegoban || force) {
            if (vari) {
                $('#textzone').css('top', sizegoban + 70);
            } else {
                $('#textzone').css('top', sizegoban + 50);
            }
            $('#goban').css({
                height: sizegoban,
                width: sizegoban
            });
            $('#goban div').css('height', sizegoban / sizeb);
            $('[class^="cell"]').css({
                width: sizegoban / sizeb,
                lineHeight: sizegoban / sizeb + 'px',
                fontSize: sizegoban / sizeb / 1.5
            });
        }
        
        // redessine la zone de texte
        $('#comments,#infos').css('height', $('#textzone').outerHeight() - 6);
    }//}}}

    // création du code HTML des bordures du goban
    createBordersHtml: function () {//{{{
        var size = yygo.data.size;
        var letters = ['A','B','C','D','E','F','G','H','J',
                       'K','L','M','N','O','P','Q','R','S','T'];
        var htmltop = '<div id="bordertop">';
        var htmlright = '<div id="borderright">';
        var htmlbottom = '<div id="borderbottom">';
        var htmlleft = '<div id="borderleft">';

        for (var i = 0; i < size; i++) {
            htmltop += '<div>' + letters[i] + '</div>';
            htmlright += '<div>' + (size - i) + '</div>';
            htmlbottom += '<div>' + letters[i] + '</div>';
            htmlleft += '<div>' + (size - i) + '</div>';
        }

        htmltop += '</div>';
        htmlright += '</div>';
        htmlbottom += '</div>';
        htmlleft += '</div>';

        this.htmlborders = htmltop + htmlright + htmlbottom + htmlleft;

        this.insertBorders();
    },//}}}

    // création du code HTML du goban
    createGobanHtml: function () {//{{{
        var size = yygo.data.size;
        var cell = '';
        var coord = ['a','b','c','d','e','f','g','h','i','j',
                     'k','l','m','n','o','p','q','r','s'];
        var html = '';
        var color = '';
        var i, j;

        for (i = 0; i < size; i++) {
            html += '<div>'; // début de ligne
            for (j = 0; j < size; j++) {
                cell = coord[j] + coord[i];
                table += '<div class="cell'; // début de cellule
                color = this.getCellColor(cell)
                table += color;
                table += '" id="' + cell + '"';
                table += this.getCellSymbol(cell, color);
                table += '</div>'; // fin de cellule
            }
            html += '</div>'; // fin de ligne
        }

        this.htmlgoban = html;

        this.insertGoban();
    },//}}}

    // création du code HTML des commentaires de l'état actuel
    createCommentsHtml: function () {//{{{
        var commments = yygo.data.comments;
        var currentnode = yygo.data.currentnode;
        var currentbranch = yygo.data.currentbranch;

        this.htmlcomments = '<p>';

        if (comments != null && comments[currentnode] != null &&
            comments[currentnode][currentbranch] != null) {
            this.htmlcomments += comments[currentnode][currentbranch];
        }

        this.htmlcomments += '</p>';

        this.insertComments();
    },//}}}

    // création du code HTML des infos de la partie
    createInfosHtml: function () {//{{{
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

        this.insertInfos();
    },//}}}

    // insère le code HTML des bordures du goban
    insertBorders: function () {//{{{
        $('#borders').empty();
        $('#borders').html(this.htmlborders);
    },//}}}

    // insère le code HTML du goban
    insertGoban: function () {//{{{
        $('#goban').empty();
        $('#goban').html(this.htmlgoban);
    },//}}}

    // insère le code HTML des commentaires
    insertComments: function () {//{{{
        $('#comments').empty();
        $('#comments').html(this.htmlcomments);
    },//}}}

    // insère le code HTML des infos de la partie dans la zone commentaires
    insertInfos: function () {//{{{
        $('#infos').empty();
        $('#infos').html(this.htmlinfos);
    },//}}}

};//}}}


    

// événements
yygo.events = {//{{{

    // propriétés

    // méthodes

    // charge une partie de la liste
    loadGameFromList: function (number) {//{{{
        var oldsize = yygo.data.size;

        // TODO sépare le chargement des données et l'affichage

        yygo.data.loadDataFromList(number);

        // recré les bordures si la taille du goban diffère du précédent
        if (yygo.data.size != oldsize) {
            yygo.view.createBordersHtml();
        }

        yygo.view.createGobanHtml();

        if (yygo.data.infos != null) {
            yygo.view.createInfosHtml();
        }

        if (yygo.data.comments != null) {
            yygo.view.createCommentsHtml();
        }

        yygo.view.showload = false;
        yygo.view.showoptions = false;
        // TODO appeler une méthode affichage
        $('#loadlist,#optbuttons').hide();
        $('#goban').css('background', 'url(images/' + yygo.data.size + '.svg)');

        
        // TODO affiche/masque curseur en fonction du mode

        // charge l'état du début de jeu
        yygo.view.loadStones();
        
        

        // affiche l'interface
        yygo.view.resizeGoban(true); // forcer le redimensionnement
        yygo.view.navState();
        // TODO appeler une méthode affichage
        $('#goban').fadeIn();
        $('#navbuttons').show();
        if (com) {
            $('#textzone').show();
        }
    },//}}}


};//}}}

jQuery(document).ready(function ($) {

    /*
     * PLUGINS JQUERY
     */

    // désactive la sélection d'éléments
    // ref: http://bit.ly/gwL00h
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
     * FONCTIONS
     */

        
    // active/désactive les boutons de navigation
    function NavState() {//{{{
        $('[id$="prev"],#start,[id$="next"],#end').attr('class','button');
        if (currentnode == 0) {
            $('[id$="prev"],#start').attr('class','buttond');
        }
        if (currentnode == lastnode) {
            $('[id$="next"],#end').attr('class','buttond');
        }
    }//}}}

    
    
    // variantes
    function Variations() {//{{{
        var nv = 0; // nombre de variantes
        var varis = '';
        var pbranch = getParentBranch(currentnode-1,currentbranch);

        for (var i = 0; i < branchs; i++) {
            if (game[currentnode][i] != null && currentnode > 0) {
                if (getParentBranch(currentnode-1,i) == pbranch) {
                    nv++;
                    if (i == currentbranch) {
                        varis += '<div id="varbua' + i + '"></div>';
                    } else {
                        varis += '<div id="varbut' + i + '"></div>';
                    }
                }
            }
        }
        if (nv > 1) {
            $('#variations').show().html(varis);
            if (!vari) {
                vari = true;
                ResizeGoban(false);
            }
        } else {
            $('#variations').hide();
            if (vari) {
                vari = false;
                ResizeGoban(false);
            }
        }
    }//}}}
    
    
    
    
    
    
        
    /*
     * EVENEMENTS
     */
    
    // fenêtre du navigateur redimensionnée
    $(window).resize(function () {//{{{
        ResizeGoban(false); 
    });//}}}

    // redimensionne commentaires 
    // ref: http://www.jquery.info/spip.php?article44
    $('#resizer').mousedown(function (e) {//{{{
        var winh = $(window).height();
        var h = sizetextzone; // taille commentaire avant redimensionnement
        var y = winh - e.clientY; // position curseur par rapport au bas
        var moveHandler = function (e) {
            // minimum 100 pixels
            sizetextzone = Math.max(100, (winh - e.clientY) + h - y); 
            if (sizetextzone > (winh / 2)) {
                sizetextzone = (winh / 2); // max la moitié de la hauteur
            }
            ResizeGoban(false);
        };
        var upHandler = function (e) {
            $('html').unbind('mousemove',moveHandler)
                     .unbind('mouseup',upHandler);
        };

        $('html').bind('mousemove', moveHandler).bind('mouseup', upHandler);
    });//}}}

    // bouton début
    $('#start').click(function () {//{{{
        if ($('#start').attr('class') == 'button') {
            currentnode = 0;
            if (game[currentnode][currentbranch] == null) {
                currentbranch = getParentBranch(currentnode,lastbranch);
            }
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton retour rapide
    $('#fastprev').click(function () {//{{{
        if ($('#fastprev').attr('class') == 'button') {
            if (currentnode - 10 < 0) {
                currentnode = 0;
            } else {
                currentnode -= 10;
            }
            if (game[currentnode][currentbranch] == null) {
                currentbranch = getParentBranch(currentnode,lastbranch);
            }
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton précédent
    $('#prev').click(function () {//{{{
        if ($('#prev').attr('class') == 'button') {
            currentnode--;
            if (game[currentnode][currentbranch] == null) {
                currentbranch = getParentBranch(currentnode,lastbranch);
            }
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton suivant
    $('#next').click(function () {//{{{
        if ($('#next').attr('class') == 'button') {
            currentnode++;
            setCurrentBranch();
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton avance rapide
    $('#fastnext').click(function () {//{{{
        if ($('#fastnext').attr('class') == 'button') {
            if (currentnode + 10 > lastnode) {
                currentnode = lastnode;
            } else {
                currentnode += 10;
            }
            setCurrentBranch();
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton fin
    $('#end').click(function () {//{{{
        if ($('#end').attr('class') == 'button') {
            currentnode = lastnode;
            setCurrentBranch();
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton commentaires
    $('#comment').click(function () {//{{{
        if (com) {
            $('#textzone').hide();
            com = false;
        } else {
            $('#textzone').show();
            com = true;
        }

        ResizeGoban(false);
    });//}}}

    // changement de branche
    $('[id^="varbut"]').live('click',function () {//{{{
        lastbranch = $(this).attr('id').substr(6);
        currentbranch = lastbranch;

        setLastNode();
        NavState();
        LoadStones();
        LoadComments();
    });//}}}

    // bouton options
    $('#options').click(function () {//{{{
        if (options) {
            LoadComments();
            $('#optbuttons').hide();
            $('#navbuttons').show();
            if (vari) {
                $('#variations').show();
            }
            options = false;
        } else {
            LoadInfos(false,true);
            $('#navbuttons,#variations').hide();
            $('#optbuttons').show();
            options = true;
        }
    });//}}}

    // bouton langues
    $('[class^="lang"]').click(function () {//{{{
        var flag = $(this).attr('class').substr(4);

        SetLang(flag);
    });//}}}

    // bouton pour charger une partie
    $('#load').click(function () {//{{{
        // TODO prévoir rafraichissement, limiter les données affichées
        // afficher sur plusieurs pages
        if (!load && sql.length == 0) { // ajax et requête SQL si non chargé
            $.getJSON('sgf.php',{sql:'0'},function (data) { 
                var table = '<table>';

                sql = data;

                for (var i = 0, ci = sql.length; i < ci; i ++) {
                    var inf = $.parseJSON(sql[i]['infos']);

                    table += '<tr><td>' + sql[i]['file'] + '</td>';

                    if (inf['PB'] != null) {
                        table += '<td>' + inf['PB'] + '</td>';
                    } else {
                        table += '<td></td>';
                    }
                    if (inf['PW'] != null) {
                        table += '<td>' + inf['PW'] + '</td>';
                    } else {
                        table += '<td></td>';
                    }
                    if (inf['DT'] != null) {
                        table += '<td>' + inf['DT'] + '</td>';
                    } else {
                        table += '<td></td>';
                    }

                    table += '</tr>';
                }

                table += '</table>';

                $('#loadlist').html(table);
            });
        }
        if (load) {
            $('#goban,#comment,#options').show();
            if (com) {
                $('#textzone').show();
            }
            $('#loadlist').hide();
            load = false;
        } else {
            $('#goban,#textzone,#comment,#options').hide();
            $('#loadlist').fadeIn();
            load = true;
        }
    });//}}}

    // chargement
    $('#loadlist tr').live('click',function () {//{{{
        var num = $(this).index();

        $('#comment,#options').show();

        LoadGame(num); 
    });//}}}

    // envoi de fichier SGF
    $('#sendsgf').click(function () {//{{{
        $('#sendinput input[type="file"]').trigger('click');
    });//}}}

    // fichier à envoyer
    $('#sendinput input[type="file"]').change(function () {//{{{
        $('#sendinput').submit();
    });//}}}

    /*
     * INITIALISATION
     */

    // TODO récupère les paramètres de l'utilisateur

    // langue du navigateur ou langue par défaut
    var navlang = navigator.language.substr(0,2);

    yygo.data.setLang(navlang);

    $('#variations,#loadlist,#textzone').hide();
    $('#navbuttons,#comment,#options').hide();
    $('#goban,#resizer').disableSelection();
    
    // charge le goban d'intro
    $.getJSON('sgf.php',{sql:'-1'},function (data) {
        sql = data;
        LoadGame(0);
        options = true;
        $('#navbuttons').hide();
        $('#optbuttons').show();
        sql = [];
    });

});
