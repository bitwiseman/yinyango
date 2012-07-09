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
class sgf
{
    private $size;      // taille du goban
    private $infos;     // infos de la partie
    private $comments;  // commentaires
    private $symbols;   // annotations sur le goban
    private $branchs;   // nombre total de branches
    private $game;      // déroulement de la partie
    private $state;     // état du goban
    private $deads;     // pierres potentiellement mortes
    private $prison = Array('b' => 0, 'w' => 0); // prisonniers

    // construction des variables
    function __construct() {/*{{{*/
        
    }/*}}}*/

    public function sendFile($file,$hostname,$dbuser,$dbpass,$dbname) {/*{{{*/
        // connexion base de données
        try {
            $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
            $db = new PDO(
                'mysql:host=' . $hostname . ';dbname=' . $dbname,
                $dbuser,
                $dbpass,
                $pdo_options);
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
            $data = $this->SgfToTab($file);
            $this->infos = $data[0][0];
            $this->size = $this->infos['SZ'];
            $this->GameTable($data);
            $this->infos['branchs'] = $this->branchs;

            $insert = $db->prepare('INSERT INTO sgf(
                file, infos, comments, symbols, game) VALUES(
                :file, :infos, :comments, :symbols, :game)');
            $insert->execute(array(
                'file' => $file,
                'infos' => json_encode($this->infos),
                'comments' => json_encode($this->comments),
                'symbols' => json_encode($this->symbols),
                'game' => json_encode($this->game),
            ));
        }
        $db = null; // ferme la connexion
        return true;
    }/*}}}*/

    // lit un SGF et le stocke dans une table[noeud][branche]
    protected function SgfToTab($data) {/*{{{*/

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

        $file = fopen($data, "r"); // ouverture du fichier en lecture seule

        while (!feof($file)) { // lecture du fichier caractère par caractère
            $char = fgetc($file); // caractère courant
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
        $this->branchs = $branch + 1;
        return $tab;
    }/*}}}*/

    // traite le déroulement du jeu et enregistre chaque état dans un tableau
    protected function GameTable($table) {/*{{{*/

        for ($i = 0; $i <= $this->branchs; $i++) {
            for ($j = 0; $j < sizeof($table); $j++) {
                if (isset($table[$j][$i])) {
                    // toujours avoir au moins un goban vide
                    $this->game[$j][$i]['b'] = '';
                    $this->game[$j][$i]['w'] = '';
                    // ajouter les pierres jouées ou placées
                    foreach ($table[$j][$i] as $key => $value) {
                        switch ($key) {
                        case 'B': // noir joue
                            $this->PlayMove($j,$i,'b',$value);
                            break;
                        case 'W': // blanc joue
                            $this->PlayMove($j,$i,'w',$value);
                            break;
                        case 'AB': // ajout de pierre(s) noire(s)
                            $this->AddStones($j,$i,'b',$value);
                            break;
                        case 'AW': // ajout de pierre(s) blanche(s)
                            $this->AddStones($j,$i,'w',$value);
                            break;
                        case 'AE': // enlève les pierres
                            $this->RemoveStones($j,$i,$value);
                            break;
                        case 'CR': // ajout symbole cercle
                            $this->symbols[$j][$i]['CR'] = $value;
                            break;
                        case 'SQ': // ajout symbole carré
                            $this->symbols[$j][$i]['SQ'] = $value;
                            break;
                        case 'TR': // ajout symbole triangle
                            $this->symbols[$j][$i]['TR'] = $value;
                            break;
                        case 'LB': // ajout symbole label
                            $this->symbols[$j][$i]['LB'] = $value;
                            break;
                        case 'C': // ajout de commentaire(s)
                            $this->comments[$j][$i] = $value;
                            break;
                        default:
                        }
                    }
                }
            }
        }
    }/*}}}*/

    // ajoute des pierres sur le goban
    protected function AddStones($node,$branch,$color,$coords) {/*{{{*/
        $b = $branch;
        $stones = explode(',',$coords);
        $cs = count($stones);

        while ($b >= 0) { //cherche un état précédent
            if (isset($this->game[$node-1][$b])) {
                $this->state = $this->GobanState($node-1,$b);
                break;
            }
            $b--;
        }
        for ($i = 0; $i < $cs; $i++) { // ajoute les pierres à l'état
            $x = ord(substr($stones[$i],0,1)) - 97;
            $y = ord(substr($stones[$i],1,1)) - 97;
            $this->state[$x][$y] = $color; 
        }
        $this->StateToGame($node,$branch); // enregistre le jeu
    }/*}}}*/

    // enlève des pierres sur le goban
    protected function RemoveStones($node,$branch,$coords) {/*{{{*/
        $b = $branch;
        $stones = explode(',',$coords);
        $cs = count($stones);

        while ($b >= 0) { //cherche un état précédent
            if (isset($this->game[$node-1][$b])) {
                $this->state = $this->GobanState($node-1,$b);
                break;
            }
            $b--;
        }
        for ($i = 0; $i < $cs; $i++) { // ajoute les pierres à l'état
            $x = ord(substr($stones[$i],0,1)) - 97;
            $y = ord(substr($stones[$i],1,1)) - 97;
            $this->state[$x][$y] = ''; 
        }
        $this->StateToGame($node,$branch); // enregistre le jeu
    }/*}}}*/

    // joue un coup et calcul l'état du goban en fonction de l'état précédent
    protected function PlayMove($node,$branch,$color,$coord) {/*{{{*/
        $b = $branch;

        while ($b >= 0) { //cherche un état précédent
            if (isset($this->game[$node-1][$b])) {
                $this->state = $this->GobanState($node-1,$b);
                $x = ord(substr($coord,0,1)) - 97;
                $y = ord(substr($coord,1,1)) - 97;
                $this->state[$x][$y] = $color; // ajoute le coup joué à l'état
                $this->TestDeath($color,$x,$y); // test pierres mortes
                $this->StateToGame($node,$branch); // enregistre le jeu
                // TODO calculer les KO
                break;
            }
            $b--;
        }
        $this->game[$node][$branch]['p'] = $color.','.$coord;
    }/*}}}*/

    // enregistre l'état du goban
    protected function GobanState($node,$branch) {/*{{{*/
        $bstones = explode(',',$this->game[$node][$branch]['b']);
        $wstones = explode(',',$this->game[$node][$branch]['w']);
        $sb = count($bstones);
        $sw = count($wstones);
        // vide l'état précédent
        for ($x = 0; $x < $this->size; $x++) {
            for ($y = 0; $y < $this->size; $y++) {
                $state[$x][$y] = '';
            }
        }
        // enregistre l'état
        for ($b = 0; $b < $sb; $b++) {
            $x = ord(substr($bstones[$b],0,1)) - 97;
            $y = ord(substr($bstones[$b],1,1)) - 97;
            if ($x >= 0 && $y >= 0) $state[$x][$y] = 'b';
        }
        for ($w = 0; $w < $sw; $w++) {
            $x = ord(substr($wstones[$w],0,1)) - 97;
            $y = ord(substr($wstones[$w],1,1)) - 97;
            if ($x >= 0 && $y >= 0) $state[$x][$y] = 'w';
        }
        return $state;
    }/*}}}*/

    // convertit l'état du goban sous forme de coordonnées en lettres
    protected function StateToGame($node,$branch) {/*{{{*/
        $let = ['a','b','c','d','e','f','g','h','i',
                'j','k','l','m','n','o','p','q','r','s'];
        for ($x = 0; $x < $this->size; $x++) {
            for ($y = 0; $y < $this->size; $y++) {
                $coord = $let[$x].$let[$y];
                if (isset($this->state[$x][$y])) {
                    if ($this->state[$x][$y] == 'b') {
                        $this->game[$node][$branch]['b'] .=
                            ($this->game[$node][$branch]['b'] != '') ?
                            ','.$coord : $coord;
                    }
                    else if ($this->state[$x][$y] == 'w') {
                        $this->game[$node][$branch]['w'] .=
                            ($this->game[$node][$branch]['w'] != '') ?
                            ','.$coord : $coord;
                    }
                }
            }
        }
    }/*}}}*/

    // test des pierres mortes
    protected function TestDeath($color,$x,$y) {/*{{{*/
        $this->deads = [];
        if ($this->TestLiberties($color,$x-1,$y) == 0)
            $this->KillStones($color);
        $this->deads = []; // vider les morts d'avant à chaque test
        if ($this->TestLiberties($color,$x,$y-1) == 0)
            $this->KillStones($color);
        $this->deads = [];
        if ($this->TestLiberties($color,$x+1,$y) == 0)
            $this->KillStones($color);
        $this->deads = [];
        if ($this->TestLiberties($color,$x,$y+1) == 0)
            $this->KillStones($color);
    }/*}}}*/

    // test les libertés d'une pierre ou un groupe de pierres
    protected function TestLiberties($color,$x,$y) {/*{{{*/
        $ennemy = ($color == 'b') ? 'w' : 'b';
        if (isset($this->state[$x][$y])) {
            if ($this->state[$x][$y] == '') {
                return 1; // liberté
            }
            if ($this->state[$x][$y] == $ennemy) {
                $dead = $x . ',' . $y;
                for ($i = 0, $ci = count($this->deads); $i < $ci; $i++) {
                    // déjà dans la liste des morts
                    if ($this->deads[$i] == $dead) return 0; 
                }
                $this->deads[] = $dead;

                if ($this->TestLiberties($color,$x-1,$y) == 1) return 1;
                if ($this->TestLiberties($color,$x,$y-1) == 1) return 1;
                if ($this->TestLiberties($color,$x+1,$y) == 1) return 1;
                if ($this->TestLiberties($color,$x,$y+1) == 1) return 1;
                return 0; // aucune liberté
            }
            return 2; // pierre de la même couleur
        } else return 2; // bord du goban
    }/*}}}*/

    // supprime les pierres mortes de l'état actuel du goban
    protected function KillStones($color) {/*{{{*/
        $ci = count($this->deads);
        $this->prison[$color] += $ci; // ajoute prisonniers pour le score
        for ($i = 0; $i < $ci; $i++) {
            $coord = explode(',',$this->deads[$i]);
            // enlève la pierre  morte du goban
            $this->state[$coord[0]][$coord[1]] = '';
        }
    }/*}}}*/

}
?>
