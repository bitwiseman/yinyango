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

session_start();

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

    $createsgf = 'CREATE TABLE IF NOT EXISTS `sgf` (' .
        '`id` INT(11) NOT NULL AUTO_INCREMENT,' .
        '`name` TEXT NOT NULL,' .
        '`md5` CHAR(32) NOT NULL,' .
        '`game` TEXT NOT NULL,' .
        '`sender` VARCHAR(15) NOT NULL,' .
        'PRIMARY KEY (`id`))';

    $createusers = 'CREATE TABLE IF NOT EXISTS `users` (' .
        '`id` INT(11) NOT NULL AUTO_INCREMENT,' .
        '`nick` VARCHAR(15) NOT NULL,' .
        '`hash` CHAR(128) NOT NULL,' .
        '`salt` CHAR(88) NOT NULL,' .
        '`mail` TEXT NOT NULL,' .
        'PRIMARY KEY (`id`))';

    $database->exec($createsgf);
    $database->exec($createusers);
    $database = null; // Close connection.

    return null;
}
/*}}}*/

/** echoJson {{{
 * Echo json data in response of an ajax request.
 *
 * @param {various} $data Data to be returned.
 * @return {null}
 */
function echoJson($data) 
{
    header('Content-type: application/json');
    echo json_encode($data);

    return null;
}
/*}}}*/

/** getGame {{{
 * Get the game data from database corresponding to id.
 *
 * @param {integer} $id Game id to retrieve data.
 *
 * @return {array} Game data.
 */
function getGame($id)
{
    $game = [];

    if ($id >= 1) {

        $database = connectDatabase();

        $select = $database->prepare('SELECT game FROM sgf WHERE id=?');

        $select->execute([$id]);
        $game = $select->fetch(PDO::FETCH_ASSOC);
        $select->closeCursor();

        $database = null;
    }
    return $game['game'];
}
/*}}}*/

/** getList {{{
 * Get the games list from database.
 *
 * @return {array} Games list.
 */
function getList()
{
    $list = [];

    $database = connectDatabase();

    // Get games starting with latest added.
    $select = $database->prepare(
        'SELECT id, name, sender FROM sgf ORDER BY id DESC'
    );

    $select->execute();
    $list = $select->fetchAll(PDO::FETCH_ASSOC);
    $select->closeCursor();

    $database = null;

    return $list;
}
/*}}}*/

/** loginUser {{{
 * User login.
 *
 * @return {string} Response to send to user.
 */
function loginUser()
{
    $answer = '';
    $database = connectDatabase();

    // Quote to protect from SQL injection.
    $nickname = $database->quote($_POST['logname']);

    if (strlen($nickname) <= 17) {
        $select = $database->prepare(
            'SELECT hash, salt FROM users WHERE nick=?'
        );
        $select->execute([$nickname]);
        $user = $select->fetch();
        $select->closeCursor();

        if (!empty($user)) {
            // Compare hashs.
            $hash = hash('sha512', $user['salt'] . $_POST['logpass']);
            if ($hash == $user['hash']) {
                // Register nickname in session.
                $_SESSION['nickname'] = $_POST['logname'];
                $answer = 'login';
            } else {
                $answer = 'wrong';
            }
        } else {
            $answer = 'wrong';
        }
    }

    $database = null; // Close connection.
    return $answer;
}
/*}}}*/

/** registerUser {{{
 * Register user in database.
 *
 * @return {string} Response to send to user.
 */
function registerUser()
{
    $answer = '';

    // Check nickname for special characters.
    if (!ctype_alnum($_POST['regname'])) {
        return 'invalidnick';
    }
    // Check if mail syntax is valid.
    if (!filter_var($_POST['regmail'], FILTER_VALIDATE_EMAIL)) {
        return 'invalidmail';
    }
    
    $database = connectDatabase();

    // Quote to protect from SQL injection.
    $nickname = $database->quote($_POST['regname']);
    $mail = $database->quote($_POST['regmail']);
    // Generate salt to have unique password.
    $strong = false;
    while ($strong == false) {
        $salt = base64_encode(openssl_random_pseudo_bytes(64, $strong));
    }
    // Hash salt + password with sha512.
    $hash = hash('sha512', $salt . $_POST['regpass']);

    if (strlen($nickname) <= 15) {
        // Check if nickname already exist in database.
        $select = $database->prepare('SELECT * FROM users WHERE nick=?');
        $select->execute([$nickname]);
        $exist = $select->fetch();
        $select->closeCursor();
        if (!empty($exist)) {
            $answer = 'nickexist';
        } else {
            $insert = $database->prepare(
                'INSERT INTO users(nick, hash, salt, mail) ' .
                'VALUES(:nick, :hash, :salt, :mail)'
            );
            $insert->execute(
                ['nick' => $nickname,
                'hash' => $hash,
                'salt' => $salt,
                'mail' => $mail]
            );
            $answer = 'regsuccess';
        }
    }

    $database = null; // Close connection.
    return $answer;
}
/*}}}*/

/** saveToDatabase {{{
 * Check received file and try to save it in database.
 *
 * @return {string} Response to send to user.
 */
function saveToDatabase()
{
    global $config;
    $tempname = $_FILES['sgf']['tmp_name'];
    $name = preg_replace('/\.[^.]*$/', '', $_FILES['sgf']['name']);
    $md5 = md5_file($tempname);
    $answer = '';

    // Only logged users can send files.
    if (isset($_SESSION['nickname'])) {
        $sender = $_SESSION['nickname'];

        // Check file with sgfc.
        $sgfc = rtrim(shell_exec('bin/sgfc ' . $tempname));
        $test = substr($sgfc, -2); // 'OK' if valid.

        if ($test === 'OK') {
            // Check if file is already in database with its md5 hash.
            $database = connectDatabase();

            $select = $database->prepare('SELECT md5 FROM sgf WHERE md5=?');
            $select->execute([$md5]);
            $exist = $select->fetch();
            $select->closeCursor();
            if (!empty($exist)) {
                $answer = 'sgfexist';
            } else {
                // Parse sgf file, get data and save it to database.
                $sgf = new Sgf($tempname);
                $game = $sgf->getGame();

                $insert = $database->prepare(
                    'INSERT INTO sgf(name, md5, game, sender) ' .
                    'VALUES(:name, :md5, :game, :sender)'
                );
                // Send data encoded in json format.
                $insert->execute(
                    ['name' => $name,
                    'md5' => $md5,
                    'game' => $game,
                    'sender' => $sender]
                );
                $answer = 'sendsuccess';
            }
            $database = null; // Close connection.
        } else { // Sgfc reports other than 'OK'.
            $answer = 'invalidsgf';
        }
    }
    return $answer;
}
/*}}}*/

if (isset($_FILES['sgf']['name'])) {
    echo saveToDatabase();
}
if (isset($_GET['createtables'])) {
    createTables();
}
if (isset($_GET['game'])) {
    echo getGame($_GET['game']);
}
if (isset($_GET['list'])) {
    echoJson(getList());
}
if (isset($_GET['nickname'])) {
    $nickname = '';

    if (isset($_SESSION['nickname'])) {
        $nickname = $_SESSION['nickname'];
    }
    echoJson($nickname);
}
if (isset($_POST['login'])) {
    echo loginUser();
}
if (isset($_POST['logout'])) {
    session_destroy();
    echo 'logout';
}
if (isset($_POST['register'])) {
    echo registerUser();
}

if (isset($_GET['test'])) {
    $sgf = new Sgf($_GET['test']);
}
?>
