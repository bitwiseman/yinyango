jQuery(document).ready(function($) {
    var game;
    var size;
    var node;
    var branch;
    var coord = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s'];

    // ajuste la taille du goban en fonction de la fenêtre du navigateur 
    var ResizeGoban = function() {
        var gobansize;

        if ($(window).width() > $(window).height()) {
            gobansize = Math.floor($(window).height() / size) * size;
        } else {
            gobansize = Math.floor($(window).width() / size) * size;
        }
        $('#goban').css('width',gobansize + 'px');
        $('#goban').css('height',gobansize + 'px');
    };

    // place les pierres de l'état actuel
    var PlaceStones = function() {
        black = game[node][branch]['b'].split(',');
        white = game[node][branch]['w'].split(',');
        played = game[node][branch]['p'].split(',');
        playedcolor = (played[0] == 'b') ? 'black' : 'white';
        for (var b = 0, cb = black.length; b < cb; b++) {
            $('#' + black[b]).attr('class','black');
        };
        for (var w = 0, cw = white.length; w < cw; w++) {
            $('#' + white[w]).attr('class','white');
        };
        $('#' + played[1]).attr('class',playedcolor + 'p'); // visualiser la dernière pierre jouée
    };

    // vide le goban de toutes ses pierres
    var ClearGoban = function() {
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                $('#' + coord[j] + coord[i]).attr('class','whites');
            }
        }
    };

    /**
     * INITIALISATION
     */

    // TODO images svg pour les boutons
    $('#prev').button({
        text: false,
        icons: {
            primary: "ui-icon-seek-prev"
        }
    });

    $('#next').button({
        text: false,
        icons: {
            primary: "ui-icon-seek-next"
        }
    });

    $('#next').attr('disabled','disabled');
    $('#prev').attr('disabled','disabled');

    /**
     * EVENEMENTS
     */

    /*$(window).resize(function() {
        ResizeGoban(); 
    }); */
    
    // touche enfoncée
    $(window).keydown(function(event) {//{{{
        if (event.which == 17) { // touche ctrl
            $('#goban').draggable();
            $('#navbar').draggable();
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
            $('#navbar').draggable('destroy');
        }
        if (event.which == 18) { // touche alt
            $('#goban').resizable('destroy');
            $('#navbar').resizable('destroy');
        }
    });//}}}

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

        $.getJSON('sgf.php', { file: sgf_file }, function(data) {
            game = data.game;
            size = data.size;

            $('#goban').hide(); // cache le goban 
            $('#goban').css('background-image', 'url(images/goban' + size + '.svg)');
            
            if ($('#goban').css('width') == '0px') {
                ResizeGoban();
            };

            // formation des lignes et colonnes du goban en enregistrant la coordonnée 
            $('#goban').html(''); // supprime l'ancien goban

            for (var i = 0; i < size; i++) {
                $('#goban').append('<tr class="line' + i + '"></tr>');
                for (var j = 0; j < size; j++) {
                    $('.line' + i).append('<td class="whites" id="' + coord[j] + coord[i] + '"></td>');
                }
            }

            node = 0;
            branch = 0; 

            // affiche l'état du début de jeu
            if (game[node] != null) {
                PlaceStones(); 
            };

            $('#goban').fadeIn(); // affiche le goban progressivement
            $('#next').removeAttr('disabled');
            $('#navbar').fadeIn(); // affiche la barre de navigation
        });
    });//}}}

});
