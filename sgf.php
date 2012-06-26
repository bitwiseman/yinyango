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
// TODO ajout de fichier SGF
if (isset($_GET['file'])) {/*{{{*/
    $file = $_GET['file'];
    //tester que le fichier existe
    if (file_exists($file)) {
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
if (isset($_GET['sql'])) {/*{{{*/
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
    // récupère la table par ordre décroissant
    $select = $db->prepare('SELECT * FROM sgf ORDER BY id DESC');
    $select->execute();
    $array = $select->fetchAll(PDO::FETCH_ASSOC);
    $select->closeCursor();
    $db = null; // ferme la connexion
    // renvoi le tout encodé en json
    header('Content-type: application/json');
    echo json_encode($array);
}/*}}}*/
?>
