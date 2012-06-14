<?php
/**
 * Class de traitement des fichiers SGF
 */
class sgf
{
    private $size;
    private $infos; // infos de la partie
    private $comments; // commentaires
    private $symbols; // annotations sur le goban
    private $branchs;
    private $game;
    private $state; // état du goban
    private $deads; // pierres potentiellement mortes

    // construction des variables
    function __construct($file,$hostname,$dbuser,$dbpass,$dbname) {/*{{{*/
        // connexion base de données
        /*try {
            $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
            $db = new PDO(
                'mysql:host=' . $hostname . ';dbname=' . $dbname,
                $dbuser,
                $dbpass,
                $pdo_options);
        }
        catch (Exception $e) {
            die('Erreur : ' . $e->getMessage());
        }

        // récupère les données du fichier ou les enregistre si elles n'existent pas
        $select = $db->prepare('SELECT * FROM sgf WHERE file=?');
        $select->execute(array($file));
        $vars = $select->fetch();
        $select->closeCursor();
        if (!empty($vars)) {
            $this->size = $vars['SZ'];
            $this->infos['PB'] = $vars['PB'];
            $this->infos['BR'] = $vars['BR'];
            $this->infos['PW'] = $vars['PW'];
            $this->infos['WR'] = $vars['WR'];
            $this->infos['KM'] = $vars['KM'];
            $this->infos['DT'] = $vars['DT'];
            $this->infos['PC'] = $vars['PC'];
            $this->infos['TM'] = $vars['TM'];
            $this->infos['OT'] = $vars['OT'];
            $this->infos['RU'] = $vars['RU'];
            $this->comments = json_decode($vars['comments']);
            $this->symbols = json_decode($vars['symbols']);
            $this->branchs = $vars['branchs'];
            $this->game = json_decode($vars['game']);
        }
        else {*/
            $data = $this->SgfToTab($file);
            $this->size = $data[0][0]['SZ'];
            $this->GameTable($data);
            
            $jsoncomments = json_encode($this->comments);
            $jsonsymbols = json_encode($this->symbols);
            $jsongame = json_encode($this->game);

            /*$insert = $db->prepare('INSERT INTO sgf(
                file, SZ, PB, BR, PW, WR, KM, DT, PC,
                TM, OT, RU, comments, symbols, branchs, game) VALUES(
                :file, :SZ, :PB, :BR, :PW, :WR, :KM, :DT, :PC,
                :TM, :OT, :RU, :comments, :symbols, :branchs, :game)');
            $insert->execute(array(
                'file' => $file,
                'SZ' => $this->size,
                'PB' => $this->infos['PB'] = empty($data[0][0]['PB']) ? NULL : $data[0][0]['PB'],
                'BR' => $this->infos['BR'] = empty($data[0][0]['BR']) ? NULL : $data[0][0]['BR'],
                'PW' => $this->infos['PW'] = empty($data[0][0]['PW']) ? NULL : $data[0][0]['PW'],
                'WR' => $this->infos['WR'] = empty($data[0][0]['WR']) ? NULL : $data[0][0]['WR'],
                'KM' => $this->infos['KM'] = empty($data[0][0]['KM']) ? NULL : $data[0][0]['KM'],
                'DT' => $this->infos['DT'] = empty($data[0][0]['DT']) ? NULL : $data[0][0]['DT'],
                'PC' => $this->infos['PC'] = empty($data[0][0]['PC']) ? NULL : $data[0][0]['PC'],
                'TM' => $this->infos['TM'] = empty($data[0][0]['TM']) ? NULL : $data[0][0]['TM'],
                'OT' => $this->infos['OT'] = empty($data[0][0]['OT']) ? NULL : $data[0][0]['OT'],
                'RU' => $this->infos['RU'] = empty($data[0][0]['RU']) ? NULL : $data[0][0]['RU'],
                'comments' => $jsoncomments,
                'symbols' => $jsonsymbols,
                'branchs' => $this->branchs,
                'game' => $jsongame,
            ));
        }*/
        $db = null; // ferme la connexion
    }/*}}}*/

    public function getData() {
        $sgfdata['size'] = $this->size;
        $sgfdata['infos'] = $this->infos;
        $sgfdata['comments'] = $this->comments;
        $sgfdata['symbols'] = $this->symbols;
        $sgfdata['game'] = $this->game;
        return $sgfdata;
    }

    // lit un SGF et le stocke dans une table[noeud][branche]
    protected function SgfToTab($data) {/*{{{*/

        $sgftab = array();

        $branch = 0; // branche actuelle
        $node = 0; // noeud actuel
        $mark = 0; // marqueur de branche
        $nodemark = array(); // tableau des noeuds de marqueurs pour revenir aux branches
        $nodedata = ''; // données du noeud
        $branchend = false; // fin de branche
        $start = true; // début de fichier
        $retnode = false; // retour au noeud de la branche suivante
        $dataw = false; // données du noeud précédent écrites

        $file = fopen($data, "r"); // ouverture du fichier en lecture seule

        while (!feof($file)) { // lecture du fichier caractère par caractère
            $char = fgetc($file); // caractère courant
            switch ($char) {
            case "(": // début de branche
                // si précédée de ) nouvelle branche
                if ($branchend) {
                    $branch++;
                    $node = $nodemark[$mark] + 1;
                    $mark--;
                    $branchend = false;
                    $retnode = true;
                }
                // sinon on est encore dans la même et c'est un repère
                else {
                    if (!$start) {
                        $mark++;
                        $nodemark[$mark] = $node;
                    }
                }
                break;
            case ")": // fin de branche
                if (!$dataw) {
                    $sgftab[$node][$branch] = $nodedata;
                    $nodedata = ''; // effacer les données
                    $dataw = true;
                }
                $branchend = true;
                break;
            case ";": // nouveau noeud
                if (!$start) {
                    if (!$dataw) {
                        $sgftab[$node][$branch] = $nodedata;
                        $nodedata = ''; // effacer les données
                    }
                    if (!$retnode) {
                        $node++; 
                    }
                    $retnode = false;
                    $dataw = false;
                }
                $start = false;
                break;
            default: // données
                $nodedata .= $char;
            }
        }
        $this->branchs = $branch;
        return $this->KeysTable($sgftab);
    }/*}}}*/

    //organise les données SGF dans un tableau[noeud][branche][clé] = valeur
    protected function KeysTable($table) {/*{{{*/

        $keys_table = array();

        for ($i = 0; $i < sizeof($table); $i++) {
            foreach ($table[$i] as $j => $value) {
                //lecture caractère par caratère
                $valchars = str_split($value);
                $escape = false;
                $space = false;
                $key = '';
                $prevkey = '';
                $isval = false;
                $val = '';
                foreach ($valchars as $char) {
                    switch ($char) {
                    case "[": //début de valeur
                        if ($space) {
                            $val .= $char;
                            $space = false;
                        } else {
                            $isval = true;
                        }
                        break;
                    case "\\": // pour prendre en compte les ] dans les commentaires
                        $space = false;
                        $escape = true;
                        break;
                    case " ": // pour prendre en compte les [ dans les commentaires
                        $val .= $char;
                        $space = true;
                        break;
                    case "]": //fin de valeur
                        $space = false;
                        if ($escape) {
                            $val .= $char;
                            $escape = false;
                        } else {
                            if ($key == '') { // valeur supplémentaire de la clé précédente
                                $keys_table[$i][$j][$prevkey] .= ','.$val;
                            } else {
                                $keys_table[$i][$j][$key] = $val;
                                $prevkey = $key;
                                $key = '';
                            }
                            $isval = false;
                            $val = '';
                        }
                        break;
                    default:
                        $space = false;
                        if ($isval) {
                            if ($char == "\n") {
                                $val .= "<br />"; // retour à la ligne pour affichage html
                            } else {
                                $val .= $char;
                            }
                        }
                        else {
                            if ($char != "\n") {
                                $key .= $char;
                            }
                        }
                    }
                }
            }
        }  
        return $keys_table;
    }/*}}}*/

    //traite le déroulement du jeu et enregistre chaque état dans un tableau
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
                            $this->game[$j][$i]['b'] = $value;
                            break;
                        case 'AW': // ajout de pierre(s) blanche(s)
                            $this->game[$j][$i]['w'] = $value;
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

    //joue un coup et calcul l'état du goban en fonction de l'état précédent
    protected function PlayMove($node,$branch,$color,$coord) {/*{{{*/
        $b = $branch;

        while ($b >= 0) { //cherche un état précédent
            if (isset($this->game[$node-1][$b])) {
                $this->game[$node][$branch] = $this->game[$node-1][$b];
                $this->state = $this->GobanState($node,$branch);
                $x = ord(substr($coord,0,1)) - 97;
                $y = ord(substr($coord,1,1)) - 97;
                $this->state[$x][$y] = $color; // ajoute le coup joué à l'état
                $this->TestDeath($color,$x,$y);
                //TODO calculer les pierres mortes et les KO
                $this->game[$node][$branch][$color] .=
                    ($this->game[$node][$branch][$color] != '') ? ','.$coord : $coord;
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
        for ($i = 0; $i < $this->size; $i++) {
            for ($j = 0; $j < $this->size; $j++) {
                $state[$i][$j] = '';
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

    // test des pierres mortes
    protected function TestDeath($color,$x,$y) {
        $this->deads = [];
        if ($this->TestLiberties($color,$x-1,$y) == 0) {
            // TODO si on a pas de libertés alors procéder à la capture
            // des morts potentiels
            // modifier $state pour enlever les pierres mortes
            $prison = implode($this->deads);
            echo 'kill:'.$prison.';';
        }
        $this->deads = [];
        if ($this->TestLiberties($color,$x,$y-1) == 0) {
            $prison = implode($this->deads);
            echo 'kill:'.$prison.';';
        }
        $this->deads = [];
        if ($this->TestLiberties($color,$x+1,$y) == 0) {
            $prison = implode($this->deads);
            echo 'kill:'.$prison.';';
        }
        $this->deads = [];
        if ($this->TestLiberties($color,$x,$y+1) == 0) {
            $prison = implode($this->deads);
            echo 'kill:'.$prison.';';
        }
    }

    // test les libertés d'une pierre ou un groupe de pierres
    protected function TestLiberties($color,$x,$y) {
        $ennemy = ($color == 'b') ? 'w' : 'b';
        if (isset($this->state[$x][$y])) {
            if ($this->state[$x][$y] == '') {
                return 1; // liberté
            }
            if ($this->state[$x][$y] == $ennemy) {
                $dead = $x . ',' . $y;
                $this->deads[] = $dead;
                // TODO problème mémoire de la récursivité
                // éviter certains appels ?
                // ne pas retester une pierre déjà testée
                if ($this->TestLiberties($color,$x-1,$y) == 1) return 1;
                if ($this->TestLiberties($color,$x,$y-1) == 1) return 1;
                if ($this->TestLiberties($color,$x+1,$y) == 1) return 1;
                if ($this->TestLiberties($color,$x,$y+1) == 1) return 1;
                return 0; // aucune liberté
            }
            return 2; // pierre de la même couleur
        } else return 2; // bord du goban
    }
}
?>
