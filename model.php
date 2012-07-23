<?php
/**
 * Communication file between user and database.
 *
 * PHP version 5
 *
 * @category PHP
 * @package  Yinyanggo
 * @author   Mathieu Quinette <hickop@gmail.com>
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

    if ($limit >= 0) {

        $database = connectDatabase();

        // Get the last 10 saved games.
        $select = $database->prepare(
            'SELECT * FROM sgf ' .
            'ORDER BY id DESC LIMIT ' . $limit . ', 10'
        );

        $select->execute();
        $list = $select->fetchAll();
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
        // Check if file is already in database.
        $database = connectDatabase();

        $select = $database->prepare('SELECT * FROM sgf WHERE file=?');
        $select->execute(array($file));
        $vars = $select->fetch();
        $select->closeCursor();
        if (!empty($vars)) {
            $answer = 'exist';
        } else {
            // Parse sgf file, get data and save it to database.
            $sgf = new Sgf($file);
            $data = $sgf->getData();

            $insert = $database->prepare(
                'INSERT INTO sgf(file, game) VALUES(:file, :game)'
            );
            // Send data encoded in json format.
            $insert->execute(['file' => $file, 'game' => $data]);
            $answer = 'success';
        }
        $database = null; // Close connection.
    } else { // Sgfc reports other than 'OK'.
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
if (isset($_GET['test'])) {
    $sgf = new Sgf($_GET['test']);
}

?>
