jQuery(document).ready(function ($) {
    var sql= [];
    var infos = {};
    var comments = {};
    var symbols = {};
    var game = {};
    var size;                   // taille du goban en intersections
    var branchs;                // nombre total de variantes
    var branch;                 // branche actuelle
    var bbranch;                // branche naviguée
    var node;                   // noeud actuel
    var coord = ['a','b','c','d','e','f','g','h','i','j',
                 'k','l','m','n','o','p','q','r','s'];
    var gobansize;              // taille du goban en pixels
    var com = false;            // commentaires visibles ?
    var comsize = 200;          // hauteur de la zone commentaires en pixels
    var info = '';              // infos de la partie sous forme html
    var vari = false;           // variantes
    var load = false;           // afficher la liste des fichiers ?
    var nodemax;                // dernier noeud de la branche actuelle
    var options = true;         // affichage des boutons d'options

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

    // charge une partie de la liste SQL
    function LoadGame(num) {//{{{
        var oldsize = size;

        console.time('master');

        load = false;
        options = false;

        infos = $.parseJSON(sql[num]['infos']);
        comments = $.parseJSON(sql[num]['comments']);
        symbols = $.parseJSON(sql[num]['symbols']);
        game = $.parseJSON(sql[num]['game']);
        size = infos['SZ'];
        branchs = infos['branchs'];

        node = 0;
        branch = 0;
        bbranch = 0;

        SetNodeMax();

        $('#loadlist').hide();
        $('#optbuttons').hide();
        $('#goban').css('background', 'url(images/' + size + '.svg)');

        if (size != oldsize) {
            $('#goban').hide();
            CreateGoban(); 
        }

        // TODO affiche/masque curseur en fonction du mode

        // charge l'état du début de jeu
        LoadStones();
        LoadComments();
        LoadInfos(true,false);

        // affiche l'interface
        ResizeGoban(true); // forcer le redimensionnement
        NavState();
        $('#goban').fadeIn();
        $('#navbuttons').show();
        if (com) {
            $('#comments').show();
        }


        console.timeEnd('master');
    }//}}}

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
        if (node == 0) {
            $('[id$="prev"],#start').attr('class','buttond');
        }
        if (node == nodemax) {
            $('[id$="next"],#end').attr('class','buttond');
        }
    }//}}}

    // défini le dernier noeud de la branche actuelle
    function SetNodeMax() {//{{{
        nodemax = node;
        while (game[nodemax+1] != null && game[nodemax+1][branch] != null) {
            nodemax++;
        }
    }//}}}

    // retourne la branche parent d'une branche
    function ParentBranch(n,b) {//{{{
        for (var i = b; i >= 0; i--) {
            if (game[n] != null && game[n][i] != null) {
                return i;
            }
        }
        return 0;
    }//}}}

    // cherche la branche à afficher en fonction de la branche naviguée
    function GetBranch() {//{{{
        if (game[node][bbranch] != null) {
            branch = bbranch;
        } else {
            for (var i = branch+1; i < bbranch; i ++) {
                if (game[node][i] != null) {
                    branch = i;
                    break;
                }
            }
        }
    }//}}}

    // variantes
    function Variations() {//{{{
        var nv = 0; // nombre de variantes
        var varis = '';
        var pbranch = ParentBranch(node-1,branch);

        for (var i = 0; i < branchs; i++) {
            if (game[node][i] != null && node > 0) {
                if (ParentBranch(node-1,i) == pbranch) {
                    nv++;
                    if (i == branch) {
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
    
    // création du goban en identifiant les coordonnées
    function CreateGoban() {//{{{
        var letters = ['A','B','C','D','E','F','G','H','J',
                       'K','L','M','N','O','P','Q','R','S','T'];
        var table = '';

        $('#goban').html(''); // supprime l'ancien goban

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
    }//}}}

    // charge les pierres de l'état actuel
    function LoadStones() {//{{{
        var blackstones = game[node][branch]['b'].split(',');
        var whitestones = game[node][branch]['w'].split(',');
        
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
        if (game[node][branch]['p'] != null) {
            var playedstone = game[node][branch]['p'].split(',');
            $('#' + playedstone[1]).InsertSymbol('CR',playedstone[0]);
        }

        LoadSymbols();
        Variations();
    }//}}}

    // charge les annotations présentes sur le goban
    function LoadSymbols() {//{{{
        if (symbols != null && symbols[node] != null &&
            symbols[node][branch] != null) {
            if (symbols[node][branch]['CR'] != null) {
                var list = symbols[node][branch]['CR'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    if (cell.attr('class') == 'cellb') {
                        cell.InsertSymbol('CR','b');
                    } else {
                        cell.InsertSymbol('CR','w');
                    }
                }
            }
            if (symbols[node][branch]['SQ'] != null) {
                var list = symbols[node][branch]['SQ'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    if (cell.attr('class') == 'cellb') {
                        cell.InsertSymbol('SQ','b');
                    } else {
                        cell.InsertSymbol('SQ','w');
                    }
                }
            }
            if (symbols[node][branch]['TR'] != null) {
                var list = symbols[node][branch]['TR'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    if (cell.attr('class') == 'cellb') {
                        cell.InsertSymbol('TR','b');
                    } else {
                        cell.InsertSymbol('TR','w');
                    }
                }
            }
            if (symbols[node][branch]['LB'] != null) {
                var list = symbols[node][branch]['LB'].split(','); 
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

        if (comments != null && comments[node] != null &&
            comments[node][branch] != null) {
            text += comments[node][branch];
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
            node = 0;
            if (game[node][branch] == null) {
                branch = ParentBranch(node,bbranch);
            }
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton retour rapide
    $('#fastprev').click(function () {//{{{
        if ($('#fastprev').attr('class') == 'button') {
            if (node - 10 < 0) {
                node = 0;
            } else {
                node -= 10;
            }
            if (game[node][branch] == null) {
                branch = ParentBranch(node,bbranch);
            }
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton précédent
    $('#prev').click(function () {//{{{
        if ($('#prev').attr('class') == 'button') {
            node--;
            if (game[node][branch] == null) {
                branch = ParentBranch(node,bbranch);
            }
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton suivant
    $('#next').click(function () {//{{{
        if ($('#next').attr('class') == 'button') {
            node++;
            GetBranch();
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton avance rapide
    $('#fastnext').click(function () {//{{{
        if ($('#fastnext').attr('class') == 'button') {
            if (node + 10 > nodemax) {
                node = nodemax;
            } else {
                node += 10;
            }
            GetBranch();
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton fin
    $('#end').click(function () {//{{{
        if ($('#end').attr('class') == 'button') {
            node = nodemax;
            GetBranch();
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
        bbranch = $(this).attr('id').substr(6);
        branch = bbranch;

        SetNodeMax();
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
    /*$.getJSON('sgf.php',{sql:'-1'},function (data) {
        sql = data;
        LoadGame(0);
        options = true;
        $('#navbuttons').hide();
        $('#optbuttons').show();
        sql = [];
    });*/

});
