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

    var json_simple = {branche0:{noeud0:{GM:"1",FF:"4",CA:"UTF-8",AP:"CGoban:3",ST:"2",RU:"Japanese",SZ:"19",KM:"0.00",PW:"Blanc",PB:"Noir"},noeud1:{B:"pp"},noeud2:{W:"dd"},noeud3:{B:"pc"},noeud4:{W:"cq"},noeud5:{B:"fc"}}};

    console.log(json_simple);

    // Ebauche de fonctionnement AJAX
    $('#goban td').click(function() {
        $.getJSON('data.php', { test: "ajax ça roule !" + $(this).data('coord') }, function(data) {
            $('#dev').hide();
            $('#dev').html(data.Retour);
            $('#dev').fadeIn();
        });
    });

});
