yygo = window.yygo || {};

// données
yygo.data = {//{{{

    // propriétés

    gameslist:      [],

    comments:       {},
    game:           {},
    infos:          {},
    symbols:        {},

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

    // charge les données de la partie de la liste
    loadDataFromList: function (number) {//{{{
        this.infos = $.parseJSON(this.gameslist[number]['infos']);
        this.comments = $.parseJSON(this.gameslist[number]['comments']);
        this.symbols = $.parseJSON(this.gameslist[number]['symbols']);
        this.game = $.parseJSON(this.gameslist[number]['game']);

        this.size = this.infos['SZ'];
        this.branchs = this.infos['branchs'];

        this.currentnode = 0;
        this.currentbranch = 0;
        this.lastbranch = 0;

        this.setLastNode();
    },//}}}

    // retourne la branche parent d'une branche
    parentBranch: function (node, branch) {//{{{
        for (var i = branch; i >= 0; i--) {
            if (this.game[node] != null && this.game[node][i] != null) {
                return i;
            }
        }
        return 0;
    },//}}}


};//}}}

// affichage
yygo.view = {//{{{

    // propriétés

    htmlborders:    '',
    htmlgoban:      '',
    htmlinfos:      '',

    showborders:    true,
    showcomments:   false,
    showlist:       false,
    showoptions:    false,
    showvariations: false,

    sizecomments:   200,
    sizegoban:      0,

    // méthodes

    // création du code HTML des bordures du goban
    createBordersHtml: function () {
        var letters = ['A','B','C','D','E','F','G','H','J',
                       'K','L','M','N','O','P','Q','R','S','T'];
        var size = yygo.data.size;

    },

    // création du code HTML du goban
    createGobanHtml: function () {//{{{
        var size = yygo.data.size;

        this.htmlgoban = '';

        for (var i = -1; i <= size; i++) {

            table += '<div>';

            for (var j = -1; j <= size; j++) {
                if (i == -1 || i == size) {
                    if (j != -1 && j != size) { // bords gauche et droit
                        table += '<div class="cell">' + letters[j] + '</div>';
                    } else { // coin
                        table += '<div class="cell"></div>';
                    }
                } else if (j == -1 || j == size) {
                    if (i != -1 && i != size) { // bords haut et bas
                        table += '<div class="cell">' + (size - i) + '</div>';
                    } else { // coin
                        table += '<div class="cell"></div>';
                    }
                } else { // intersection
                    table += '<div class="cell" id="' + coord[j] + coord[i] +
                             '"></div>';
                }
            }

            table += '</div>';
        }

        $('#goban').html(table); // écrit le nouveau goban
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

        yygo.view.createGobanHtml();

        yygo.view.load = false;
        yygo.view.options = false;
        // TODO appeler une méthode affichage
        $('#loadlist,#optbuttons').hide();
        $('#goban').css('background', 'url(images/' + yygo.data.size + '.svg)');

        if (yygo.data.size != oldsize) { // TODO redessiner bordures si
                                         // taille diffère
            $('#goban').hide();
            yygo.view.createGoban(); 
        }

        // TODO affiche/masque curseur en fonction du mode

        // charge l'état du début de jeu
        yygo.view.loadStones();
        yygo.view.loadComments();
        yygo.view.loadInfos(true,false);

        // affiche l'interface
        yygo.view.resizeGoban(true); // forcer le redimensionnement
        yygo.view.navState();
        // TODO appeler une méthode affichage
        $('#goban').fadeIn();
        $('#navbuttons').show();
        if (com) {
            $('#comments').show();
        }
    },//}}}


};//}}}

jQuery(document).ready(function ($) {
    var coord = ['a','b','c','d','e','f','g','h','i','j',
                 'k','l','m','n','o','p','q','r','s'];

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

    // insère un symbole SVG dans les éléments sélectionnés
    $.fn.InsertSymbol = function (symbol,color) {//{{{
        return this.each(function () {           
            var svg = '<svg xmlns="http://www.w3.org/2000/svg"' +
                      'version="1.1" viewBox="0 0 10 10">';
            if (symbol == 'CR') {
                svg += '<circle cx="5" cy="5" r="2.5"' +
                       'stroke-width="0.7" fill="none"';
            } else if (symbol == 'SQ') {
                svg += '<rect x="1.8" y="1.8" width="6.5"' +
                       'height="6.5" stroke-width="0.7" fill="none"';
            } else if (symbol == 'TR') {
                svg += '<path d="M5 0.5 L8.8 7.4 L1.2 7.4 Z"' +
                       'stroke-width="0.7" fill="none"';
            }
            if (color == 'w') {
                svg += ' stroke="#000"/></svg>';
            } else {
                svg += ' stroke="#fff"/></svg>';
            }
            $(this).html(svg);
        });
    };//}}}

    /*
     * FONCTIONS
     */

        // ajuste l'interface en fonction de la fenêtre du navigateur
    function ResizeGoban(force) {//{{{
        var winw = $(window).width();       // largeur fenêtre
        var winh = $(window).height();      // hauteur fenêtre
        var heightleft = winh - 50;         // hauteur restante pour le goban
        var sizeb = parseInt(size,10) + 2;  // ajout des bordures
        var oldgobansize = gobansize;
        var smaller;
        
        if (comsize > (winh / 2)) {
            comsize = (winh / 2);
        }
        if (com) {
            heightleft -= comsize;
        }
        if (vari) {
            heightleft -= 20;
        }
        if (winw < heightleft) {
            smaller = winw;
        } else {
            smaller = heightleft;
        }

        // calcul la taille en pixels du goban pour être un multiple de
        // sa taille en intersections (avec les bordures).
        // Cela évite un affichage baveux du SVG
        gobansize = Math.floor(smaller / sizeb) * sizeb;

        // redessine le goban si la taille a changé ou si forcé
        if (gobansize != oldgobansize || force) {
            if (vari) {
                $('#comments').css('top',gobansize + 70);
            } else {
                $('#comments').css('top',gobansize + 50);
            }
            $('#goban').css({
                height: gobansize,
                width: gobansize
            });
            $('#goban div').css('height',gobansize / sizeb);
            $('[class^="cell"]').css({
                width: gobansize / sizeb,
                lineHeight: gobansize / sizeb + 'px',
                fontSize: gobansize / sizeb / 1.5
            });
        }
        
        // redessine la zone de texte
        $('#textarea').css('height',$('#comments').outerHeight() - 6);
    }//}}}

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
        var pbranch = ParentBranch(currentnode-1,currentbranch);

        for (var i = 0; i < branchs; i++) {
            if (game[currentnode][i] != null && currentnode > 0) {
                if (ParentBranch(currentnode-1,i) == pbranch) {
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
    
    
    // charge les pierres de l'état actuel
    function LoadStones() {//{{{
        var blackstones = game[currentnode][currentbranch]['b'].split(',');
        var whitestones = game[currentnode][currentbranch]['w'].split(',');
        
        // vide le goban de toutes ses pierres et symboles
        $('#goban div[id]').html('').attr({
            class: 'cell',
            title: ''
        });
        
        // dessine les pierres de l'état actuel
        for (var b = 0, cb = blackstones.length; b < cb; b++) {
            $('#' + blackstones[b]).attr('class','cellb');
        }
        for (var w = 0, cw = whitestones.length; w < cw; w++) {
            $('#' + whitestones[w]).attr('class','cellw');
        }

        // ajoute un symbol pour indiquer la dernière pierre jouée
        if (game[currentnode][currentbranch]['p'] != null) {
            var playedstone = game[currentnode][currentbranch]['p'].split(',');
            $('#' + playedstone[1]).InsertSymbol('CR',playedstone[0]);
        }

        LoadSymbols();
        Variations();
    }//}}}

    // charge les annotations présentes sur le goban
    function LoadSymbols() {//{{{
        if (symbols != null && symbols[currentnode] != null &&
            symbols[currentnode][currentbranch] != null) {
            if (symbols[currentnode][currentbranch]['CR'] != null) {
                var list = symbols[currentnode][currentbranch]['CR'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    if (cell.attr('class') == 'cellb') {
                        cell.InsertSymbol('CR','b');
                    } else {
                        cell.InsertSymbol('CR','w');
                    }
                }
            }
            if (symbols[currentnode][currentbranch]['SQ'] != null) {
                var list = symbols[currentnode][currentbranch]['SQ'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    if (cell.attr('class') == 'cellb') {
                        cell.InsertSymbol('SQ','b');
                    } else {
                        cell.InsertSymbol('SQ','w');
                    }
                }
            }
            if (symbols[currentnode][currentbranch]['TR'] != null) {
                var list = symbols[currentnode][currentbranch]['TR'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    if (cell.attr('class') == 'cellb') {
                        cell.InsertSymbol('TR','b');
                    } else {
                        cell.InsertSymbol('TR','w');
                    }
                }
            }
            if (symbols[currentnode][currentbranch]['LB'] != null) {
                var list = symbols[currentnode][currentbranch]['LB'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var label = list[i].split(':');
                    var cell = $('#' + label[0]);
                    if (cell.attr('class') == 'cellb') {
                        cell.css('color','white');
                    } else if (cell.attr('class') == 'cell') {
                        cell.attr('class','celle');
                    }
                    cell.html(label[1]).attr('title',label[1]);
                }
            }
        }
    }//}}}

    // charge les infos de la partie dans la zone de commentaires
    function LoadInfos(force,show) {//{{{
        // si vide ou forcé (changement de partie, changement de langue...) 
        if (info == '' || force) {
            info = '<p>';
            if (infos['PB'] != null) {
                info += '<em>' + lang.black + ':</em> ' + infos['PB'];
            }
            if (infos['BR'] != null) {
                info += ' [' + infos['BR'] + ']';
            }
            if (infos['PW'] != null) {
                info += ' <br /><em>' + lang.white + ':</em> ' + infos['PW'];
            }
            if (infos['WR'] != null) {
                info += ' [' + infos['WR'] + ']';
            }
            if (infos['DT'] != null) {
                info += ' <br /><em>' + lang.date + ':</em> ' + infos['DT'];
            }
            if (infos['PC'] != null) {
                info += ' <br /><em>' + lang.place + ':</em> ' + infos['PC'];
            }
            if (infos['RU'] != null) {
                info += ' <br /><em>' + lang.rules + ':</em> ' + infos['RU'];
            }
            info += '</p>';
        }

        // affiche si demandé
        if (show) {
            $('#textarea').html('');
            $('#textarea').html(info);
        }
    }//}}}

    // charge les commentaires
    function LoadComments() {//{{{
        var text = '<p>';

        if (comments != null && comments[currentnode] != null &&
            comments[currentnode][currentbranch] != null) {
            text += comments[currentnode][currentbranch];
        }

        text += '</p>';

        $('#textarea').html('');
        $('#textarea').html(text);
    }//}}}

    // défini la langue
    function SetLang(language) {//{{{
        var langs = ['en','fr']; // langues supportées
        var langsup = false;

        for (var i = 0, ci = langs.length; i < ci; i++) {
            if (langs[i] == language) {
                langsup = true;
            }
        }
        if (!langsup) {
            language = 'en'; // langue par défaut
        }

        // récupère le script de la langue et traduit les éléments
        $.getScript('lang/' + language + '.js',function () {
            $('#comment').attr('title',lang.comment);
            $('#load').attr('title',lang.load);
            $('#lang').attr('title',lang.language);
            $('#start').attr('title',lang.start);
            $('#prev').attr('title',lang.prev);
            $('#fastprev').attr('title',lang.fastprev);
            $('#next').attr('title',lang.next);
            $('#fastnext').attr('title',lang.fastnext);
            $('#end').attr('title',lang.end);
            $('#options').attr('title',lang.options);
            $('#sendsgf').attr('title',lang.sendsgf);
            $('#downsgf').attr('title',lang.downsgf);

            if (infos != null) {
                LoadInfos(true,true);
            }

            // change l'apparence du bouton pour prendre celle de la langue
            $('#lang').attr('class','button' + language);
            $('[class^="lang"]').show();
            $('.lang' + language).hide();
        });
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
        var h = comsize; // taille commentaire avant redimensionnement
        var y = winh - e.clientY; // position curseur par rapport au bas
        var moveHandler = function (e) {
            // minimum 100 pixels
            comsize = Math.max(100, (winh - e.clientY) + h - y); 
            if (comsize > (winh / 2)) {
                comsize = (winh / 2); // max la moitié de la hauteur
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
                currentbranch = ParentBranch(currentnode,lastbranch);
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
                currentbranch = ParentBranch(currentnode,lastbranch);
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
                currentbranch = ParentBranch(currentnode,lastbranch);
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
            $('#comments').hide();
            com = false;
        } else {
            $('#comments').show();
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
                $('#comments').show();
            }
            $('#loadlist').hide();
            load = false;
        } else {
            $('#goban,#comments,#comment,#options').hide();
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

    SetLang(navlang);

    $('#variations,#loadlist,#comments').hide();
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
