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
        echo '<select id="sgflist">';
        for ($i = 0; $i < count($sgf_table); $i++) {
            echo '<option>' . $sgf_table[$i] . '</option>';
        }
        echo '</select>';
        echo '<button id="loadsgf">charger</button>';
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
            <div class="button" id="comment"></div>
            <div class="button" id="load"></div>
            <div class="button" id="start"></div>
            <div class="button" id="fastprev"></div>
            <div class="button" id="prev"></div>
            <div class="button" id="next"></div>
            <div class="button" id="fastnext"></div>
            <div class="button" id="end"></div>
            <div class="button" id="options"></div>
        </div>
        <div id="loadlist"></div>
        <table id="goban"></table>
        <div id="comments">
            <div id="resizer"></div>
            <div id="textarea"></div>
        </div>
        <script src="jquery.tsumego.js"></script>
    </body>
</html>
