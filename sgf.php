<?php
include_once 'config.php';
include_once 'sgf.class.php';

if (isset($_GET['createtable'])) {/*{{{*/
    // connexion base de données
    try {
        $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
        $db = new PDO(
            'mysql:host=' .
            $conf['db_hostname'],
            $conf['db_username'],
            $conf['db_password'],
            $pdo_options
        );
    } catch (Exception $e) {
        die('Erreur : ' . $e->getMessage());
    }
    // création de la table si non existante
    $create = 'CREATE DATABASE IF NOT EXISTS `' . $conf['db_name'] . '`;
              USE `' . $conf['db_name'] . '`;
              CREATE TABLE IF NOT EXISTS `sgf` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `file` text NOT NULL,
              `infos` text NOT NULL,
              `comments` text NOT NULL,
              `symbols` text NOT NULL,
              `game` text NOT NULL,
              PRIMARY KEY (`id`)
              )';
    $db->exec($create);
    $db = null; // ferme la connexion

}/*}}}*/
// envoi de fichier SGF
if (isset($_FILES['sgf']['name'])) {/*{{{*/

    $file = 'sgf/'.$_FILES['sgf']['name'];

    // vérifie le fichier envoyé avec SGFC
    $sgfc = rtrim(shell_exec('bin/sgfc ' . $_FILES['sgf']['tmp_name']));
    $test = substr($sgfc,-2); // 'OK' si valide

    if ($test == 'OK') {
        // test si le fichier existe déjà
        if (!file_exists($file)) {
            move_uploaded_file($_FILES['sgf']['tmp_name'],$file);
        }
        // enregistre le fichier dans la base de données
        $sgf = new sgf(
            $file,
            $conf['db_hostname'],
            $conf['db_username'],
            $conf['db_password'],
            $conf['db_name']
        );
    }
}/*}}}*/
// récupère la table SQL
if (isset($_GET['list'])) {/*{{{*/

    $lim = intval($_GET['list']);

    if ($lim >= 0 || $lim == -1) {
        // connexion base de données
        try {
            $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
            $db = new PDO(
                'mysql:host=' .
                $conf['db_hostname'] .
                ';dbname=' .
                $conf['db_name'],
                $conf['db_username'],
                $conf['db_password'],
                $pdo_options
            );
        } catch (Exception $e) {
            die('Erreur : ' . $e->getMessage());
        }
        // TODO charger la dernière partie de l'utilisateur
        if ($lim == -1) {
            // goban d'acceuil
            $select = $db->prepare('SELECT * FROM sgf ' .
                'WHERE id=1'
            );
        } else {
            // récupère les 10 derniers enregistrements
            $select = $db->prepare('SELECT * FROM sgf ' .
                'ORDER BY id DESC LIMIT ' . $lim . ', 10'
            );
        }
        $select->execute();
        $array = $select->fetchAll(PDO::FETCH_ASSOC);
        $select->closeCursor();
        $db = null; // ferme la connexion
        // renvoi le tout encodé en json
        header('Content-type: application/json');
        echo json_encode($array);
    }
}/*}}}*/
?>
