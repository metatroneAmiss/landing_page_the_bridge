// Bandeau cookies + chargement du tracking (Google Consent Mode v2)
// À RENSEIGNER : identifiants fournis par l'école (laisser vide tant qu'ils ne sont pas connus)
var TRACKING = {
  ga4: 'G-SMREHHJEKL', // ex. 'G-ABC123XYZ'  (Google Analytics 4)
  ads: '',     // ex. 'AW-123456789' (balise Google Ads, facultatif si les conversions sont importées depuis GA4)
  hotjar: ''   // ex. '1234567'      (ID du site Hotjar)
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

// Hotjar : chargé uniquement après acceptation
var hotjarCharge = false;
function chargerHotjar(){
  if(!TRACKING.hotjar || hotjarCharge){ return; }
  hotjarCharge = true;
  (function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:+TRACKING.hotjar,hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
}

function appliquerConsentement(valeur){
  var ok = valeur === 'accepte' ? 'granted' : 'denied';
  gtag('consent', 'update', {
    ad_storage: ok,
    ad_user_data: ok,
    ad_personalization: ok,
    analytics_storage: ok
  });
  if(valeur === 'accepte'){ chargerHotjar(); }
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
  document.querySelectorAll('[data-cookies]').forEach(function(lien){
    lien.addEventListener('click', function(e){
      e.preventDefault();
      afficherBandeau();
    });
  });
});
