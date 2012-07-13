<?php
/**
 * Communication file between user and database.
 *
 * PHP version 5
 *
 * @category PHP
 * @package  Yinyanggo
 * @author   hickop <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0
 * @link     https://github.com/hickop/yinyanggo
 */
require_once 'config.php';
require_once 'Sgf.class.php';

/** connectDatabase {{{
 * Connect to datase and return pdo object.
 *
 * @return {object} Pdo object of the connection.
 */
function connectDatabase() 
{
    global $config;
    static $pdo;

    if (!$pdo) {
        $pdo = new PDO(
            $config['db_reference'],
            $config['db_login'],
            $config['db_pass']
        );
    }

    return $pdo;
}
/*}}}*/

/** createTables {{{
 * Create tables if they doe not exist.
 *
 * @return {null}
 */
function createTables()
{
    $database = connectDatabase();

    $create = 'CREATE TABLE IF NOT EXISTS `sgf` (' .
        '`id` int(11) NOT NULL AUTO_INCREMENT,' .
        '`file` text NOT NULL,' .
        '`infos` text NOT NULL,' .
        '`comments` text NOT NULL,' .
        '`symbols` text NOT NULL,' .
        '`game` text NOT NULL,' .
        'PRIMARY KEY (`id`))';

    $database->exec($create);
    $database = null; // Close connection.

    return null;
}
/*}}}*/

/** getList {{{
 * Get the games list from database.
 *
 * @param {integer} $limit Limit of the files to get.
 *
 * @return {array} Games list.
 */
function getList($limit)
{
    $list = [];

    if ($limit >= 0 || $limit == -1) {

        $database = connectDatabase();

        // TODO Load last user game.
        if ($limit == -1) {
            // Introduction game.
            $select = $database->prepare(
                'SELECT * FROM sgf ' .
                'WHERE id=1'
            );
        } else {
            // Get the last 10 saved games.
            $select = $database->prepare(
                'SELECT * FROM sgf ' .
                'ORDER BY id DESC LIMIT ' . $limit . ', 10'
            );
        }
        $select->execute();
        $list = $select->fetchAll(PDO::FETCH_ASSOC);
        $select->closeCursor();

        $database = null;
    }
    return $list;
}
/*}}}*/

/** saveToDatabase {{{
 * Check received file and try to save it in database.
 *
 * @return {string} Response to be sent to user.
 */
function saveToDatabase()
{
    global $config;
    $tempname = $_FILES['sgf']['tmp_name'];
    $name = $_FILES['sgf']['name'];
    $file = 'sgf/' . $name;
    $answer = '';

    // Check file with sgfc.
    $sgfc = rtrim(shell_exec('bin/sgfc ' . $tempname));
    $test = substr($sgfc, -2); // 'OK' if valid.

    if ($test === 'OK') {
        // Move file if it does not already exist.
        if (!file_exists($file)) {
            move_uploaded_file($tempname, $file);
        }
        // Try to save file in database.
        $sgf = new Sgf();
        $sent = $sgf->saveFile(
            $file,
            $config['db_reference'],
            $config['db_login'],
            $config['db_pass']
        );
        if ($sent) {
            $answer = 'success';
        } else {
            $answer = 'exist';
        }
    } else {
        $answer = 'invalid';
    }
    return $answer;
}
/*}}}*/

if (isset($_GET['createtables'])) {
    createTables();
}
if (isset($_GET['list'])) {
    $limit = intval($_GET['list']);
    $list = getList($limit);
    header('Content-type: application/json');
    echo json_encode($list);
}
if (isset($_FILES['sgf']['name'])) {
    $response = saveToDatabase();
    echo $response;
}
?>
