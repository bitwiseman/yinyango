jQuery(document).ready(function($) {
    var sql = new Array();
    var size;
    var infos = new Array();
    var comments = new Array();
    var symbols = new Array();
    var game = new Array();
    var node;
    var branch;
    var coord = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s'];
    var gobansize;
    var com = true; // commentaires
    var comsize = 200; // taille commentaires
    var nodemax; // dernier noeud de la branche actuelle
    var options; // affichage des boutons d'options

    // désactive la sélection d'éléments
    // ref: http://stackoverflow.com/questions/2700000/how-to-disable-text-selection-using-jquery
    $.fn.disableSelection = function() {//{{{
        return this.each(function() {           
            $(this).attr('unselectable', 'on')
            .css({
                '-moz-user-select':'none',
                '-webkit-user-select':'none',
                'user-select':'none',
                '-ms-user-select':'none'
            })
            .each(function() {
                this.onselectstart = function() { return false; };
            });
        });
    };//}}}

    // ajuste l'interface en fonction de la fenêtre du navigateur
    var ResizeGoban = function(force) {//{{{
        var heightleft; // hauteur restante pour le goban
        var winw = $(window).width();
        var winh = $(window).height();
        var sizeb = parseInt(size) + 2; // ajout des bordures
        var oldgobansize = gobansize;
        
        if (comsize > (winh / 2)) { comsize = (winh / 2) };
        com ? heightleft = winh - 50 - comsize :
              heightleft = winh - 50;
        var smaller = (heightleft >= winw) ? winw : heightleft;
        gobansize = Math.floor(smaller / sizeb) * sizeb;
        if (gobansize != oldgobansize || force) { // évite du travail inutile
            $('#comments').css('top',gobansize + 50);
            $('#goban tr').css('height',gobansize / sizeb); // pour firefox
            $('#goban td').css({
                fontSize: gobansize / sizeb / 2,
                height: gobansize / sizeb - 2,
                width: gobansize / sizeb - 2
            });
        }
        $('#textarea').css('height',$('#comments').outerHeight() - 6);
    };//}}}

    // cherche le dernier noeud de la branche actuelle
    var SetNodeMax = function() {//{{{
        nodemax = node;
        while (game[nodemax+1] != null && game[nodemax+1][branch] != null) {
            nodemax++;
        }
    };//}}}

    // place les pierres de l'état actuel
    var PlaceStones = function() {//{{{
        var black = game[node][branch]['b'].split(',');
        var white = game[node][branch]['w'].split(',');
        
        for (var b = 0, cb = black.length; b < cb; b++) {
            $('#' + black[b]).attr('class','cellb');
        }
        for (var w = 0, cw = white.length; w < cw; w++) {
            $('#' + white[w]).attr('class','cellw');
        }
        if (game[node][branch]['p'] != null) {
            var played = game[node][branch]['p'].split(',');
            var symbol = (played[0] == 'b') ? 'symwcr' : 'symbcr';
            $('#' + played[1] + ' > div').attr('class',symbol);
        }
    };//}}}

    // affiche les annotations présentes sur le goban
    var ShowSymbols = function() {//{{{
        if (symbols != null && symbols[node] != null && symbols[node][branch] != null) {
            if (symbols[node][branch]['CR'] != null) {
                var list = symbols[node][branch]['CR'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    var sym = $('#' + list[i] + ' > div');
                    if (cell.attr('class') == 'cellb') {
                        sym.attr('class','symwcr');
                    } else {
                        sym.attr('class','symbcr');
                    }
                }
            }
            if (symbols[node][branch]['SQ'] != null) {
                var list = symbols[node][branch]['SQ'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    var sym = $('#' + list[i] + ' > div');
                    if (cell.attr('class') == 'cellb') {
                        sym.attr('class','symwsq');
                    } else {
                        sym.attr('class','symbsq');
                    }
                }
            }
            if (symbols[node][branch]['TR'] != null) {
                var list = symbols[node][branch]['TR'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var cell = $('#' + list[i]);
                    var sym = $('#' + list[i] + ' > div');
                    if (cell.attr('class') == 'cellb') {
                        sym.attr('class','symwtr');
                    } else {
                        sym.attr('class','symbtr');
                    }
                }
            }
            if (symbols[node][branch]['LB'] != null) {
                var list = symbols[node][branch]['LB'].split(','); 
                for (var i = 0, ci = list.length; i < ci; i++) {
                    var label = list[i].split(':');
                    var cell = $('#' + label[0]);
                    if (cell.attr('class') != null) {
                        if (cell.attr('class') == 'cellb') {
                            cell.css('color','white');
                        }
                        // TODO resizegoban avec différente tailles de polices
                        // selon la longeur du label
                        cell.append(label[1]);
                    } else {
                        cell.attr('class','celle');
                        cell.append(label[1]);
                    }
                }
            }
        }
    };//}}}

    // vide le goban de toutes ses pierres et symboles
    var ClearGoban = function() {//{{{
        $('[class^="cell"],[class^="sym"]').removeAttr('class');
    };//}}}

    // création du goban en identifiant les coordonnées
    var CreateGoban = function() {//{{{
        var letters = ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T'];
        var table = '';
        $('#goban').html(''); // supprime l'ancien goban

        for (var i = -1; i <= size; i++) {
            table += '<tr>';
            for (var j = -1; j <= size; j++) {
                if (i == -1 || i == size) {
                    if (j != -1 && j != size) {
                        table += '<td>' + letters[j] + '</td>';
                    } else {
                        table += '<td></td>';
                    }
                }
                else if (j == -1 || j == size) {
                    if (i != -1 && i != size) {
                        table += '<td>' + (size - i) + '</td>';
                    } else {
                        table += '<td></td>';
                    }
                } else {
                    table += '<td id="' + coord[j] + coord[i] + 
                                         '"><div></div></td>';
                }
            }
            table += '</tr>';
        }
        $('#goban').html(table); // écrit le nouveau goban
    };//}}}

    // affiche les infos de la partie dans la zone de commentaires
    var ShowInfos = function() {//{{{
        var text = '<p>';
        // TODO récupérer les textes dans un fichier selon la langue
        if (infos['PB'] != null) { text += '<em>Noir:</em> ' + infos['PB'] };
        if (infos['BR'] != null) { text += ' [' + infos['BR'] + ']' };
        if (infos['PW'] != null) { text += ' <br /><em>Blanc:</em> ' + infos['PW'] };
        if (infos['WR'] != null) { text += ' [' + infos['WR'] + ']' };
        if (infos['DT'] != null) { text += ' <br /><em>Date:</em> ' + infos['DT'] };
        if (infos['PC'] != null) { text += ' <br /><em>Emplacement:</em> ' + infos['PC'] };
        if (infos['RU'] != null) { text += ' <br /><em>Règles:</em> ' + infos['RU'] };
        text += '</p>';

        $('#textarea').html(''); // vide la zone commentaires
        $('#textarea').html(text);
    };//}}}

    // affiche les commentaires
    var ShowComments = function() {//{{{
        var text = '<p>';
        if (comments != null && comments[node] != null && comments[node][branch] != null) {
            text += comments[node][branch];
        }
        text += '</p>';

        $('#textarea').html(''); // vide la zone commentaires
        $('#textarea').html(text);
    };//}}}

    /**
     * INITIALISATION
     */

    $('#goban').hide();
    $('#comments').hide();
    $('#loadlist').hide();
    $('[class^="button"]:not(#load)').hide();
    $('#goban,#resizer').disableSelection();

    /**
     * EVENEMENTS
     */
    
    // fenêtre du navigateur redimensionnée
    $(window).resize(function() {
        ResizeGoban(); 
    });

    // redimensionne commentaires 
    // ref: http://www.jquery.info/spip.php?article44
    $('#resizer').mousedown(function(e) {//{{{
        var winh = $(window).height();
        var h = comsize; // taille commentaire avant redimensionnement
        var y = winh - e.clientY; // position curseur par rapport au bas
        var moveHandler = function(e) {
            comsize = Math.max(100, (winh - e.clientY) + h - y); // minimum 100 pixels
            if (comsize > (winh / 2)) { comsize = (winh / 2) }; // max la moitié de la hauteur
            ResizeGoban();
        };
        var upHandler = function(e) {
            $('html').unbind('mousemove',moveHandler).unbind('mouseup',upHandler);
        };
        $('html').bind('mousemove', moveHandler).bind('mouseup', upHandler);
    });//}}}

    // bouton début
    $('#start').click(function() {//{{{
        if ($('#start').attr('class') == 'button') {
            node = 0;
            $('[id$="next"],#end').attr('class','button');
            $('[id$="prev"],#start').attr('class','buttond');
            ClearGoban();
            PlaceStones();
            ShowComments();
        }
    });//}}}

    // bouton retour rapide
    $('#fastprev').click(function() {//{{{
        if ($('#fastprev').attr('class') == 'button') {
            node = node - 10 < 0 ? 0 : node - 10;
            $('[id$="next"],#end').attr('class','button');
            // TODO test si il existe un coup précédent
            if (node == 0) {
                $('[id$="prev"],#start').attr('class','buttond');
            };
            ClearGoban();
            PlaceStones();
            ShowComments();
        }
    });//}}}

    // bouton précédent
    $('#prev').click(function() {//{{{
        if ($('#prev').attr('class') == 'button') {
            node--;
            $('[id$="next"],#end').attr('class','button');
            // TODO test si il existe un coup précédent
            if (game[node-1] == null || game[node-1][branch] == null) {
                $('[id$="prev"],#start').attr('class','buttond');
            };
            ClearGoban();
            PlaceStones();
            ShowComments();
        }
    });//}}}

    // bouton suivant
    $('#next').click(function() {//{{{
        if ($('#next').attr('class') == 'button') {
            node++;
            $('[id$="prev"],#start').attr('class','button');
            // TODO test si il existe un coup suivant
            if (game[node+1] == null || game[node+1][branch] == null) {
                $('[id$="next"],#end').attr('class','buttond');
            };
            ClearGoban();
            PlaceStones();
            ShowComments();
        }
    });//}}}

    // bouton avance rapide
    $('#fastnext').click(function() {//{{{
        if ($('#fastnext').attr('class') == 'button') {
            node = node + 10 > nodemax ? nodemax : node + 10;
            $('[id$="prev"],#start').attr('class','button');
            // TODO test si il existe un coup précédent
            if (node == nodemax) {
                $('[id$="next"],#end').attr('class','buttond');
            };
            ClearGoban();
            PlaceStones();
            ShowComments();
        }
    });//}}}

    // bouton fin
    $('#end').click(function() {//{{{
        if ($('#end').attr('class') == 'button') {
            node = nodemax;
            $('[id$="prev"],#start').attr('class','button');
            $('[id$="next"],#end').attr('class','buttond');
            ClearGoban();
            PlaceStones();
            ShowComments();
        }
    });//}}}

    // bouton commentaires
    $('#comment').click(function() {//{{{
        com ? com = false : com = true;
        com ? $('#comments').show() : $('#comments').hide();
        ResizeGoban();
    });//}}}

    // bouton options
    $('#options').click(function() {//{{{
        if (options) {
            ShowComments();
            $('#load,#loadlist').hide();
            $('[class^="button"]:not(#load)').show();
            $('#goban').show();
            if (com) $('#comments').show();
            options = false;
        } else {
            ShowInfos();
            $('[class^="button"]:not(#comment,#options)').hide();
            $('#load').show();
            options = true;
        }
    });//}}}

    // bouton pour charger une partie
    $('#load').click(function() {//{{{
        var table = '<table>';
        $('#goban,#comments,#options,#comment').hide();
        // TODO tester si les données sont déjà chargées
        // prévoir rafraichissement, limiter les données affichées
        $.getJSON('sgf.php', 'sql', function(data) {
            sql = data;
            for (var i = 0, ci = sql.length; i < ci; i ++) {
                table += '<tr>';
                table += '<td>' + sql[i]['file'] + '</td>';
                if (sql[i]['PB'] != null) {
                    table += '<td>' + sql[i]['PB'] + '</td>';
                } else {
                    table += '<td></td>';
                }
                if (sql[i]['PW'] != null) {
                    table += '<td>' + sql[i]['PW'] + '</td>';
                } else {
                    table += '<td></td>';
                }
                if (sql[i]['DT'] != null) {
                    table += '<td>' + sql[i]['DT'] + '</td>';
                } else {
                    table += '<td></td>';
                }
                table += '</tr>';
            }; 
            table += '</table>';
            $('#loadlist').html(table).fadeIn();
        });
    });//}}}

    // chargement
    $('#loadlist tr').live('click',function() {//{{{
        var num = $(this).index();
        var oldsize = size;

        size = sql[num]['SZ'];
        infos['PB'] = sql[num]['PB'];
        infos['BR'] = sql[num]['BR'];
        infos['PW'] = sql[num]['PW'];
        infos['WR'] = sql[num]['WR'];
        infos['DT'] = sql[num]['DT'];
        infos['PC'] = sql[num]['PC'];
        infos['RU'] = sql[num]['RU'];
        comments = $.parseJSON(sql[num]['comments']);
        symbols = $.parseJSON(sql[num]['symbols']);
        game = $.parseJSON(sql[num]['game']);
        node = 0;
        branch = 0;

        SetNodeMax();

        $('#loadlist').hide();
        $('#load').hide();
        options = false;
        $('#goban').css('background-image', 'url(images/' + size + '.svg)');

        if (size != oldsize) {
            $('#goban').hide();
            CreateGoban(); 
        } else {
            ClearGoban();
        }

        // TODO affiche/masque curseur en fonction du mode

        // charge l'état du début de jeu
        PlaceStones();
        ShowSymbols();
        ShowComments();

        // affiche l'interface
        ResizeGoban(true); // forcer le redimensionnement
        $('#start,[id$="prev"],[id$="next"],#end').attr('class','buttond');
        $('#goban').fadeIn();
        $('#comment').attr('class','button');
        com ? $('#comments').show() : $('#comments').hide();
        if (nodemax != 0) {
            $('[id$="next"],#end').attr('class','button');
        }
        $('[class^="button"]:not(#load)').show();
    });//}}}

});
