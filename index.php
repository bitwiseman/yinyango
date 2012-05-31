<?php

//fait une liste <select> des fichiers SGF
function ListeSgf() {/*{{{*/
    $sgf_dir = opendir(dirname(__FILE__).'/sgf') or die;
    $sgf_table = array();

    while (false !== ($source = readdir($sgf_dir))) {
        if ($source != ".." && $source[0] != '.') {
            $sgf_table[] = $source;
            sort($sgf_table); //tri alphabétique
        }
    }

    if (!empty($sgf_table)) {
        echo '<select class="button" id="sgflist">';
        for ($i = 0; $i < count($sgf_table); $i++) {
            echo '<option>' . $sgf_table[$i] . '</option>';
        }
        echo '</select>';
        echo '<button class="button" id="loadsgf">charger</button>';
    }
}/*}}}*/

?>

<!DOCTYPE html>
<html lang="fr">
    <head>
        <title id="title">Tsumego</title>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="tsumego.css" />
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
    </head>
    <body>
        <div id="navbar">
            <input type="image" class="button" id="comment" src="images/comment.png" />
            <input type="image" class="button" id="start" src="images/start.png" />
            <input type="image" class="button" id="fastprev" src="images/fastprev.png" />
            <input type="image" class="button" id="prev" src="images/prev.png" />
            <input type="image" class="button" id="next" src="images/next.png" />
            <input type="image" class="button" id="fastnext" src="images/fastnext.png" />
            <input type="image" class="button" id="end" src="images/end.png" />
            <input type="image" class="button" id="options" src="images/options.png" />
            <div id="loadlist"><?php ListeSgf(); ?></div>
        </div>
        <table id="goban"></table>
        <div id="comments">
            <div id="resizer"></div>
            <textarea readonly>
Portez ce vieux whisky au juge blond qui fume sur son île intérieure, à
côté de l'alcôve ovoïde, où les bûches se consument dans l'âtre, ce
qui lui permet de penser à la cænogenèse de l'être dont il est question
dans la cause ambiguë entendue à Moÿ, dans un capharnaüm qui,
pense-t-il, diminue çà et là la qualité de son œuvre. 

l'île exiguë
Où l'obèse jury mûr
Fête l'haï volapük,
Âne ex aéquo au whist,
Ôtez ce vœu déçu.

Le cœur déçu mais l'âme plutôt naïve, Louÿs rêva de crapaüter en
canoë au delà des îles, près du mälström où brûlent les novæ.

1 2 3 4 5 6 7 8 9 0 + * / % = € $ £
< > ( ) [ ] { } « » " ' , ? ; . : !
& ~ # | _ \ ^ @ ° ø % µ þ ß ð © ↓ →
            </textarea>
        </div>
        <script src="jquery.tsumego.js"></script>
    </body>
</html>
