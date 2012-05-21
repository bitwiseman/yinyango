<?php

include_once 'sgf.class.php';

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

//récupère le nom de fichier SGF
$sgf = '';
if (isset($_GET['file'])) {
    $file = $_GET['file'];
    //tester que le fichier existe
    if (file_exists($file)) {
        $sgf = new sgf($file);
        $data['game'] = $sgf->getGame();
        $data['size'] = $sgf->getSize();

        //TODO renvoi le déroulement de la partie et la taille du goban encodé en json
        header('Content-type: application/json');
        echo json_encode($data);
    }
}
?>
