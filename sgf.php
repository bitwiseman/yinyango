<?php

//Convertit un fichier SGF au format JSON
function SgfToJson($data) {/*{{{*/

    $sgf_json = '{';
    $branche = 0;
    $noeud = 0;

    $sgf = fopen($data, "r"); //Ouverture du fichier en lecture seule

    while (!feof($sgf)) { //Lecture du fichier caractère par caractère
        $char = fgetc($sgf); //Caractère courant
        switch ($char) {

            //TODO: Plusieurs branches

            case "(": //Début de branche
                $sgf_json .= 'branche' . $branche++ . ':{';
                break;
            case ")": //Fin de branche
                $sgf_json = substr($sgf_json,0,-1);
                $sgf_json .= '}}';
                break;
            case ";": //Nouveau noeud
                if ($noeud != 0) {
                    $sgf_json = substr($sgf_json,0,-1);
                    $sgf_json .= '},noeud' . $noeud++ . ':{';
                }
                else {
                    $sgf_json .= 'noeud' . $noeud++ . ':{';
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

$sgf_file = 'sgf/simple.sgf';
echo SgfToJson($sgf_file);

?>
