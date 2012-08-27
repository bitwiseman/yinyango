<?php
/**
 * Class to treat sgf files.
 *
 * PHP version 5
 *
 * @category PHP
 * @package  Yinyanggo
 * @author   Mathieu Quinette <hickop@gmail.com>
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
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0
 * @link     https://github.com/hickop/yinyanggo
 *
 * @property {array}   $_game     All game data.
 * @property {array}   $_captures Potential captured stones.
 * @property {array}   $_prison   Prisonners.
 */
class Sgf
{
    private $_game;
    private $_captures;
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
        $this->_game = $this->makeTree($sgf);
        $this->makeStates();

        //echo json_encode($this->_game);
        return null;
    }
    /*}}}*/

    /** getGame {{{
     * Return game tree to be sent to database. Encode it in json format.
     *
     * @return {array} Data to be sent.
     */
    public function getGame() 
    {
        return json_encode($this->_game);
    }
    /*}}}*/

    /** makeTree {{{
     * Read a sgf file and register keys/values in an array, sorting the
     * nodes (moves) and branchs (variations).
     *
     * @param {string} $sgf Sgf file.
     *
     * @return {array} Array containing sgf data.
     */
    protected function makeTree($sgf)
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
        // Save total number of branchs in the tree root for later use.
        $sgftable[0][0]['branchs'] = $branch + 1;

        return $sgftable;
    }
    /*}}}*/

    /** makeStates {{{
     * Make game states according to the played, added and removed stones.
     *
     * @return {null}
     */
    protected function makeStates()
    {
        $branchs =  $this->_game[0][0]['branchs'];
        $state =    [];
        $nodes =    sizeof($this->_game);

        // Browse all nodes and branchs.
        for ($node = 0; $node < $nodes; $node++) {
            for ($branch = 0; $branch < $branchs; $branch++) {
                // We have keys registered here, analyze them.
                if (isset($this->_game[$node][$branch])) {
                    // Always have an empty goban at least.
                    $this->_game[$node][$branch]['stones'] 
                        = ['b' => '', 'w' => ''];
                    // Seek and store the previous state.
                    $state = $this->previousState($node, $branch);
                    // Browse the keys and make actions.
                    foreach ($this->_game[$node][$branch] as $key => $value) {
                        switch ($key) {
                        case 'B': // Play black stone and get new state.
                            $state = $this->playMove(
                                $node, $branch, 'b', $value, $state
                            );
                            break;
                        case 'W': // Play white stone and get new state.
                            $state = $this->playMove(
                                $node, $branch, 'w', $value, $state
                            );
                            break;
                        case 'AB': // Add black(s) stone(s) and get new state.
                            $state = $this->addStones(
                                $node, $branch, 'b', $value, $state
                            );
                            break;
                        case 'AW': // Add white(s) stone(s) and get new state.
                            $state = $this->addStones(
                                $node, $branch, 'w', $value, $state
                            );
                            break;
                        case 'AE': // Remove stone(s) and get new state.
                            $state = $this->addStones(
                                $node, $branch, '', $value, $state
                            );
                            break;
                        default: // All other keys.
                            break;
                        } // Switch.
                    } // For each.
                    // Register stones for the global game.
                    $this->_game[$node][$branch]['stones']
                        = $this->stateToStones($state);
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
     * @param {array}   $state  Previous state before we add/remove stones.
     *
     * @return {array} New state after adding/removing stones.
     */
    protected function addStones($node, $branch, $color, $coords, $state)
    {
        $stones =   explode(',', $coords);
        $cs =       count($stones);
        
        for ($i = 0; $i < $cs; $i++) {
            // Transform coordinates into numbers. 
            $x = ord(substr($stones[$i], 0, 1)) - 97;
            $y = ord(substr($stones[$i], 1, 1)) - 97;
            // Add stone(s)/empty to previous state.
            $state[$x][$y] = $color;
        }
        return $state;
    }
    /*}}}*/

    /** playMove {{{
     * Play a stone and caculate goban state based on previous state.
     *
     * @param {integer} $node   Node to play the stone.
     * @param {integer} $branch Branch to play the stone.
     * @param {string}  $color  Color of played stone.
     * @param {string}  $coord  Coordinate of played stone in letters.
     * @param {array}   $state  Previous goban state before playing the stone.
     *
     * @return {array} New goban state after playing the stone and making 
     *                 eventuals captures.
     */
    protected function playMove($node, $branch, $color, $coord, $state)
    {
        // Transform coordinates into numbers.
        $x = ord(substr($coord, 0, 1)) - 97;
        $y = ord(substr($coord, 1, 1)) - 97;
        // Add played stone to previous state.
        $state[$x][$y] = $color;
        // Test if that makes captures and get new state if so.
        $state = $this->testCaptures($color, $x, $y, $state);
        // TODO Calculate KO.

        return $state;
    }
    /*}}}*/

    /** previousState {{{
     * Get the previous goban state.
     *
     * @param {integer} $node   Current node.
     * @param {integer} $branch Current branch.
     *
     * @return {array} Previous goban state.
     */
    protected function previousState($node, $branch)
    {
        $game =     $this->_game;
        $size =     $game[0][0]['SZ'];
        $bstones =  [];
        $wstones =  [];
        $sb =       0;
        $sw =       0;
        $position = [];
        $state =    [];

        // Make an empty goban state.
        for ($x = 0; $x < $size; $x++) {
            for ($y = 0; $y < $size; $y++) {
                $state[$x][$y] = '';
            }
        }
        // Seek inferiors branchs until we find the parent one.
        $b = $branch;
        while ($b >= 0) {
            if (isset($game[$node-1][$b])) {
                $position = $game[$node-1][$b];
                // If we have black stones add them to goban state.
                if ($position['stones']['b'] !== '') {
                    $bstones = explode(',', $position['stones']['b']);
                    $sb = count($bstones);

                    for ($b = 0; $b < $sb; $b++) {
                        $x = ord(substr($bstones[$b], 0, 1)) - 97;
                        $y = ord(substr($bstones[$b], 1, 1)) - 97;
                        if ($x >= 0 && $y >= 0) {
                            $state[$x][$y] = 'b';
                        }
                    }
                }
                // If we have white stones add them to goban state.
                if ($position['stones']['w'] !== '') {
                    $wstones = explode(',', $position['stones']['w']);
                    $sw = count($wstones);

                    for ($w = 0; $w < $sw; $w++) {
                        $x = ord(substr($wstones[$w], 0, 1)) - 97;
                        $y = ord(substr($wstones[$w], 1, 1)) - 97;
                        if ($x >= 0 && $y >= 0) {
                            $state[$x][$y] = 'w';
                        }
                    }
                }
                break; // We have our state get out of loop.
            }
            $b--;
        }

        return $state;
    }
    /*}}}*/

    /** stateToStones {{{
     * Convert a goban state to a stones list.
     *
     * @param {array} $state Goban state to convert.
     *
     * @return {array} Stones list.
     */
    protected function stateToStones($state)
    {
        $size =     $this->_game[0][0]['SZ'];
        $stones =   ['b' => '', 'w' => ''];
        $let =      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
                    'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's'];

        for ($x = 0; $x < $size; $x++) {
            for ($y = 0; $y < $size; $y++) {
                $coord = $let[$x].$let[$y];
                if (isset($state[$x][$y])) {
                    if ($state[$x][$y] === 'b') {
                        $stones['b'] .= $coord . ',';
                    } else if ($state[$x][$y] === 'w') {
                        $stones['w'] .= $coord . ',';
                    }
                }
            }
        }
        // Remove the extra ','.
        if ($stones['b'] !== '') {
            $stones['b'] = substr($stones['b'], 0, -1);
        }
        if ($stones['w'] !== '') {
            $stones['w'] = substr($stones['w'], 0, -1);
        }

        return $stones;
    }
    /*}}}*/

    /** testCaptures {{{
     * Test if a played stone will capture stone(s).
     *
     * @param {string}  $color Played color.
     * @param {integer} $x     X coordinate of played stone.
     * @param {integer} $y     Y coordinate of played stone.
     * @param {array}   $state Previous goban state before testing captures.
     *
     * @return {array} New goban state after making eventuals captures.
     */
    protected function testCaptures($color, $x, $y, $state)
    {
        $this->_captures = []; // Empty potential captures before each test.
        if ($this->testLiberties($color, $x-1, $y, $state) == 0) {
            // No liberties found, capture the potentials cpatures.
            $state = $this->captureStones($color, $state);
        }
        // Repeat for each direction.
        $this->_captures = [];
        if ($this->testLiberties($color, $x, $y-1, $state) == 0) {
            $state = $this->captureStones($color, $state);
        }
        $this->_captures = [];
        if ($this->testLiberties($color, $x+1, $y, $state) == 0) {
            $state = $this->captureStones($color, $state);
        }
        $this->_captures = [];
        if ($this->testLiberties($color, $x, $y+1, $state) == 0) {
            $state = $this->captureStones($color, $state);
        }

        return $state;
    }
    /*}}}*/

    /** testLiberties {{{
     * Test liberties of a stone or a group of stones recursively.
     * Inspired by eidogo algorithm.
     *
     * @param {string}  $color Color of the played stone.
     * @param {integer} $x     X coordinate to test.
     * @param {integer} $y     Y coordinate to test.
     * @param {array}   $state Goban state to test.
     *
     * @return {integer} 0: No liberties or already in potential captures.
     *                   1: Has liberties.
     *                   2: Same color or goban border.
     */
    protected function testLiberties($color, $x, $y, $state)
    {
        $ennemy = ($color == 'b') ? 'w' : 'b';
        if (isset($state[$x][$y])) {
            if ($state[$x][$y] == '') {
                return 1; // Liberty.
            }
            if ($state[$x][$y] == $ennemy) {
                $capture = $x . ',' . $y;
                // Check if we already added that one.
                $ci = count($this->_captures);
                for ($i = 0; $i < $ci; $i++) {
                    if ($this->_captures[$i] == $capture) {
                        // Already in potential captures.
                        return 0;
                    }
                }
                $this->_captures[] = $capture; // Add to potential captures.

                // Test recursively coordinates around the potential capture.
                if ($this->testLiberties($color, $x-1, $y, $state) == 1) {
                    return 1;
                }
                if ($this->testLiberties($color, $x, $y-1, $state) == 1) {
                    return 1;
                }
                if ($this->testLiberties($color, $x+1, $y, $state) == 1) {
                    return 1;
                }
                if ($this->testLiberties($color, $x, $y+1, $state) == 1) {
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

    /** captureStones {{{
     * Remove captured stone(s) from the state.
     *
     * @param {string} $color Color of captured stone(s).
     * @param {array}  $state Previous goban state before making captures.
     *
     * @return {array} New goban state after captures.
     */
    protected function captureStones($color, $state)
    {
        $ci = count($this->_captures);
        // Add to prisonners for the score.
        $this->_prison[$color] += $ci;
        for ($i = 0; $i < $ci; $i++) {
            $coord = explode(',', $this->_captures[$i]);
            // Remove stone from state.
            $state[$coord[0]][$coord[1]] = '';
        }

        return $state;
    }
    /*}}}*/
}
/*}}}*/
?>
