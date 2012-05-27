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
        <link rel="stylesheet" href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.18/themes/sunny/jquery-ui.css" />
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
        <script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.18/jquery-ui.min.js"></script>
    </head>
    <body>
        <table id="goban"></table>
        <div id="menu">
            <?php ListeSgf(); ?>
        </div>
        <div id="navbar">
            <input type="image" class="button" id="prev" src="images/prev.svg" />
            <input type="image" class="button" id="next" src="images/next.svg" />
            <input type="image" class="button" id="options" src="images/options.svg" />
        </div>
        <script src="jquery.tsumego.js"></script>
    </body>
</html>
