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

function connectDatabase() 
{
    return null;
}

/** createTable {{{
 * Create database/table if they do not exist.
 *
 * @return {null}
 */
function createTable()
{
    global $conf;

    try {
        $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
        $db = new PDO(
            $conf['db_type'] . ':host=' .
            $conf['db_hostname'],
            $conf['db_username'],
            $conf['db_password'],
            $pdo_options
        );
    } catch (Exception $e) {
        die('Error: ' . $e->getMessage());
    }
    $create = 'CREATE DATABASE IF NOT EXISTS `' . $conf['db_name'] . '`;' .
        'USE `' . $conf['db_name'] . '`;' .
        'CREATE TABLE IF NOT EXISTS `sgf` (' .
        '`id` int(11) NOT NULL AUTO_INCREMENT,' .
        '`file` text NOT NULL,' .
        '`infos` text NOT NULL,' .
        '`comments` text NOT NULL,' .
        '`symbols` text NOT NULL,' .
        '`game` text NOT NULL,' .
        'PRIMARY KEY (`id`))';
    $db->exec($create);
    $db = null; // Close connection.
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
    global $conf;
    $list = [];

    if ($limit >= 0 || $limit == -1) {
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
            die('Error: ' . $e->getMessage());
        }
        // TODO Load last user game.
        if ($limit == -1) {
            // Introduction game.
            $select = $db->prepare(
                'SELECT * FROM sgf ' .
                'WHERE id=1'
            );
        } else {
            // Get the last 10 saved games.
            $select = $db->prepare(
                'SELECT * FROM sgf ' .
                'ORDER BY id DESC LIMIT ' . $limit . ', 10'
            );
        }
        $select->execute();
        $list = $select->fetchAll(PDO::FETCH_ASSOC);
        $select->closeCursor();
        $db = null;
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
    global $conf;
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
            $conf['db_hostname'],
            $conf['db_username'],
            $conf['db_password'],
            $conf['db_name']
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

if (isset($_GET['createtable'])) {
    createTable();
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
