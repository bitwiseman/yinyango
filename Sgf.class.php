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

/** Sgf {{{
 * Sgf class.
 * A node represents a move in the game and a branch represents a variation.
 * Expicative schema: B are branchs.
 *                    N are nodes.
 *
 * B0(N0__N1__N2__N3__N4__N5__N6__N7__N8)
 *  B3(\__N1__N2__N3)       B1(\__N7__N8)
 *          B4(\__N3__N4)       B2(\__N8__N9__N10)
 *
 * A given node can have multiple branchs.
 * We store game states in arrays of the form: array[node][branch].
 *
 * @category PHP
 * @package  Yinyanggo
 * @author   hickop <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0
 * @link     https://github.com/hickop/yinyanggo
 *
 * @property {integer} $_size     Size of goban (9, 13, 19).
 * @property {integer} $_branchs  Total number of branchs (variations).
 * @property {array}   $_infos    Informations about the game.
 * @property {array}   $_comments Comments in the game.
 * @property {array}   $_symbols  Symbols on goban.
 * @property {array}   $_game     Game states.
 * @property {array}   $_state    Game state at a given moment.
 * @property {array}   $_deads    Potential dead stones.
 * @property {array}   $_prison   Prisonners.
 */
class Sgf
{
    private $_size;
    private $_branchs;
    private $_infos;
    private $_comments;
    private $_symbols;
    private $_game;
    private $_state;
    private $_deads;
    private $_prison = ['b' => 0, 'w' => 0];

    /** __construct {{{
     * Construct variables parsing the provided sgf file.
     *
     * @param {string} $sgf Sgf file.
     *
     * @constructor
     *
     * @return {null}
     */
    function __construct($sgf)
    {
        $data = $this->sgfToTab($sgf);
        $this->_infos = $data[0][0];
        $this->_size = $this->_infos['SZ'];
        $this->gameTable($data);
        $this->_infos['branchs'] = $this->_branchs;

        return null;
    }
    /*}}}*/

    /** getData {{{
     * Collect and return all the data to be sent to database. Encode it in
     * json format.
     *
     * @return {array} Data to be sent.
     */
    public function getData() 
    {
        $data['infos'] = json_encode($this->_infos);
        $data['comments'] = json_encode($this->_comments);
        $data['symbols'] = json_encode($this->_symbols);
        $data['game'] = json_encode($this->_game);

        return $data;
    }
    /*}}}*/

    /** sgfToTab {{{
     * Read a sgf file and register keys/values in an array, sorting the
     * nodes (moves) and branchs (variations).
     *
     * @param {string} $sgf Sgf file.
     *
     * @return {array} Array containing sgf data.
     */
    protected function sgfToTab($sgf)
    {
        $sgftable = [];     // Array containing data.
        $branch =   -1;     // Current branch.
        $escape =   false;  // Escape character.
        $isstart =  true;   // Branch start.
        $isval =    false;  // We are registering a value.
        $key =      '';     // Current registered key.
        $mark =     0;      // Marks counter.
        $node =     -1;     // Current node.
        $nodemark = [-1];   // Marks table.
        $prevkey =  '';     // Previous key in case of multiple values.
        $val =      '';     // Current registered value.

        $file = fopen($sgf, "r"); // Open file read only.

        while (!feof($file)) { // Read file character by character.
            $char = fgetc($file); // Current character.
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
                        $sgftable[$node][$branch][$prevkey] .= ','.$val;
                    } else {
                        // Key changed, save it in and unset key.
                        $sgftable[$node][$branch][$key] = $val;
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
        return $sgftable;
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
                    // Store the previous state.
                    $b = $i;
                    while ($b >= 0) {
                        if (isset($this->_game[$j-1][$b])) {
                            $this->_state = $this->gobanState($j-1, $b);
                            break;
                        }
                        $b--;
                    }
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
                        } // Switch.
                    } // For each.
                    // Save state into game.
                    $this->stateToGame($j, $i);
                }
            }
        }
        return null;
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
        $stones = explode(',', $coords);
        $cs = count($stones);
        
        for ($i = 0; $i < $cs; $i++) {
            // Transform coordinates into numbers. 
            $x = ord(substr($stones[$i], 0, 1)) - 97;
            $y = ord(substr($stones[$i], 1, 1)) - 97;
            // Add stone(s)/empty to previous state.
            $this->_state[$x][$y] = $color;
        }
        return null;
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
        // Transform coordinates to numbers.
        $x = ord(substr($coord, 0, 1)) - 97;
        $y = ord(substr($coord, 1, 1)) - 97;
        // Add played stone to previous state.
        $this->_state[$x][$y] = $color;
        // Test if that makes deaths.
        $this->testDeath($color, $x, $y);
        // TODO Calculate KO

        // Add the played stone in game state so we can track it.
        $this->_game[$node][$branch]['p'] = $color.','.$coord;

        return null;
    }
    /*}}}*/

    /** gobanState {{{
     * Get the goban state at a given node/branch.
     *
     * @param {integer} $node   Node to get state at.
     * @param {integer} $branch Branch to get state at.
     *
     * @return {array} Goban state.
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
        return null;
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
        return null;
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
        return null;
    }
    /*}}}*/
}
/*}}}*/
?>
