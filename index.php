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
        echo '<select>';
        for ($i = 0; $i < count($sgf_table); $i++) {
            echo '<option>' . $sgf_table[$i] . '</option>';
        }
        echo '</select>';
    }
}/*}}}*/

?>

<!DOCTYPE html>
<html lang="fr">
    <head>
        <title>Tsumego</title>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="tsumego.css" />
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
    </head>
    <body>
        <h1>Tsumego</h1>
        <div id="dev"></div>
        <table id="goban"></table>

        <?php ListeSgf(); ?>

        <script src="jquery.tsumego.js"></script>
    </body>
</html>