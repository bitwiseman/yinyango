<?php
// Script PHP qui traite les requêtes AJAX envoyées par le client 
 
// Récupération des paramètres
$test = '';
if (isset($_GET['test'])) {
    $test = $_GET['test'];
}

// Traitements
$retour = '{ "Retour": "' . $test . '" }';
 
// Envoi du retour (on renvoi le tableau $retour encodé en JSON)
header('Content-type: application/json');
echo $retour;

?>
