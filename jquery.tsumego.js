jQuery(document).ready(function($) {
    var gobansize;
    var game;
    var size;

    $('#goban').hide(); // Cache le goban 

    // Ajuste la taille du goban en fonction de la fenêtre du navigateur 
    if ($(window).width() > $(window).height()) {
        gobansize = Math.ceil(($(window).height() - 200) / size) * size;
    } else {
        gobansize = Math.ceil(($(window).width() - 200) / size) * size;
    }
    $('#goban').css('width',gobansize + 'px');
    $('#goban').css('height',gobansize + 'px'); 

    // Redimensionne le goban avec la fenêtre du navigateur 
    $(window).resize(function() {
        if ($(window).width() > $(window).height()) {
            gobansize = Math.ceil(($(window).height() - 200) / size) * size;
        } else {
            gobansize = Math.ceil(($(window).width() - 200) / size) * size;
        }
        $('#goban').css('width',gobansize + 'px');
        $('#goban').css('height',gobansize + 'px');
    }); 

    // Formation des lignes et colonnes du goban en enregistrant la coordonnée dans un data 
    var coord = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s'];

    for (var i = 0; i < size; i++) {
        $('#goban').append('<tr class="ligne' + i + '"></tr>');
        for (var j = 0; j < size; j++) {
            $('.ligne' + i).append('<td class="jeunoir" data-coord="' + coord[j] + coord[i] + '"></td>');
        }
    } 

    // Retourne la coordonée sur le goban 
    $('#goban td').mouseover(function() {
        //$('#dev').html($(this).data('coord'));
    }); 
    
    // Récupère la traduction du fichier SGF sous forme de tableau et l'affiche
    $('#load_sgf').click(function() {
        var sgf_file = 'sgf/' + $("#sgflist").val();
        $.getJSON('sgf.php', { file: sgf_file }, function(data) {
            game = data.game;
            size = data.size;
            $('#dev').html(size);
            if (size == 19) {
                $('#goban').fadeIn(); // Affiche le goban progressivement
            }
            else {
                $('#goban').hide(); // Cache le goban 
            }
        });
    });

});
