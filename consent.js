// Bandeau cookies + chargement du tracking (Google Consent Mode v2)
// À RENSEIGNER : identifiants fournis par l'école (laisser vide tant qu'ils ne sont pas connus)
var TRACKING = {
  ga4: 'G-SMREHHJEKL', // ex. 'G-ABC123XYZ'  (Google Analytics 4)
  ads: '',     // ex. 'AW-123456789' (balise Google Ads, facultatif si les conversions sont importées depuis GA4)
  contentsquare: 'a6be230f0f648' // ID de balise Contentsquare (ex-Hotjar) : session replay, heatmaps
};

window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }

// Par défaut, rien n'est autorisé tant que la personne n'a pas choisi
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});

var CLE_CONSENTEMENT = 'consentement_cookies';

function lireConsentement(){
  try { return localStorage.getItem(CLE_CONSENTEMENT); } catch(e){ return null; }
}
function enregistrerConsentement(valeur){
  try { localStorage.setItem(CLE_CONSENTEMENT, valeur); } catch(e){}
}

function chargerScript(src){
  var s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

// GA4 et Google Ads : chargés dans tous les cas, ils respectent le consentement (Consent Mode)
var idGoogle = TRACKING.ga4 || TRACKING.ads;
if(idGoogle){
  chargerScript('https://www.googletagmanager.com/gtag/js?id=' + idGoogle);
  gtag('js', new Date());
  if(TRACKING.ga4){ gtag('config', TRACKING.ga4); }
  if(TRACKING.ads){ gtag('config', TRACKING.ads); }
}

// Contentsquare (ex-Hotjar) : chargé uniquement après acceptation
var contentsquareCharge = false;
function chargerContentsquare(){
  if(!TRACKING.contentsquare || contentsquareCharge){ return; }
  contentsquareCharge = true;
  chargerScript('https://t.contentsquare.net/uxa/' + TRACKING.contentsquare + '.js');
}

function appliquerConsentement(valeur){
  var ok = valeur === 'accepte' ? 'granted' : 'denied';
  gtag('consent', 'update', {
    ad_storage: ok,
    ad_user_data: ok,
    ad_personalization: ok,
    analytics_storage: ok
  });
  if(valeur === 'accepte'){ chargerContentsquare(); }
}

var choix = lireConsentement();
if(choix){ appliquerConsentement(choix); }

// Bandeau : affiché tant que la personne n'a pas choisi, ou via le lien « Gestion des cookies »
function afficherBandeau(){
  var existant = document.getElementById('bandeauCookies');
  if(existant){ existant.hidden = false; return; }

  var bandeau = document.createElement('div');
  bandeau.id = 'bandeauCookies';
  bandeau.className = 'cookies';
  bandeau.setAttribute('role', 'dialog');
  bandeau.setAttribute('aria-label', 'Gestion des cookies');
  bandeau.innerHTML =
    '<p>Nous utilisons des cookies pour mesurer l\'audience de cette page et l\'efficacité de nos annonces. ' +
    'Vous pouvez accepter ou refuser ; votre choix est modifiable à tout moment. ' +
    '<a href="confidentialite.html#cookies">En savoir plus</a></p>' +
    '<div class="cookies-boutons">' +
    '<button type="button" class="btn btn-secondaire" data-choix="refuse">Refuser</button>' +
    '<button type="button" class="btn" data-choix="accepte">Accepter</button>' +
    '</div>';
  document.body.appendChild(bandeau);

  bandeau.addEventListener('click', function(e){
    var valeur = e.target.getAttribute('data-choix');
    if(!valeur){ return; }
    enregistrerConsentement(valeur);
    appliquerConsentement(valeur);
    bandeau.hidden = true;
  });
}

document.addEventListener('DOMContentLoaded', function(){
  if(!lireConsentement()){ afficherBandeau(); }
  // Lien « Retour » : revient à la page précédente du site (le formulaire garde sa saisie)
  document.querySelectorAll('[data-retour]').forEach(function(lien){
    lien.addEventListener('click', function(e){
      if(document.referrer.indexOf(location.host) !== -1 && history.length > 1){
        e.preventDefault();
        history.back();
      }
    });
  });
  document.querySelectorAll('[data-cookies]').forEach(function(lien){
    lien.addEventListener('click', function(e){
      e.preventDefault();
      afficherBandeau();
    });
  });
});
