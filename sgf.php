<?php
session_start();

//Convertit un fichier SGF au format JSON
function SgfToJson($data) {/*{{{*/

    $sgf_json = '{';
    $b = 0;
    $n = 0;

    $sgf = fopen($data, "r"); //Ouverture du fichier en lecture seule

    while (!feof($sgf)) { //Lecture du fichier caractère par caractère
        $char = fgetc($sgf); //Caractère courant
        switch ($char) {

            //TODO: Plusieurs branches

            case "(": //Début de branche
                $sgf_json .= 'branche' . $b++ . ':{';
                break;
            case ")": //Fin de branche
                $sgf_json = substr($sgf_json,0,-1);
                $sgf_json .= '}}';
                break;
            case ";": //Nouveau noeud
                if ($n != 0) {
                    $sgf_json = substr($sgf_json,0,-1);
                    $sgf_json .= '},noeud' . $n++ . ':{';
                }
                else {
                    $sgf_json .= 'noeud' . $n++ . ':{';
                }
                break;
            case "[": //Nouvelle valeur
                $sgf_json .= ':"';
                break;
            case "]": //Fin de valeur
                $sgf_json .= '",';
                break;
            case "\n": //Enlève les retours à la ligne TODO: Les inclure pour les commentaires
                $sgf_json .= '';
                break;
            default: //Attribut
                $sgf_json .= $char;
        }
    }
    $sgf_json .= '}';
    return $sgf_json;
}/*}}}*/

//Lit un SGF et le stocke dans une base de données
function SgfToSql($data) {/*{{{*/

    $table_name = 'fichier_sgf'; //TODO: Créer une table à partir du nom SGF
    
    CreateSqlTable($table_name);

    $b = 0; //branche actuelle
    $n = array(); //tableau des noeuds de la forme noeud[branche]
    $nd = ''; //données du noeud
    $dw = true; //données écrites dans la table

    $sgf = fopen($data, "r"); //Ouverture du fichier en lecture seule

    while (!feof($sgf)) { //Lecture du fichier caractère par caractère
        $char = fgetc($sgf); //Caractère courant
        switch ($char) {
            case "(": //Début de branche
                //Envoyer les données du précédent noeud à la BDD
                //si elles n'ont pas déjà été envoyées
                if (!$dw) {
                    SendToSql($table_name,$b,$n[$b],$nd);
                    $dw = true;
                }
                
                $b++;
                $n[$b] = $n[$b - 1];
                break;
            case ")": //Fin de branche
                //Envoyer les données du précédent noeud à la BDD
                //si elles n'ont pas déjà été envoyées
                if (!$dw) {
                    SendToSql($table_name,$b,$n[$b],$nd);
                    $dw = true;
                }
                
                $b--;
                break;
            case ";": //Nouveau noeud
                //Envoyer les données du précédent noeud à la BDD
                //si elles n'ont pas déjà été envoyées
                if (!$dw) {
                    SendToSql($table_name,$b,$n[$b],$nd);
                }
                
                $nd = ''; //Effacer les données

                $dw = false;
                $n[$b]++; 
                break;
            default: //Données
                $nd .= $char;
        }
    }
}/*}}}*/

//Envoyer des données dans une table SQL
function SendToSql($table,$colonne,$ligne,$data) {/*{{{*/
    
    try
    {
        $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
        $bdd = new PDO('mysql:host=localhost;dbname=sgf', 'root', '!', $pdo_options);
    }
    catch (Exception $e)
    {
        die('Erreur : ' . $e->getMessage());
    }

    //Test si la colonne existe, sinon on l'ajoute
    try {
        $bdd->query("SELECT `$colonne` FROM $table");
    }
    catch (Exception $e) {
        $bdd->exec("ALTER TABLE $table ADD `$colonne` TEXT"); 
    }

    //Test si la ligne existe, sinon on l'ajoute
    try {
        $bdd->query("SELECT * FROM $table WHERE node=$ligne");
    }
    catch (Exception $e) {
        echo("ligne $ligne");
        $bdd->exec("INSERT INTO $table VALUES(NULL)");
    }

    $bdd->exec("UPDATE $table SET `$colonne` = '$data' WHERE node = $ligne");
    //$req->execute(array($col,$data));


}/*}}}*/

//Créer une table SQL pour acceuillir les données SGF
function CreateSqlTable($table) {/*{{{*/

    try
    {
        $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
        $bdd = new PDO('mysql:host=localhost;dbname=sgf', 'root', '!', $pdo_options);
    }
    catch (Exception $e)
    {
        die('Erreur : ' . $e->getMessage());
    }

    $bdd->exec("CREATE TABLE $table (`node` INT NOT NULL AUTO_INCREMENT PRIMARY KEY)");

}/*}}}*/

//Lit un SGF et le stocke dans une table de la forme sgftab[noeud][branche]
function SgfToTab($data) {/*{{{*/

    $sgftab = array();

    $b = 0; //branche actuelle
    $n = 0; //noeud actuel
    $bm = 0; //marqueur de branche
    $nmt = array(); //tableau des noeuds de la forme nmt[marqueur]
    $nd = ''; //données du noeud
    $eob = false; //fin de branche
    $sof = true; //début de fichier
    $rn = false; //retour au noeud de la branche suivante
    $dw = false; //données du noeud précédent écrites

    $sgf = fopen($data, "r"); //Ouverture du fichier en lecture seule

    while (!feof($sgf)) { //Lecture du fichier caractère par caractère
        $char = fgetc($sgf); //Caractère courant
        switch ($char) {
            case "(": //Début de branche
                //si précédée de ) nouvelle branche
                if ($eob) {
                    $b++;
                    $n = $nmt[$bm] + 1;
                    $bm--;
                    $eob = false;
                    $rn = true;
                }
                //sinon on est encore dans la même et c'est un repère
                else {
                    if (!$sof) {
                        $bm++;
                        $nmt[$bm] = $n;
                    }
                }
                break;
            case ")": //Fin de branche
                if (!$dw) {
                    $sgftab[$n][$b] = $nd;
                    $nd = ''; //Effacer les données
                    $dw = true;
                }
                $eob = true;
                break;
            case ";": //Nouveau noeud
                if (!$sof) {
                    if (!$dw) {
                        $sgftab[$n][$b] = $nd;
                        $nd = ''; //Effacer les données
                    }
                    if (!$rn) {
                        $n++; 
                    }
                    $rn = false;
                    $dw = false;
                }
                $sof = false;
                break;
            default: //Données
                $nd .= $char;
        }
    }
    $_SESSION['branchs'] = $b;
    return KeysTable($sgftab);
}/*}}}*/

//organise les données SGF dans un tableau[noeud][branche][clé] = valeur
function KeysTable($table) {/*{{{*/

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
function GobanTable($table) {/*{{{*/

    $branchs = $_SESSION['branchs'];

    for ($i = 0; $i <= $branchs; $i++) {
        for ($j = 0; $j < sizeof($table); $j++) {
            if (isset($table[$j][$i])) {
                foreach ($table[$j][$i] as $key => $value) {
                    switch ($key) {
                    case 'B': //noir joue
                        PlayMove($j,$i,'b',$value);
                        break;
                    case 'W': //blanc joue
                        PlayMove($j,$i,'w',$value);
                        break;
                    case 'AB': //ajout de pierre(s) noire(s)
                        AddMove($j,$i,'b',$value);
                        break;
                    case 'AW': //ajout de pierre(s) blanche(s)
                        AddMove($j,$i,'w',$value);
                        break;
                    default:
                    }
                }
            }
        }
    }
}/*}}}*/

function PlayMove($node,$branch,$color,$coord) {

    $goban = $_SESSION['goban'];
    $size = $_SESSION['size'];

    $b = $branch;
    while ($b >= 0) { //cherche un état précédent
        if (isset($goban[$node-1][$b])) {
            echo $branch.':'.$node.':'.$b.',';
            $goban[$node][$branch] = $color.$coord;
            break;
        }
        $b--;
    }
    if ($b == -1) { //on n'a pas trouvé d'état précédent donc c'est un départ
        echo 'd'.$node.':'.$branch.',';
        $goban[$node][$branch] = $color.$coord;
    }

    $_SESSION['goban'] = $goban;
}

function AddMove($node,$branch,$color,$coord) {

}

//récupère le nom de fichier SGF
$sgf = '';
if (isset($_GET['file'])) {
    $sgf = $_GET['file'];
    //tester que le fichier existe
    if (file_exists('sgf/' . $sgf)) {
        $sgf = 'sgf/' . $sgf;
        $tab = SgfToTab($sgf);

        $_SESSION['size'] = $tab[0][0]['SZ'];

        $_SESSION['goban'] = array();
        GobanTable($tab); //stocke les états du jeu dans $_SESSION['goban']

        //renvoi le tableau[noeuds][branches][clés] encodé en json
        header('Content-type: application/json');
        echo json_encode($_SESSION['goban']);
        //echo json_encode($tab);
    }
}
?>
