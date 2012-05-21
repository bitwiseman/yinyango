jQuery(document).ready(function($) {
    var game;
    var size;

    var ResizeGoban = function() {
        var gobansize;

        if ($(window).width() > $(window).height()) {
            gobansize = Math.ceil(($(window).height() - $('#header').height() * 2) / size) * size;
        } else {
            gobansize = Math.ceil(($(window).width() - $('#header').height() * 2) / size) * size;
        }
        $('#goban').css('width',gobansize + 'px');
        $('#goban').css('height',gobansize + 'px');
    };

    // Redimensionne le goban avec la fenêtre du navigateur 
    $(window).resize(function() {
        ResizeGoban(); 
    }); 

    // Récupère la traduction du fichier SGF sous forme de tableau et l'affiche
    $('#loadsgf').click(function() {
        var sgf_file = 'sgf/' + $("#sgflist").val();
        $.getJSON('sgf.php', { file: sgf_file }, function(data) {
            game = data.game;
            size = data.size;

            $('#goban').hide(); // Cache le goban 
            $('#goban').css('background-image', 'url(images/goban' + size + '.svg)');

            // Ajuste la taille du goban en fonction de la fenêtre du navigateur 
            ResizeGoban(); 

            // Formation des lignes et colonnes du goban en enregistrant la coordonnée dans un data 
            $('#goban').html(''); // supprime l'ancien goban
            var coord = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s'];

            for (var i = 0; i < size; i++) {
                $('#goban').append('<tr class="line' + i + '"></tr>');
                for (var j = 0; j < size; j++) {
                    $('.line' + i).append('<td class="whitep" data-coord="' + coord[j] + coord[i] + '"></td>');
                }
            }

            $('#goban').fadeIn(); // Affiche le goban progressivement
        });
    });

});
