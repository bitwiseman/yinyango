jQuery(document).ready(function($) {
    var taille_goban;

    //Redimensionne le goban avec la fenêtre du navigateur
    $(window).resize(function() {
        if ($(window).width() > $(window).height()) {
            taille_goban = Math.ceil(($(window).height()-200)/19)*19;
        }
        else {
            taille_goban = Math.ceil(($(window).width()-200)/19)*19;
        }
        $('#dev').html($(window).width() + 'x' + $(window).height());
        $('#goban').css('width',taille_goban + 'px');
        $('#goban').css('height',taille_goban + 'px');
    });

    if ($(window).width() > $(window).height()) {
        taille_goban = Math.ceil(($(window).height()-200)/19)*19;
    }
    else {
        taille_goban = Math.ceil(($(window).width()-200)/19)*19;
    }
    $('#dev').html($(window).width() + 'x' + $(window).height());
    $('#goban').css('width',taille_goban + 'px');
    $('#goban').css('height',taille_goban + 'px');
    $('#goban').hide();
    for (i=0; i<19; i++) {
        $('#goban').append("<tr class=\"ligne\"></tr>");
    }
    for (i=0; i<19; i++) {
        $('.ligne').append("<td class=\"jeunoir\"></td>");
    }
    $('#goban').fadeIn();

    //Retourne la coordonée sur le goban
    $('#goban td').mouseover(function() {
        $('#dev').html(this.cellIndex+'x'+this.parentNode.rowIndex);
    });

});
