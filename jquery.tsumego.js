jQuery(document).ready(function($) {
    var game;
    var size;
    var node;
    var branch;
    var coord = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s'];
    var com = true; // commentaires

    // ajuste l'interface en fonction de la fenêtre du navigateur
    var ResizeGoban = function() {//{{{
        var heightleft; // hauteur restante pour le goban
        var winw = $(window).width();
        var winh = $(window).height();
        var sizeb = parseInt(size) + 2; // ajout des bordures

        if (com) {
            heightleft = winh - $('#navbar').outerHeight() - 200; // TODO infos redimensionnable
        } else {
            heightleft = winh - $('#navbar').outerHeight();
        }
        var smaller = (heightleft >= winw) ? winw : heightleft;
        var gobansize = Math.floor(smaller / sizeb) * sizeb;
        $('#goban').css({
            top: $('#navbar').outerHeight(),
            left: '50%',
            marginLeft: - (gobansize / 2),
            width: gobansize,
            height: gobansize
        });
        $('#comments').css({
            top: $('#navbar').outerHeight() + gobansize,
            right: 0,
            bottom: 0,
            left: 0,
        });
    };//}}}

    // place les pierres de l'état actuel
    var PlaceStones = function() {//{{{
        black = game[node][branch]['b'].split(',');
        white = game[node][branch]['w'].split(',');
        
        for (var b = 0, cb = black.length; b < cb; b++) {
            $('#' + black[b]).attr('class','black');
        };
        for (var w = 0, cw = white.length; w < cw; w++) {
            $('#' + white[w]).attr('class','white');
        };
        if (game[node][branch]['p'] != null) {
            played = game[node][branch]['p'].split(',');
            playedcolor = (played[0] == 'b') ? 'blackp' : 'whitep';
            $('#' + played[1]).attr('class',playedcolor); // visualiser la dernière pierre jouée
        }
    };//}}}

    // vide le goban de toutes ses pierres
    var ClearGoban = function() {//{{{
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                $('#' + coord[j] + coord[i]).removeAttr('class');
            }
        }
    };//}}}

    // création du goban en identifiant les coordonnées
    var CreateGoban = function() {//{{{
        $('#goban').html(''); // supprime l'ancien goban

        for (var i = -1; i <= size; i++) {
            $('#goban').append('<tr class="line' + i + '"></tr>');
            for (var j = -1; j <= size; j++) {
                if (i == -1 || i == size || (i != -1 && (j == -1 || j == size))) {
                    $('.line' + i).append('<td></td>'); // cellules vides pour les bordures
                } else {
                    $('.line' + i).append('<td id="' + coord[j] + coord[i] + '"></td>');
                }
            }
        }
    };//}}}

    /**
     * INITIALISATION
     */

    $('#goban').hide();
    $('#comments').hide();
    $('#loadlist').hide();
    $('#prev,#next,#comment').attr('disabled','disabled');

    /**
     * EVENEMENTS
     */
    
    // fenêtre du navigateur redimensionnée
    $(window).resize(function() {
        ResizeGoban(); 
    });

    // touche enfoncée
    $(window).keydown(function(event) {//{{{
        if (event.which == 17) { // touche ctrl
            $('#goban').draggable();
        }
        if (event.which == 18) { // touche alt
            $('#goban').resizable({
                grid: [size, size],
                aspectRatio: 1
            });
            $('#navbar').resizable();
        }
    });//}}}

    // touche relâchée
    $(window).keyup(function(event) {//{{{
        if (event.which == 17) { // touche ctrl
            $('#goban').draggable('destroy');
        }
        if (event.which == 18) { // touche alt
            $('#goban').resizable('destroy');
            $('#navbar').resizable('destroy');
        }
    });//}}}

    // bouton précédent
    $('#prev').click(function() {//{{{
        node--;
        $('#next').removeAttr('disabled');
        // test si on est au début de la branche
        if (node == 0) {
            $('#prev').attr('disabled','disabled');
        };
        ClearGoban();
        if (game[node] != null) {
            PlaceStones();
        };
    });//}}}

    // bouton suivant
    $('#next').click(function() {//{{{
        node++;
        $('#prev').removeAttr('disabled');
        // test si il existe un état suivant dans la branche actuelle
        if (game[node+1] == null || game[node+1][branch] == null) {
            $('#next').attr('disabled','disabled');
        };
        ClearGoban();
        if (game[node] != null) {
            PlaceStones();
        };
    });//}}}

    // bouton commentaires
    $('#comment').click(function() {
        com ? com = false : com = true;
        com ? $('#comments').show() : $('#comments').hide();
        ResizeGoban();
    });

    // bouton options
    $('#options').click(function() {
        $('#loadlist').fadeIn();
    });

    // bouton charger
    $('#loadsgf').click(function() {//{{{
        var sgf_file = 'sgf/' + $("#sgflist").val();
        var black;
        var white;
        var oldsize = size;

        // récupère la traduction du fichier SGF sous forme de tableau et l'affiche
        $.getJSON('sgf.php', { file: sgf_file }, function(data) {
            game = data.game;
            size = data.size;

            $('#loadlist').hide();
            $('#prev,#next').attr('disabled','disabled');
            $('#goban').css('background-image', 'url(images/goban' + size + '.svg)');
            
            if (size != oldsize) {
                $('#goban').hide();
                ResizeGoban();
                CreateGoban(); 
            } else {
                ClearGoban();
            }
            
            $('td[id]').attr('class','blacks'); // TODO affiche/masque curseur en fonction du mode

            node = 0;
            branch = 0; 

            // affiche l'état du début de jeu
            if (game[node] != null) {
                PlaceStones(); 
            };
            
            // affiche l'interface
            $('#goban').fadeIn();
            $('#comment').removeAttr('disabled');
            com ? $('#comments').show() : $('#comments').hide();
            if (game[node+1] != null) {
                $('#next').removeAttr('disabled');
            }
        });
    });//}}}

});
