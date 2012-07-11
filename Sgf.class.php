<?php
/**
 * Class de traitement des fichiers SGF
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
    private $_size;      // taille du goban
    private $_infos;     // infos de la partie
    private $_comments;  // commentaires
    private $_symbols;   // annotations sur le goban
    private $_branchs;   // nombre total de branches
    private $_game;      // déroulement de la partie
    private $_state;     // état du goban
    private $_deads;     // pierres potentiellement mortes
    private $_prison = Array('b' => 0, 'w' => 0); // prisonniers

    /** __construct {{{
     * Construction des variables
     */
    function __construct()
    {
        
    }/*}}}*/

    /** saveFile {{{
     * Enregistrement de fichier dans la base de données
     *
     * @param {string} $file     fichier à enregister
     * @param {string} $hostname addresse du serveur
     * @param {string} $dbuser   login bdd
     * @param {string} $dbpass   pass bdd
     * @param {string} $dbname   nom de la bdd 
     *
     * @return boolean
     */ 
    public function saveFile($file,$hostname,$dbuser,$dbpass,$dbname)
    {
        // connexion base de données
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

        // enregistre les données si elles n'existent pas
        $select = $db->prepare('SELECT * FROM sgf WHERE file=?');
        $select->execute(array($file));
        $vars = $select->fetch();
        $select->closeCursor();
        if (!empty($vars)) {
            return false;
        } else {
            $data = $this->sgfToTab($file);
            $this->_infos = $data[0][0];
            $this->_size = $this->_infos['SZ'];
            $this->gameTable($data);
            $this->_infos['branchs'] = $this->_branchs;

            $insert = $db->prepare(
                'INSERT INTO sgf(file, infos, comments, symbols, game)' .
                'VALUES(:file, :infos, :comments, :symbols, :game)'
            );
            $insert->execute(
                array('file' => $file,
                'infos' => json_encode($this->_infos),
                'comments' => json_encode($this->_comments),
                'symbols' => json_encode($this->_symbols),
                'game' => json_encode($this->_game))
            );
        }
        $db = null; // ferme la connexion
        return true;
    }/*}}}*/

    /** sgfToTab {{{
     * Lit un fichier SGF et le stocke dans un tableau
     *
     * @param string $file fichier à traiter
     *
     * @return array
     */
    protected function sgfToTab($file)
    {
        $tab = [];          // tab[node][branch][key][val,val,...]

        $branch = -1;       // branche actuelle
        $escape = false;    // caractère d'échappement
        $isstart = true;    // départ de branche
        $isval = false;     // on enregistre une valeur ?
        $key = '';          // clé enregistrée
        $mark = 0;          // compteur de marqueurs
        $node = -1;         // noeud actuel
        $nodemark = [-1];   // tableau des marqueurs
        $prevkey = '';      // clé précédente pour plusieurs valeurs
        $val = '';          // valeur enregistrée

        $handle = fopen($file, "r"); // ouverture du fichier en lecture seule

        while (!feof($handle)) { // lecture du fichier caractère par caractère
            $char = fgetc($handle); // caractère courant
            switch ($char) {
            case '\\': // caractère d'échappement ?
                if ($escape) { // '\' qui fait partie de la valeur
                    $val .= '\\';
                    $escape = false;
                } else {
                    $escape = true;
                }
                break;
            case '(': // début de branche ?
                if ($isval) {
                    $val .= $char;
                } else if ($isstart) { // nouvelle branche
                    $branch++;
                    $node = $nodemark[$mark];
                    $isstart = false;
                } else { // c'est un marqueur
                    $mark++;
                    $nodemark[$mark] = $node;
                }
                break;
            case ')': // fin de branche ?
                if ($isval) {
                    $val .= $char;
                } else if ($isstart) { // retour à la marque précédente
                    $mark--;
                } else {
                    $isstart = true;
                }
                break;
            case ';': // nouveau noeud ?
                if ($isval) {
                    $val .= $char;
                } else {
                    $node++; 
                }
                break;
            case '[': // début de valeur ?
                if ($isval) {
                    $val .= $char;
                } else {
                    $isval = true;
                }
                break;
            case ']': // fin de valeur ?
                if ($escape) { // si échappé on l'écrit dans la valeur
                    $val .= $char;
                    $escape = false;
                } else { // on ajoute la valeur à la clé correspondante
                    if ($key == '') { // enregistre dans clé précédente 
                        $tab[$node][$branch][$prevkey] .= ','.$val;
                    } else { // nouvelle clé
                        $tab[$node][$branch][$key] = $val;
                        $prevkey = $key;
                        $key = '';
                    }
                    $isval = false;
                    $val = '';
                }
                break;
            default: // enregister la clé ou la valeur
                if ($isval) {
                    if ($char == "\n") {
                        $val .= "<br />"; // retour charriot html
                    } else {
                        $val .= $char;
                    }
                } else if ($char != "\n") {
                    $key .= $char;
                }
            }
        }
        $this->_branchs = $branch + 1;
        return $tab;
    }/*}}}*/

    /** gameTable {{{
     * Traite le déroulement du jeu et enregistre chaque état dans un tableau
     *
     * @param array $table tableau de représentation du fichier SGF
     *
     * @return null
     */
    protected function gameTable($table)
    {
        for ($i = 0; $i <= $this->_branchs; $i++) {
            for ($j = 0; $j < sizeof($table); $j++) {
                if (isset($table[$j][$i])) {
                    // toujours avoir au moins un goban vide
                    $this->_game[$j][$i]['b'] = '';
                    $this->_game[$j][$i]['w'] = '';
                    // ajouter les pierres jouées ou placées
                    foreach ($table[$j][$i] as $key => $value) {
                        switch ($key) {
                        case 'B': // noir joue
                            $this->playMove($j, $i, 'b', $value);
                            break;
                        case 'W': // blanc joue
                            $this->playMove($j, $i, 'w', $value);
                            break;
                        case 'AB': // ajout de pierre(s) noire(s)
                            $this->addStones($j, $i, 'b', $value);
                            break;
                        case 'AW': // ajout de pierre(s) blanche(s)
                            $this->addStones($j, $i, 'w', $value);
                            break;
                        case 'AE': // enlève les pierres
                            $this->removeStones($j, $i, $value);
                            break;
                        case 'CR': // ajout symbole cercle
                            $this->_symbols[$j][$i]['CR'] = $value;
                            break;
                        case 'SQ': // ajout symbole carré
                            $this->_symbols[$j][$i]['SQ'] = $value;
                            break;
                        case 'TR': // ajout symbole triangle
                            $this->_symbols[$j][$i]['TR'] = $value;
                            break;
                        case 'LB': // ajout symbole label
                            $this->_symbols[$j][$i]['LB'] = $value;
                            break;
                        case 'C': // ajout de commentaire(s)
                            $this->_comments[$j][$i] = $value;
                            break;
                        default:
                        }
                    }
                }
            }
        }
        return;
    }/*}}}*/

    /** addStones {{{
     * Ajoute des pierres sur le goban
     *
     * @param int    $node   noeud
     * @param int    $branch branche
     * @param string $color  couleur
     * @param string $coords coordonées en lettres
     *
     * @return null
     */
    protected function addStones($node,$branch,$color,$coords)
    {
        $b = $branch;
        $stones = explode(',', $coords);
        $cs = count($stones);

        while ($b >= 0) { //cherche un état précédent
            if (isset($this->_game[$node-1][$b])) {
                $this->_state = $this->gobanState($node-1, $b);
                break;
            }
            $b--;
        }
        for ($i = 0; $i < $cs; $i++) { // ajoute les pierres à l'état
            $x = ord(substr($stones[$i], 0, 1)) - 97;
            $y = ord(substr($stones[$i], 1, 1)) - 97;
            $this->_state[$x][$y] = $color; 
        }
        $this->stateToGame($node, $branch); // enregistre le jeu
        return;
    }/*}}}*/

    /** removeStones {{{
     * Enlève des pierres sur le goban
     *
     * @param int    $node   noeud
     * @param int    $branch branche
     * @param string $coords coordonées en lettres
     *
     * @return null
     */
    protected function removeStones($node,$branch,$coords)
    {
        $b = $branch;
        $stones = explode(',', $coords);
        $cs = count($stones);

        while ($b >= 0) { //cherche un état précédent
            if (isset($this->_game[$node-1][$b])) {
                $this->_state = $this->gobanState($node-1, $b);
                break;
            }
            $b--;
        }
        for ($i = 0; $i < $cs; $i++) { // ajoute les pierres à l'état
            $x = ord(substr($stones[$i], 0, 1)) - 97;
            $y = ord(substr($stones[$i], 1, 1)) - 97;
            $this->_state[$x][$y] = ''; 
        }
        $this->stateToGame($node, $branch); // enregistre le jeu
        return;
    }/*}}}*/

    /** playMove {{{
     * Joue un coup et calcul l'état du goban en fonction de l'état précédent
     *
     * @param int    $node   noeud
     * @param int    $branch branche
     * @param string $color  couleur
     * @param string $coord  coordonée du coup joué en lettres
     *
     * @return null
     */
    protected function playMove($node,$branch,$color,$coord)
    {
        $b = $branch;

        while ($b >= 0) { //cherche un état précédent
            if (isset($this->_game[$node-1][$b])) {
                $this->_state = $this->gobanState($node-1, $b);
                $x = ord(substr($coord, 0, 1)) - 97;
                $y = ord(substr($coord, 1, 1)) - 97;
                $this->_state[$x][$y] = $color; // ajoute le coup joué à l'état
                $this->testDeath($color, $x, $y); // test pierres mortes
                $this->stateToGame($node, $branch); // enregistre le jeu
                // TODO calculer les KO
                break;
            }
            $b--;
        }
        $this->_game[$node][$branch]['p'] = $color.','.$coord;
        return;
    }/*}}}*/

    /** gobanState {{{
     * Enregistre l'état du goban
     *
     * @param int $node   noeud
     * @param int $branch branche
     *
     * @return array
     */
    protected function gobanState($node,$branch)
    {
        $bstones = explode(',', $this->_game[$node][$branch]['b']);
        $wstones = explode(',', $this->_game[$node][$branch]['w']);
        $sb = count($bstones);
        $sw = count($wstones);
        // vide l'état précédent
        for ($x = 0; $x < $this->_size; $x++) {
            for ($y = 0; $y < $this->_size; $y++) {
                $state[$x][$y] = '';
            }
        }
        // enregistre l'état
        for ($b = 0; $b < $sb; $b++) {
            $x = ord(substr($bstones[$b], 0, 1)) - 97;
            $y = ord(substr($bstones[$b], 1, 1)) - 97;
            if ($x >= 0 && $y >= 0) {
                $state[$x][$y] = 'b';
            }
        }
        for ($w = 0; $w < $sw; $w++) {
            $x = ord(substr($wstones[$w], 0, 1)) - 97;
            $y = ord(substr($wstones[$w], 1, 1)) - 97;
            if ($x >= 0 && $y >= 0) {
                $state[$x][$y] = 'w';
            }
        }
        return $state;
    }/*}}}*/

    /** stateToGame {{{
     * Convertit l'état du goban sous forme de coordonnées en lettres
     *
     * @param int $node   noeud
     * @param int $branch branche
     *
     * @return null
     */
    protected function stateToGame($node,$branch)
    {
        $let = ['a','b','c','d','e','f','g','h','i',
                'j','k','l','m','n','o','p','q','r','s'];
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
    }/*}}}*/

    /** testDeath {{{
     * Test des pierres mortes
     *
     * @param string $color couleur jouée
     * @param int    $x     coordonée X
     * @param int    $y     coordonée Y
     *
     * @return null
     */
    protected function testDeath($color,$x,$y)
    {
        $this->_deads = [];
        if ($this->testLiberties($color, $x-1, $y) == 0) {
            $this->killStones($color);
        }
        $this->_deads = []; // vider les morts d'avant à chaque test
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
    }/*}}}*/

    /** testLiberties {{{
     * Test les libertés d'une pierre ou un groupe de pierres
     *
     * @param string $color couleur jouée
     * @param int    $x     coordonée X
     * @param int    $y     coordonée Y
     *
     * @return int
     */
    protected function testLiberties($color,$x,$y)
    {
        $ennemy = ($color == 'b') ? 'w' : 'b';
        if (isset($this->_state[$x][$y])) {
            if ($this->_state[$x][$y] == '') {
                return 1; // liberté
            }
            if ($this->_state[$x][$y] == $ennemy) {
                $dead = $x . ',' . $y;
                for ($i = 0, $ci = count($this->_deads); $i < $ci; $i++) {
                    // déjà dans la liste des morts
                    if ($this->_deads[$i] == $dead) {
                        return 0;
                    }
                }
                $this->_deads[] = $dead;

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
                return 0; // aucune liberté
            }
            return 2; // pierre de la même couleur
        } else {
            return 2; // bord du goban
        }
    }/*}}}*/

    /** killStones {{{
     * Supprime les pierres mortes de l'état actuel du goban
     *
     * @param string $color couleur des pierres mortes
     *
     * @return null
     */
    protected function killStones($color)
    {
        $ci = count($this->_deads);
        $this->_prison[$color] += $ci; // ajoute prisonniers pour le score
        for ($i = 0; $i < $ci; $i++) {
            $coord = explode(',', $this->_deads[$i]);
            // enlève la pierre  morte du goban
            $this->_state[$coord[0]][$coord[1]] = '';
        }
        return;
    }/*}}}*/
}
?>
