jQuery(document).ready(function($) {
    var taille_goban;

    $('#goban').hide(); // Cache le goban 

    // Ajuste la taille du goban en fonction de la fenêtre du navigateur {{{
    if ($(window).width() > $(window).height()) {
        taille_goban = Math.ceil(($(window).height() - 200) / 19) * 19;
    } else {
        taille_goban = Math.ceil(($(window).width() - 200) / 19) * 19;
    }
    $('#dev').html($(window).width() + 'x' + $(window).height());
    $('#goban').css('width',taille_goban + 'px');
    $('#goban').css('height',taille_goban + 'px'); //}}}

    // Redimensionne le goban avec la fenêtre du navigateur {{{
    $(window).resize(function() {
        if ($(window).width() > $(window).height()) {
            taille_goban = Math.ceil(($(window).height() - 200) / 19) * 19;
        } else {
            taille_goban = Math.ceil(($(window).width() - 200) / 19) * 19;
        }
        $('#dev').html($(window).width() + 'x' + $(window).height());
        $('#goban').css('width',taille_goban + 'px');
        $('#goban').css('height',taille_goban + 'px');
    }); //}}}

    // Formation des lignes et colonnes du goban en enregistrant la coordonnée dans un data {{{
    var coord = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s'];

    for (var i = 0; i < 19; i++) {
        $('#goban').append('<tr class="ligne' + i + '"></tr>');
        for (var j = 0; j < 19; j++) {
            $('.ligne' + i).append('<td class="jeunoir" data-coord="' + coord[j] + coord[i] + '"></td>');
        }
    } //}}}

    $('#goban').fadeIn(); // Affiche le goban progressivement

    // Retourne la coordonée sur le goban {{{
    $('#goban td').mouseover(function() {
        $('#dev').html($(this).data('coord'));
    }); //}}}
    
    // TODO: Récupérer la traduction du fichier SGF sous forme de tableau et l'afficher

    // Ebauche de fonctionnement AJAX
    $('#goban td').click(function() {
        var sgf_file = $("#sgflist").val();
        $.getJSON('sgf.php', { file: sgf_file }, function(data) {
            $('#dev').hide();
            $('#dev').html(data[0][0]['SZ']);
            $('#dev').fadeIn();
        debugger;
        });
    });

});
