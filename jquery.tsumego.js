jQuery(document).ready(function($) {
    var game;
    var size;
    var node;
    var branch;
    var coord = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s'];
    var com = false;

    // ajuste l'interface en fonction de la fenêtre du navigateur
    var ResizeGoban = function() {//{{{
        var gobansize;
        var navbarsize;
        var winw = $(window).width();
        var winh = $(window).height();
        var sizeb = parseInt(size) + 2; // ajout des bordures

        if (winw >= winh) {
            navbarsize = winh * 0.1; // encombrement 10%
            gobansize = Math.floor((winh - navbarsize) / sizeb) * sizeb;
            navbarsize = winh - gobansize;
            $('#navbar').css({
                top: '',
                right: '',
                bottom: 0,
                left: 0,
                width: gobansize,
                height: navbarsize
            });
            $('.button').css({
                width: '10%',
                height: ''
            });
            $('#infos').css({
                top: 0,
                right: 0,
                bottom: 0,
                left: '',
                width: winw - gobansize,
                height: ''
            });
        } else {
            navbarsize = winw * 0.1;
            gobansize = Math.floor((winw - navbarsize) / sizeb) * sizeb;
            navbarsize = winw - gobansize;
            $('#navbar').css({
                top: 0,
                right: 0,
                bottom: '',
                left: '',
                width: navbarsize,
                height: gobansize
            });
            $('.button').css({
                width: '',
                height: '10%'
            });
            $('#infos').css({
                top: '',
                right: 0,
                bottom: 0,
                left: 0,
                width: '',
                height: winh - gobansize
            });
        }
        $('#goban').css({ width: gobansize + 'px', height: gobansize + 'px' });
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
    var ClearGoban = function() {
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                $('#' + coord[j] + coord[i]).removeAttr('class');
            }
        }
    };

    /**
     * INITIALISATION
     */

    $('#goban').hide();
    $('#navbar').hide();
    $('#comments').hide();
    $('#comment').attr('disabled','disabled');

    /**
     * EVENEMENTS
     */

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

    // bouton options
    $('#options').click(function() {
        $('#comments').hide();
        $('#menu').fadeIn(); 
    });
    
    // bouton commentaires
    $('#comment').click(function() {

    });

    // bouton retour
    $('#back').click(function() {
        $('#menu').hide();
        $('#comments').fadeIn();
    });

    // passage à l'état suivant
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

    // retour à l'état précédent
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

    // récupère la traduction du fichier SGF sous forme de tableau et l'affiche
    $('#loadsgf').click(function() {//{{{
        var sgf_file = 'sgf/' + $("#sgflist").val();
        var black;
        var white;
        var oldsize = size;

        $.getJSON('sgf.php', { file: sgf_file }, function(data) {
            game = data.game;
            size = data.size;

            $('#goban').hide();
            $('#menu').hide();
            $('#comments').hide();
            $('#next,#prev').attr('disabled','disabled');
            $('#goban').css('background-image', 'url(images/goban' + size + '.svg)');
            
            if (size != oldsize) {
                ResizeGoban();
            }

            // formation des cellules du goban en identifiant la coordonnée 
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
            
            $('td[id]').attr('class','blacks'); // TODO affiche/masque curseur en fonction du mode

            node = 0;
            branch = 0; 

            // affiche l'état du début de jeu
            if (game[node] != null) {
                PlaceStones(); 
            };
            
            // affiche l'interface
            $('#goban').fadeIn();
            $('#navbar').fadeIn();
            $('#comments').fadeIn();
            if (game[node+1] != null) {
                $('#next').removeAttr('disabled');
            }
        });
    });//}}}

});
