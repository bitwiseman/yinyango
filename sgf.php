<?php

include_once 'config.php';
include_once 'sgf.class.php';

//récupère le nom de fichier SGF
if (isset($_GET['file'])) {
    $file = $_GET['file'];
    //tester que le fichier existe
    if (file_exists($file)) {
        $sgf = new sgf(
            $file,
            $conf['db_hostname'],
            $conf['db_username'],
            $conf['db_password'],
            $conf['db_name']);
        $data = $sgf->getData();

        // renvoi le déroulement de la partie et la taille du goban encodé en json
        header('Content-type: application/json');
        echo json_encode($data);
    }
}
?>
