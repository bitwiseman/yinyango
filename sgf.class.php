<?php
/**
 * Class de traitement des fichiers SGF
 */
class sgf
{
    private $game;
    private $size;
    private $branchs;
    
    function __construct($file)
    {
        //TODO test si le fichier SGF est déjà enregistré dans la BDD
        //et charge les variables, sinon calcule le déroulement de la
        //partie et la stocke dans la BDD.
        $temptab = $this->SgfToTab($file);
        $this->size = $temptab[0][0]['SZ'];
        $this->GameTable($temptab);
    }

    public function getGame() {
        return $this->game;
    }

    public function getSize() {
        return $this->size;
    }

    // lit un SGF et le stocke dans une table[noeud][branche]
    protected function SgfToTab($data) {/*{{{*/

        $sgftab = array();

        $b = 0; // branche actuelle
        $n = 0; // noeud actuel
        $bm = 0; // marqueur de branche
        $nmt = array(); // tableau des noeuds de la forme nmt[marqueur]
        $nd = ''; // données du noeud
        $eob = false; // fin de branche
        $sof = true; // début de fichier
        $rn = false; // retour au noeud de la branche suivante
        $dw = false; // données du noeud précédent écrites

        $file = fopen($data, "r"); // ouverture du fichier en lecture seule

        while (!feof($file)) { // lecture du fichier caractère par caractère
            $char = fgetc($file); // caractère courant
            switch ($char) {
            case "(": // début de branche
                // si précédée de ) nouvelle branche
                if ($eob) {
                    $b++;
                    $n = $nmt[$bm] + 1;
                    $bm--;
                    $eob = false;
                    $rn = true;
                }
                // sinon on est encore dans la même et c'est un repère
                else {
                    if (!$sof) {
                        $bm++;
                        $nmt[$bm] = $n;
                    }
                }
                break;
            case ")": // fin de branche
                if (!$dw) {
                    $sgftab[$n][$b] = $nd;
                    $nd = ''; // effacer les données
                    $dw = true;
                }
                $eob = true;
                break;
            case ";": // nouveau noeud
                if (!$sof) {
                    if (!$dw) {
                        $sgftab[$n][$b] = $nd;
                        $nd = ''; // effacer les données
                    }
                    if (!$rn) {
                        $n++; 
                    }
                    $rn = false;
                    $dw = false;
                }
                $sof = false;
                break;
            default: // données
                $nd .= $char;
            }
        }
        $this->branchs = $b;
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
                $isval = false;
                $val = '';
                foreach ($valchars as $char) {
                    switch ($char) {
                    case "[": //début de valeur
                        $isval = true;
                        break;
                    case "]": //fin de valeur
                        $keys_table[$i][$j][$key] = $val;
                        $key = '';
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
                $this->game[$node][$branch][$color] .= $coord.',';
                break;
            }
            $b--;
        }
        if ($b == -1) { //on n'a pas trouvé d'état précédent donc c'est un départ
            $this->game[$node][$branch][$color] = $coord.',';
            $ocolor = ($color == 'b') ? 'w' : 'b';
            $this->game[$node][$branch][$ocolor] = '';
        }

    }/*}}}*/


    protected function AddMove($node,$branch,$color,$coord) {

    }
}
?>
