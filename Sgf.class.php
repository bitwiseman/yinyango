<?php
/**
 * Class to treat sgf files.
 *
 * PHP version 5
 *
 * @category PHP
 * @package  Yinyanggo
 * @author   hickop <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0
 * @link     https://github.com/hickop/yinyanggo
 */
class Sgf
{
    private $_size;      // Size of goban (9, 13, 19).
    private $_infos;     // Informations about the game.
    private $_comments;  // Comments in the game.
    private $_symbols;   // Symbols/annotations on goban.
    private $_branchs;   // Total number of branchs.
    private $_game;      // Game states.
    private $_state;     // Game state at a given moment.
    private $_deads;     // Potential dead stones.
    private $_prison = Array('b' => 0, 'w' => 0); // Prisonners.

    /** __construct {{{
     *
     * @constructor
     */
    function __construct()
    {
        
    }
    /*}}}*/

    /** saveFile {{{
     * Save a file in database.
     *
     * @param {string} $file     File to save.
     * @param {string} $hostname Server url.
     * @param {string} $dbuser   Login.
     * @param {string} $dbpass   Password.
     * @param {string} $dbname   Name of database. 
     *
     * @return {boolean} FALSE if file exist.
     */ 
    public function saveFile($file, $hostname, $dbuser, $dbpass, $dbname)
    {
        // Connect to database.
        try {
            $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
            $db = new PDO(
                'mysql:host=' . $hostname . ';dbname=' . $dbname,
                $dbuser,
                $dbpass,
                $pdo_options
            );
        } catch (Exception $e) {
            die('Erreur : ' . $e->getMessage());
        }

        // Check if file is already in database.
        $select = $db->prepare('SELECT * FROM sgf WHERE file=?');
        $select->execute(array($file));
        $vars = $select->fetch();
        $select->closeCursor();
        if (!empty($vars)) {
            return false;
        } else {
            // Read the file and prepare data to be sent.
            $data = $this->sgfToTab($file);
            $this->_infos = $data[0][0];
            $this->_size = $this->_infos['SZ'];
            $this->gameTable($data);
            $this->_infos['branchs'] = $this->_branchs;

            $insert = $db->prepare(
                'INSERT INTO sgf(file, infos, comments, symbols, game)' .
                'VALUES(:file, :infos, :comments, :symbols, :game)'
            );
            // Send data encoded in json format.
            $insert->execute(
                array('file' => $file,
                'infos' => json_encode($this->_infos),
                'comments' => json_encode($this->_comments),
                'symbols' => json_encode($this->_symbols),
                'game' => json_encode($this->_game))
            );
        }
        $db = null; // Close connexion.
        return true;
    }
    /*}}}*/

    /** sgfToTab {{{
     * Read a sgf file and register keys/values in an array.
     *
     * @param {string} $file Sgf file.
     *
     * @return {array} Array containing sgf data.
     */
    protected function sgfToTab($file)
    {
        $tab = [];          // Array containing data.

        $branch = -1;       // Current branch.
        $escape = false;    // Escape character.
        $isstart = true;    // Branch start.
        $isval = false;     // We are getting a value.
        $key = '';          // Current registered key.
        $mark = 0;          // Marks counter.
        $node = -1;         // Current node.
        $nodemark = [-1];   // Marks table.
        $prevkey = '';      // Previous key in case of multiple values.
        $val = '';          // Current registered value.

        $handle = fopen($file, "r"); // Open file read only.

        while (!feof($handle)) { // Read file character by character.
            $char = fgetc($handle); // Current character.
            switch ($char) {
            case '\\': // Escape character.
                if ($escape) {
                    // We had a previous escape character so register that one
                    // in value.
                    $val .= '\\';
                    $escape = false;
                } else {
                    $escape = true;
                }
                break;
            case '(': // Value, start of branch or mark ?
                if ($isval) {
                    // We are registering a value so add it to value.
                    $val .= $char;
                } else if ($isstart) {
                    // Start a new branch.
                    $branch++;
                    $node = $nodemark[$mark];
                    $isstart = false;
                } else {
                    // This is a new mark.
                    $mark++;
                    $nodemark[$mark] = $node;
                }
                break;
            case ')': // Value or end of branch ?
                if ($isval) {
                    // We are registering a value so add it to value.
                    $val .= $char;
                } else if ($isstart) {
                    // End of branch already reached, get one mark down.
                    $mark--;
                } else {
                    // This is the end of a branch.
                    $isstart = true;
                }
                break;
            case ';': // Value or new node ?
                if ($isval) {
                    // We are registering a value so add it to value.
                    $val .= $char;
                } else {
                    // New node.
                    $node++; 
                }
                break;
            case '[': // Value or start of value ?
                if ($isval) {
                    // We are registering a value so add it to value.
                    $val .= $char;
                } else {
                    // Start registering value.
                    $isval = true;
                }
                break;
            case ']': // Value or end of value ?
                if ($escape) {
                    // Escaped so it has to be registered in value.
                    $val .= $char;
                    $escape = false;
                } else {
                    // End of value. Save it to the corresponding key.
                    if ($key == '') {
                        // Key was unset, save it into the previous key.
                        $tab[$node][$branch][$prevkey] .= ','.$val;
                    } else {
                        // Key changed, save it in and unset key.
                        $tab[$node][$branch][$key] = $val;
                        $prevkey = $key;
                        $key = '';
                    }
                    $isval = false;
                    $val = ''; // Empty the value register.
                }
                break;
            default: // Register a key or a value.
                if ($isval) {
                    // Value.
                    if ($char == "\n") {
                        // Replace carriages returns with html format.
                        $val .= "<br />";
                    } else {
                        $val .= $char;
                    }
                } else if ($char != "\n") {
                    // Key. Do not register the carriages returns in keys.
                    $key .= $char;
                }
            }
        }
        $this->_branchs = $branch + 1;
        return $tab;
    }
    /*}}}*/

    /** gameTable {{{
     * Make game states according to the keys/values registered.
     *
     * @param {array} $table Array containing the sgf data.
     *
     * @return {null}
     */
    protected function gameTable($table)
    {
        for ($i = 0; $i <= $this->_branchs; $i++) {
            for ($j = 0; $j < sizeof($table); $j++) {
                if (isset($table[$j][$i])) {
                    // Always have an empty goban at least.
                    $this->_game[$j][$i]['b'] = '';
                    $this->_game[$j][$i]['w'] = '';
                    // Browse the keys and make actions.
                    foreach ($table[$j][$i] as $key => $value) {
                        switch ($key) {
                        case 'B': // Black play.
                            $this->playMove($j, $i, 'b', $value);
                            break;
                        case 'W': // White play.
                            $this->playMove($j, $i, 'w', $value);
                            break;
                        case 'AB': // Add black(s) stone(s).
                            $this->addStones($j, $i, 'b', $value);
                            break;
                        case 'AW': // Add white(s) stone(s).
                            $this->addStones($j, $i, 'w', $value);
                            break;
                        case 'AE': // Add empty. Remove stone(s).
                            $this->addStones($j, $i, '', $value);
                            break;
                        case 'CR': // Circle symbol.
                            $this->_symbols[$j][$i]['CR'] = $value;
                            break;
                        case 'SQ': // Square symbol.
                            $this->_symbols[$j][$i]['SQ'] = $value;
                            break;
                        case 'TR': // Triangle symbol.
                            $this->_symbols[$j][$i]['TR'] = $value;
                            break;
                        case 'LB': // Label.
                            $this->_symbols[$j][$i]['LB'] = $value;
                            break;
                        case 'C': // Comments.
                            $this->_comments[$j][$i] = $value;
                            break;
                        default:
                        }
                    }
                }
            }
        }
        return;
    }
    /*}}}*/

    /** addStones {{{
     * Add stones to goban state.
     *
     * @param {integer} $node   Node to add stone(s) to.
     * @param {integer} $branch Branch to add stone(s) to.
     * @param {string}  $color  Color of the stone(s) added (empty to remove).
     * @param {string}  $coords Coordinates in letters.
     *
     * @return {null}
     */
    protected function addStones($node, $branch, $color, $coords)
    {
        $b = $branch;
        $stones = explode(',', $coords);
        $cs = count($stones);

        while ($b >= 0) { // Look for previous state.
            if (isset($this->_game[$node-1][$b])) {
                // Get the previous state.
                $this->_state = $this->gobanState($node-1, $b);
                break;
            }
            $b--;
        }
        for ($i = 0; $i < $cs; $i++) {
            // Transform coordinates into numbers. 
            $x = ord(substr($stones[$i], 0, 1)) - 97;
            $y = ord(substr($stones[$i], 1, 1)) - 97;
            // Add stone(s)/empty to previous state.
            $this->_state[$x][$y] = $color; 
        }
        $this->stateToGame($node, $branch); // Save state into game.
        return;
    }
    /*}}}*/

    /** playMove {{{
     * Play a stone and caculate goban state based on previous state.
     *
     * @param {integer} $node   Node to play the stone.
     * @param {integer} $branch Branch to play the stone.
     * @param {string}  $color  Color of played stone.
     * @param {string}  $coord  Coordinate of played stone in letters.
     *
     * @return {null}
     */
    protected function playMove($node, $branch, $color, $coord)
    {
        $b = $branch;

        while ($b >= 0) { // Look for previous state.
            if (isset($this->_game[$node-1][$b])) {
                // Get previous state.
                $this->_state = $this->gobanState($node-1, $b);
                // Transform coordinates to numbers.
                $x = ord(substr($coord, 0, 1)) - 97;
                $y = ord(substr($coord, 1, 1)) - 97;
                // Add played stone to previous state.
                $this->_state[$x][$y] = $color;
                // Test if that makes deaths.
                $this->testDeath($color, $x, $y);
                // TODO Calculate KO
                $this->stateToGame($node, $branch); // Save state to game.
                break;
            }
            $b--;
        }
        // Add the played stone in game state so we can track it.
        $this->_game[$node][$branch]['p'] = $color.','.$coord;
        return;
    }
    /*}}}*/

    /** gobanState {{{
     * Get the state at a given node/branch.
     *
     * @param {integer} $node   Node to get state at.
     * @param {integer} $branch Branch to get state at.
     *
     * @return {array} State of the game.
     */
    protected function gobanState($node, $branch)
    {
        $bstones = explode(',', $this->_game[$node][$branch]['b']);
        $wstones = explode(',', $this->_game[$node][$branch]['w']);
        $sb = count($bstones);
        $sw = count($wstones);

        // Make an empty goban.
        for ($x = 0; $x < $this->_size; $x++) {
            for ($y = 0; $y < $this->_size; $y++) {
                $state[$x][$y] = '';
            }
        }
        // Add black stones to state.
        for ($b = 0; $b < $sb; $b++) {
            $x = ord(substr($bstones[$b], 0, 1)) - 97;
            $y = ord(substr($bstones[$b], 1, 1)) - 97;
            if ($x >= 0 && $y >= 0) {
                $state[$x][$y] = 'b';
            }
        }
        // Add whites stones to state.
        for ($w = 0; $w < $sw; $w++) {
            $x = ord(substr($wstones[$w], 0, 1)) - 97;
            $y = ord(substr($wstones[$w], 1, 1)) - 97;
            if ($x >= 0 && $y >= 0) {
                $state[$x][$y] = 'w';
            }
        }
        return $state;
    }
    /*}}}*/

    /** stateToGame {{{
     * Save state to game.
     *
     * @param {integer} $node   Node to save.
     * @param {integer} $branch Branch to save.
     *
     * @return {null}
     */
    protected function stateToGame($node, $branch)
    {
        $let = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
            'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'];

        for ($x = 0; $x < $this->_size; $x++) {
            for ($y = 0; $y < $this->_size; $y++) {
                $coord = $let[$x].$let[$y];
                if (isset($this->_state[$x][$y])) {
                    if ($this->_state[$x][$y] == 'b') {
                        $this->_game[$node][$branch]['b'] .=
                            ($this->_game[$node][$branch]['b'] != '') ?
                            ','.$coord : $coord;
                    } else if ($this->_state[$x][$y] == 'w') {
                        $this->_game[$node][$branch]['w'] .=
                            ($this->_game[$node][$branch]['w'] != '') ?
                            ','.$coord : $coord;
                    }
                }
            }
        }
        return;
    }
    /*}}}*/

    /** testDeath {{{
     * Test if a played stone is killing stone(s).
     *
     * @param {string}  $color Played color.
     * @param {integer} $x     X coordinate of played stone.
     * @param {integer} $y     Y coordinate of played stone.
     *
     * @return {null}
     */
    protected function testDeath($color, $x, $y)
    {
        $this->_deads = [];
        if ($this->testLiberties($color, $x-1, $y) == 0) {
            $this->killStones($color);
        }
        $this->_deads = []; // Empty potential deads before each test.
        if ($this->testLiberties($color, $x, $y-1) == 0) {
            $this->killStones($color);
        }
        $this->_deads = [];
        if ($this->testLiberties($color, $x+1, $y) == 0) {
            $this->killStones($color);
        }
        $this->_deads = [];
        if ($this->testLiberties($color, $x, $y+1) == 0) {
            $this->killStones($color);
        }
    }
    /*}}}*/

    /** testLiberties {{{
     * Test liberties of a stone or a group of stones recursively.
     * Inspired by eidogo algorithm.
     *
     * @param {string}  $color Color of the played stone.
     * @param {integer} $x     X coordinate to test.
     * @param {integer} $y     Y coordinate to test.
     *
     * @return {integer} 0: No liberties or already in potential deads list.
     *                   1: Has liberties.
     *                   2: Same color or goban border.
     */
    protected function testLiberties($color,$x,$y)
    {
        $ennemy = ($color == 'b') ? 'w' : 'b';
        if (isset($this->_state[$x][$y])) {
            if ($this->_state[$x][$y] == '') {
                return 1; // Liberty.
            }
            if ($this->_state[$x][$y] == $ennemy) {
                $dead = $x . ',' . $y;
                // Check if we already added that one.
                for ($i = 0, $ci = count($this->_deads); $i < $ci; $i++) {
                    if ($this->_deads[$i] == $dead) {
                        // Already in potential deads list.
                        return 0;
                    }
                }
                $this->_deads[] = $dead; // Add to potential deads.

                // Test recursively the coordinates around the potential dead.
                if ($this->testLiberties($color, $x-1, $y) == 1) {
                    return 1;
                }
                if ($this->testLiberties($color, $x, $y-1) == 1) {
                    return 1;
                }
                if ($this->testLiberties($color, $x+1, $y) == 1) {
                    return 1;
                }
                if ($this->testLiberties($color, $x, $y+1) == 1) {
                    return 1;
                }
                // If we reached here then we found no liberties.
                return 0;
            }
            return 2; // Same color as played stone.
        } else {
            return 2; // Goban border.
        }
    }
    /*}}}*/

    /** killStones {{{
     * Remove dead stone(s) from the state.
     *
     * @param {string} $color Color of dead stone(s).
     *
     * @return {null}
     */
    protected function killStones($color)
    {
        $ci = count($this->_deads);
        // Add to prisonners for the score.
        $this->_prison[$color] += $ci;
        for ($i = 0; $i < $ci; $i++) {
            $coord = explode(',', $this->_deads[$i]);
            // Remove stone from state.
            $this->_state[$coord[0]][$coord[1]] = '';
        }
        return;
    }
    /*}}}*/
}
?>
