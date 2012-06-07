jQuery(document).ready(function($) {
    var size;
    var infos; // infos de la partie
    var comments; // commentaires
    var symbols; // annotations sur le goban
    var game;
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
        console.log(force);
        if (gobansize != oldgobansize || force) { // évite du travail inutile
            $('#comments').css('top',gobansize + 50);
            $('[class^="cell"]').css({
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
                // TODO
            }
        }
    };//}}}

    // vide le goban de toutes ses pierres et symboles
    var ClearGoban = function() {//{{{
        $('[class^="cell"]:not([class="cell"])').attr('class','cell');
        $('[class^="sym"]:not([class="sym"])').attr('class','sym');
    };//}}}

    // création du goban en identifiant les coordonnées
    var CreateGoban = function() {//{{{
        var letters = ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T'];
        $('#goban').html(''); // supprime l'ancien goban

        for (var i = -1; i <= size; i++) {
            $('#goban').append('<tr class="row' + i + '"></tr>');
            for (var j = -1; j <= size; j++) {
                if (i == -1 || i == size) {
                    if (j != -1 && j != size) {
                        $('.row' + i).append('<td class="cell">' + letters[j] + '</td>');
                    } else {
                        $('.row' + i).append('<td class="cell"></td>');
                    }
                }
                else if (j == -1 || j == size) {
                    if (i != -1 && i != size) {
                        $('.row' + i).append('<td class="cell">' + (size - i) + '</td>');
                    } else {
                        $('.row' + i).append('<td class="cell"></td>');
                    }
                } else {
                    $('.row' + i).append('<td id="' + coord[j] + coord[i] + 
                                         '" class="cell"><div class="sym"></div></td>');
                }
            }
        }
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

    // bouton pour charger une partie
    $('#load').click(function() {//{{{
        $('#loadlist').show();
    });//}}}

    // bouton options
    $('#options').click(function() {//{{{
        if (options) {
            ShowComments();
            $('[id^="load"]').hide();
            $('[class^="button"]:not(#load)').show();
            options = false;
        } else {
            ShowInfos();
            $('[class^="button"]:not(#comment,#options)').hide();
            $('#load').show();
            options = true;
        }
    });//}}}

    // bouton charger
    $('#loadsgf').click(function() {//{{{   
        var sgf_file = 'sgf/' + $("#sgflist").val();
        var oldsize = size;

        // récupère la traduction du fichier SGF sous forme de tableau et l'affiche
        $.getJSON('sgf.php', { file: sgf_file }, function(data) {
            size = data.size;
            infos = data.infos;
            comments = data.comments;
            symbols = data.symbols;
            game = data.game;
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
            if (size != oldsize) { $('#goban').fadeIn() };
            $('#comment').attr('class','button');
            com ? $('#comments').show() : $('#comments').hide();
            if (nodemax != 0) {
                $('[id$="next"],#end').attr('class','button');
            }
            $('[class^="button"]:not(#load)').show();
        });
    });//}}}

});
