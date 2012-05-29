<?php
/**
 * Class de traitement des fichiers SGF
 */
class sgf
{
    private $game;
    private $size;
    private $branchs;

    // construction des variables
    function __construct($file,$hostname,$dbuser,$dbpass,$dbname) {/*{{{*/
        // connexion base de données
        try {
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
            $this->game = json_decode($vars['game']);
            $this->size = $vars['size'];
            $this->branchs = $vars['branchs'];
        }
        else {
            $temptab = $this->SgfToTab($file);
            $this->size = $temptab[0][0]['SZ'];
            $this->GameTable($temptab);
            
            $jsongame = json_encode($this->game);
            $insert = $db->prepare('INSERT INTO sgf VALUES(:file, :game, :size, :branchs)');
            $insert->execute(array(
                'file' => $file,
                'game' => $jsongame,
                'size' => $this->size,
                'branchs' => $this->branchs,
            ));
        }
        $db = null; // ferme la connexion
    }/*}}}*/

    public function getGame() {
        return $this->game;
    }

    public function getSize() {
        return $this->size;
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
                $key = '';
                $prevkey = '';
                $isval = false;
                $val = '';
                foreach ($valchars as $char) {
                    switch ($char) {
                    case "[": //début de valeur
                        $isval = true;
                        break;
                    case "]": //fin de valeur
                        if ($key == '') { // valeur supplémentaire de la clé précédente
                            $keys_table[$i][$j][$prevkey] .= ','.$val;
                        } else {
                            $keys_table[$i][$j][$key] = $val;
                            $prevkey = $key;
                            $key = '';
                        }
                        $isval = false;
                        $val = '';
                        break;
                    default:
                        if ($isval) {
                            $val .= $char;
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
                    foreach ($table[$j][$i] as $key => $value) {
                        switch ($key) {
                        case 'B': //noir joue
                            $this->PlayMove($j,$i,'b',$value);
                            break;
                        case 'W': //blanc joue
                            $this->PlayMove($j,$i,'w',$value);
                            break;
                        case 'AB': //ajout de pierre(s) noire(s)
                            $this->AddMove($j,$i,'b',$value);
                            break;
                        case 'AW': //ajout de pierre(s) blanche(s)
                            $this->AddMove($j,$i,'w',$value);
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
                //TODO calculer les pierres mortes et les KO
                $this->game[$node][$branch][$color] .=
                    ($this->game[$node][$branch][$color] != '') ? ','.$coord : $coord;
                break;
            }
            $b--;
        }
        if ($b == -1) { //on n'a pas trouvé d'état précédent donc c'est un départ
            $this->game[$node][$branch][$color] = $coord;
            $ocolor = ($color == 'b') ? 'w' : 'b';
            $this->game[$node][$branch][$ocolor] = '';
        }
        $this->game[$node][$branch]['p'] = $color.','.$coord;
    }/*}}}*/


    protected function AddMove($node,$branch,$color,$coord) {
        $this->game[$node][$branch][$color] = $coord;
    }
}
?>
