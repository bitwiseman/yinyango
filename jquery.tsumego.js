jQuery(document).ready(function($) {
    var sql = new Array();
    var size;
    var infos = new Array();
    var comments = new Array();
    var symbols = new Array();
    var game = new Array();
    var node;
    var branch;
    var bbranch; // branche naviguée
    var branchs; // nombre total de variantes
    var coord = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s'];
    var gobansize;
    var com = true; // commentaires
    var comsize = 200; // taille commentaires
    var vari = false; // variantes
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
        com ? heightleft = winh - 70 - comsize :
              heightleft = winh - 70;
        var smaller = (heightleft >= winw) ? winw : heightleft;
        gobansize = Math.floor(smaller / sizeb) * sizeb;
        if (gobansize != oldgobansize || force) { // évite du travail inutile
            $('#comments').css('top',gobansize + 70);
            $('#goban tr').css('height',gobansize / sizeb); // pour firefox
            $('#goban td').css({
                fontSize: gobansize / sizeb / 2,
                height: gobansize / sizeb - 2,
                width: gobansize / sizeb - 2
            });
        }
        $('#textarea').css('height',$('#comments').outerHeight() - 6);
    };//}}}

    // active/désactive les boutons de navigation
    var NavState = function() {//{{{
        $('[id$="prev"],#start,[id$="next"],#end').attr('class','button');
        if (node == 0) $('[id$="prev"],#start').attr('class','buttond');
        if (node == nodemax) $('[id$="next"],#end').attr('class','buttond');
    };//}}}

    // défini le dernier noeud de la branche actuelle
    var SetNodeMax = function() {//{{{
        nodemax = node;
        while (game[nodemax+1] != null && game[nodemax+1][branch] != null) {
            nodemax++;
        }
    };//}}}

    // retourne la branche parent d'une branche
    var ParentBranch = function(n,b) {//{{{
        for (var i = b; i >= 0; i--) {
            if (game[n] != null && game[n][i] != null) return i;   
        }
        return 0;
    };//}}}

    // cherche la branche à afficher en fonction de la branche naviguée
    var GetBranch = function() {//{{{
        if (game[node][bbranch] != null) branch = bbranch;
        else {
            for (var i = branch+1; i < bbranch; i ++) {
                if (game[node][i] != null) {
                    branch = i;
                    break;
                }
            }
        }
    };//}}}

    // variantes
    var Variations = function() {//{{{
        var nv = 0; // nombre de variantes
        var varis = '';
        var pbranch = ParentBranch(node-1,branch);
        for (var i = 0; i < branchs; i++) {
            if (game[node][i] != null && game[node-1] != null) {
                if (ParentBranch(node-1,i) == pbranch) {
                    nv++;
                    if (i == branch) varis += '<div id="varbua' + i + '"></div>';
                    else varis += '<div id="varbut' + i + '"></div>';
                }
            }
        }
        if (nv > 1) $('#variations').html(varis);
        else $('#variations').html('');
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

    // charge les pierres de l'état actuel
    var LoadStones = function() {//{{{
        var black = game[node][branch]['b'].split(',');
        var white = game[node][branch]['w'].split(',');
        
        // vide le goban de toutes ses pierres et symboles
        $('[class^="cell"],[class^="sym"]').removeAttr('class');

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
        LoadSymbols();
        Variations();
    };//}}}

    // charge les annotations présentes sur le goban
    var LoadSymbols = function() {//{{{
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

    // charge les infos de la partie dans la zone de commentaires
    var LoadInfos = function() {//{{{
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

    // charge les commentaires
    var LoadComments = function() {//{{{
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

    $('#goban,#variations,#comments,#loadlist').hide();
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
            if (game[node][branch] == null) branch = ParentBranch(node,bbranch);
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton retour rapide
    $('#fastprev').click(function() {//{{{
        if ($('#fastprev').attr('class') == 'button') {
            node = node - 10 < 0 ? 0 : node - 10;
            if (game[node][branch] == null) branch = ParentBranch(node,bbranch);
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton précédent
    $('#prev').click(function() {//{{{
        if ($('#prev').attr('class') == 'button') {
            node--;
            if (game[node][branch] == null) branch = ParentBranch(node,bbranch);
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton suivant
    $('#next').click(function() {//{{{
        if ($('#next').attr('class') == 'button') {
            node++;
            GetBranch();
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton avance rapide
    $('#fastnext').click(function() {//{{{
        if ($('#fastnext').attr('class') == 'button') {
            node = node + 10 > nodemax ? nodemax : node + 10;
            GetBranch();
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton fin
    $('#end').click(function() {//{{{
        if ($('#end').attr('class') == 'button') {
            node = nodemax;
            GetBranch();
            NavState();
            LoadStones();
            LoadComments();
        }
    });//}}}

    // bouton commentaires
    $('#comment').click(function() {//{{{
        com ? com = false : com = true;
        com ? $('#comments').show() : $('#comments').hide();
        ResizeGoban();
    });//}}}

    // changement de branche
    $('[id^="varbut"]').live('click',function() {//{{{
        bbranch = $(this).attr('id').substr(6);
        branch = bbranch;
        SetNodeMax();
        NavState();
        LoadStones();
        LoadComments();
    });//}}}

    // bouton options
    $('#options').click(function() {//{{{
        if (options) {
            LoadComments();
            $('#load,#loadlist').hide();
            $('[class^="button"]:not(#load),#variations').show();
            if (com) $('#comments').show();
            options = false;
        } else {
            LoadInfos();
            $('[class^="button"]:not(#comment,#options),#variations').hide();
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
        branchs = sql[num]['branchs'];
        node = 0;
        branch = 0;
        bbranch = 0;

        SetNodeMax();

        $('#loadlist').hide();
        $('#load').hide();
        options = false;
        $('#goban').css('background', 'url(images/' + size + '.svg)');

        if (size != oldsize) {
            $('#goban').hide();
            CreateGoban(); 
        }

        // TODO affiche/masque curseur en fonction du mode

        // charge l'état du début de jeu
        LoadStones();
        LoadComments();

        // affiche l'interface
        ResizeGoban(true); // forcer le redimensionnement
        NavState();
        $('#goban').fadeIn();
        $('#comment').attr('class','button');
        com ? $('#comments').show() : $('#comments').hide();
        $('[class^="button"]:not(#load),#variations').show();
    });//}}}

});
