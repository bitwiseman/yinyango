<?php error_reporting(E_ALL);
session_start();
$arg_table = $_GET;

if (isset($arg_table['reset'])) {
    session_unset();
}

if(isset($arg_table['file'])){
    if(!isset($_SESSION['fichier_goban'])){
        $_SESSION['fichier_goban'] = file($arg_table['file']);
    }
    else{
        session_unset();
        $_SESSION['fichier_goban'] = file($arg_table['file']);
    }     
}
else $_SESSION['fichier_goban'] = file('test');
if(!isset($_SESSION['jeucouleur'])){
    $_SESSION['jeucouleur'] = 'n';
}
if(!isset($_SESSION['goban'])){
    $_SESSION['taille_goban'] = rtrim($_SESSION['fichier_goban'][0],"\r\n");
    for($x=-1;$x<$_SESSION['taille_goban']+1;$x++){
        for($y=-1;$y<$_SESSION['taille_goban']+1;$y++){
            $_SESSION['goban'][$x][$y]['pierre'] = '';
            $_SESSION['goban'][$x][$y]['groupe'] = '';
        }
    }
    $initb = explode(';',$_SESSION['fichier_goban'][1]);
    $initn = explode(';',$_SESSION['fichier_goban'][2]);
    for($i=0;$i<sizeof($initb)-1;$i++){        
        $initb[$i] = explode(',',$initb[$i]);
        $_SESSION['goban'][$initb[$i][0]][$initb[$i][1]]['pierre'] = 'b';
    }
    for($i=0;$i<sizeof($initn)-1;$i++){
        $initn[$i] = explode(',',$initn[$i]);
        $_SESSION['goban'][$initn[$i][0]][$initn[$i][1]]['pierre'] = 'n';
    }
    Initialisation_groupes();
    //echo($_SESSION['taille_goban']);
    //echo($_SESSION['libertes_groupe']['w2']);
    //echo($_SESSION['taille_groupe']['b3']);
    //echo($_SESSION['goban'][4][5]['libertes']);
    //echo($_SESSION['goban'][4][4]['groupe']);
}

if(isset($arg_table['last'])){
    $pierrejouee = explode(';',$arg_table['last']);
    $couleur = $pierrejouee[0];
    $x = $pierrejouee[1];
    $y = $pierrejouee[2];
    echo($_SESSION['goban'][$x][$y]['libertes']);
    // aucune pierre au contact
    if($_SESSION['goban'][$x][$y]['libertes'] == ''){
        $_SESSION['goban'][$x][$y]['pierre'] = $couleur;
        $_SESSION['goban'][$x][$y]['groupe'] = $couleur.($_SESSION['numero_groupe']+1);
        $_SESSION['taille_groupe'][$_SESSION['goban'][$x][$y]['groupe']]++;
        $_SESSION['numero_groupe']++;
        // ajoute les libertés
        if($x-1 >= 0){
            $_SESSION['goban'][$x-1][$y]['libertes'] .= $_SESSION['goban'][$x][$y]['groupe'].';';
            $_SESSION['libertes_groupe'][$_SESSION['goban'][$x][$y]['groupe']]++;
        }
        if($y-1 >= 0){
            $_SESSION['goban'][$x][$y-1]['libertes'] .= $_SESSION['goban'][$x][$y]['groupe'].';';
            $_SESSION['libertes_groupe'][$_SESSION['goban'][$x][$y]['groupe']]++;
        }
        if($x+1 < $_SESSION['taille_goban']){
            $_SESSION['goban'][$x+1][$y]['libertes'] .= $_SESSION['goban'][$x][$y]['groupe'].';';
            $_SESSION['libertes_groupe'][$_SESSION['goban'][$x][$y]['groupe']]++;
        }
        if($y+1 < $_SESSION['taille_goban']){
            $_SESSION['goban'][$x][$y+1]['libertes'] .= $_SESSION['goban'][$x][$y]['groupe'].';';
            $_SESSION['libertes_groupe'][$_SESSION['goban'][$x][$y]['groupe']]++;
        }
    }
    // pierre(s) au contact
    else{
        $contacts = explode(';',$_SESSION['goban'][$x][$y]['libertes']);
        // vérifie les groupes au contact
        for($i=0;$i<sizeof($contacts)-1;$i++){
            $pos = strpos($contacts[$i],$couleur);
            // couleur différente
            if($pos === false){
                echo('*');
            }
            // même couleur
            else{
                //if($_SESSION['libertes_groupe'][$contacts[$i]])
                echo($couleur);
            }
        }
    }
    if($couleur == 'n') $_SESSION['jeucouleur'] = 'b';
    else $_SESSION['jeucouleur'] = 'n';
}

function Initialisation_groupes(){
    $_SESSION['numero_groupe'] = 0;
    // initialise le nombre de libertés des groupes et le nombre de pierres de chacun
    for($i=0;$i<100;$i++){
        $_SESSION['libertes_groupe']['b'.$i] = 0;
        $_SESSION['libertes_groupe']['n'.$i] = 0;
        $_SESSION['taille_groupe']['b'.$i] = 0;
        $_SESSION['taille_groupe']['n'.$i] = 0;
    }
    // formation des groupes
    for($x=0;$x<$_SESSION['taille_goban'];$x++){
        for($y=0;$y<$_SESSION['taille_goban'];$y++){
            if($_SESSION['goban'][$x][$y]['pierre'] != ''){
                if($_SESSION['goban'][$x-1][$y]['pierre'] == $_SESSION['goban'][$x][$y]['pierre']){
                    if($_SESSION['goban'][$x][$y-1]['pierre'] == $_SESSION['goban'][$x][$y]['pierre'] && $_SESSION['goban'][$x][$y-1]['groupe'] != $_SESSION['goban'][$x-1][$y]['groupe']){
                        // si deux groupes différents sont liés par une pierre, converti le second groupe pour qu'il fasse partie du premier
                        Conversion($_SESSION['goban'][$x-1][$y]['groupe'],$_SESSION['goban'][$x][$y-1]['groupe']);
                        $_SESSION['goban'][$x][$y]['groupe'] = $_SESSION['goban'][$x-1][$y]['groupe'];
                        $_SESSION['taille_groupe'][$_SESSION['goban'][$x][$y]['groupe']]++;
                    }
                    else{
                        $_SESSION['goban'][$x][$y]['groupe'] = $_SESSION['goban'][$x-1][$y]['groupe'];
                        $_SESSION['taille_groupe'][$_SESSION['goban'][$x][$y]['groupe']]++;
                    }
                }
	            else if($_SESSION['goban'][$x][$y-1]['pierre'] == $_SESSION['goban'][$x][$y]['pierre']){
	                $_SESSION['goban'][$x][$y]['groupe'] = $_SESSION['goban'][$x][$y-1]['groupe'];
	                $_SESSION['taille_groupe'][$_SESSION['goban'][$x][$y-1]['groupe']]++;
	            }
	            else{
	                $_SESSION['goban'][$x][$y]['groupe'] = $_SESSION['goban'][$x][$y]['pierre'].($_SESSION['numero_groupe']+1);
	                $_SESSION['taille_groupe'][$_SESSION['goban'][$x][$y]['groupe']]++;
	                $_SESSION['numero_groupe']++;
	            }
            }
        }
    }
    // test des libertés
    for($x=0;$x<$_SESSION['taille_goban'];$x++){
        for($y=0;$y<$_SESSION['taille_goban'];$y++){
            if($_SESSION['goban'][$x][$y]['pierre'] == ''){
                // est-ce une liberté du groupe ?
	            $_SESSION['goban'][$x][$y]['libertes'] = Libertes($x,$y);
	            if($_SESSION['goban'][$x][$y]['libertes'] != ''){
	                // ajoute la liberté aux groupes concernés
	                $libsgroupe = explode(';',$_SESSION['goban'][$x][$y]['libertes']);
	                for($i=0;$i<sizeof($libsgroupe)-1;$i++){
	                    $_SESSION['libertes_groupe'][str_replace(';','',$libsgroupe[$i])]++;
	                }
	            }   
            }
        }
    }
}

function Libertes($x,$y){
    $libertes = '';
    $libgauche = '';
    $libhaut = '';
    $libdroite = '';
    $libbas = '';
    if($_SESSION['goban'][$x-1][$y]['pierre'] != '') $libgauche = $_SESSION['goban'][$x-1][$y]['groupe'].';';
    if($_SESSION['goban'][$x][$y-1]['pierre'] != '' && $_SESSION['goban'][$x][$y-1]['groupe'] != str_replace(';','',$libgauche)) $libhaut = $_SESSION['goban'][$x][$y-1]['groupe'].';';
    if($_SESSION['goban'][$x+1][$y]['pierre'] != '' && $_SESSION['goban'][$x+1][$y]['groupe'] != str_replace(';','',$libgauche) && $_SESSION['goban'][$x+1][$y]['groupe'] != str_replace(';','',$libhaut)) $libdroite = $_SESSION['goban'][$x+1][$y]['groupe'].';';
    if($_SESSION['goban'][$x][$y+1]['pierre'] != '' && $_SESSION['goban'][$x][$y+1]['groupe'] != str_replace(';','',$libgauche) && $_SESSION['goban'][$x][$y+1]['groupe'] != str_replace(';','',$libhaut) && $_SESSION['goban'][$x][$y+1]['groupe'] != str_replace(';','',$libdroite)) $libbas = $_SESSION['goban'][$x][$y+1]['groupe'].';';
    $libertes = $libgauche.$libhaut.$libdroite.$libbas;
    return $libertes;
}

function Conversion($h,$l){
    $_SESSION['taille_groupe'][$h] = $_SESSION['taille_groupe'][$h] + $_SESSION['taille_groupe'][$l];
    for($x=0;$x<$_SESSION['taille_goban'];$x++){
        for($y=0;$y<$_SESSION['taille_goban'];$y++){
            if($_SESSION['goban'][$x][$y]['groupe'] == $l) $_SESSION['goban'][$x][$y]['groupe'] = $h;
        }
    }
}

function Reset_session(){
    session_unset();
    header('refresh:1;index.php');
}

?>
<!DOCTYPE html>
<html lang="fr">
    <head>
        <title>tsumego</title>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="tsumego.css" />
    </head>
    <body>
        <h1><?php echo session_id() ?></h1>
        <table style="background-image:url('images/goban<?php echo($_SESSION['taille_goban']); ?>.png')" id="goban">
<?php for($y=0;$y<$_SESSION['taille_goban'];$y++){ ?>
            <tr>
<?php for($x=0;$x<$_SESSION['taille_goban'];$x++){
            $pierre = '';
            if($_SESSION['jeucouleur'] == 'n') $jeupierre = 'jeunoir';
            if($_SESSION['jeucouleur'] == 'b') $jeupierre = 'jeublanc';
            if($_SESSION['goban'][$x][$y]['pierre'] == 'n') $pierre = 'noir';
            if($_SESSION['goban'][$x][$y]['pierre'] == 'b') $pierre = 'blanc';
?>
                <td <?php if($pierre != ''){?>class="<?php echo($pierre); ?>"<?php } ?>><?php if($pierre == '') echo('<a class="'.$jeupierre.'" href="index.php?'.session_id().'&amp;last='.$_SESSION['jeucouleur'].';'.$x.';'.$y.'"></a>'); ?></td>
<?php } ?>
            </tr>
<?php } ?>
        </table>
        <form method="get">
            <p><input type="hidden" name="reset"/></p>
            <p><input type="submit" value="Remise à zéro"/></p>
        </form>
    </body>
</html>
