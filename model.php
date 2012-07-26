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
        '`id` int(11) NOT NULL AUTO_INCREMENT,' .
        '`file` TEXT NOT NULL,' .
        '`game` TEXT NOT NULL,' .
        '`sender` VARCHAR(15) NOT NULL,' .
        'PRIMARY KEY (`id`))';

    $createusers = 'CREATE TABLE IF NOT EXISTS `users` (' .
        '`id` int(11) NOT NULL AUTO_INCREMENT,' .
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
            'ORDER BY id DESC LIMIT ' . $limit * 10 . ', 10'
        );

        $select->execute();
        $list = $select->fetchAll();
        $select->closeCursor();

        $database = null;
    }
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
    $name = $_FILES['sgf']['name'];
    $file = 'sgf/' . $name;
    $answer = '';

    // Only logged users can send files.
    if (isset($_SESSION['nickname'])) {
        $sender = $_SESSION['nickname'];

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
            $select->execute([$file]);
            $exist = $select->fetch();
            $select->closeCursor();
            if (!empty($exist)) {
                $answer = 'exist';
            } else {
                // Parse sgf file, get data and save it to database.
                $sgf = new Sgf($file);
                $data = $sgf->getData();

                $insert = $database->prepare(
                    'INSERT INTO sgf(file, game, sender) ' .
                    'VALUES(:file, :game, :sender)'
                );
                // Send data encoded in json format.
                $insert->execute(
                    ['file' => $file,
                    'game' => $data,
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
    $response = saveToDatabase();
    echo $response;
}
if (isset($_GET['createtables'])) {
    createTables();
}
if (isset($_GET['list'])) {
    $limit = intval($_GET['list']);
    $list = getList($limit);
    header('Content-type: application/json');
    echo json_encode($list);
}
if (isset($_GET['nickname'])) {
    $nickname = '';

    if (isset($_SESSION['nickname'])) {
        $nickname = $_SESSION['nickname'];
    }
    header('Content-type: application/json');
    echo json_encode($nickname);
}
if (isset($_POST['logname'])) {
    $response = loginUser();
    echo $response;
}
if (isset($_POST['logout'])) {
    session_destroy();
    echo 'logout';
}
if (isset($_POST['regname'])) {
    $response = registerUser();
    echo $response;
}

if (isset($_GET['test'])) {
    $sgf = new Sgf($_GET['test']);
}
?>
