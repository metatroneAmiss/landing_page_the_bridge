// À RELIER : URL de l'application Web Google Apps Script (voir google-apps-script.gs),
// de la forme https://script.google.com/macros/s/XXXXXXXX/exec
// Tant qu'elle est vide, le formulaire n'envoie rien : les leads ne sont pas enregistrés.
var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzCmTml3ogsbAa_ffnf3wrBre95IpuXR-FR9Xx3CUiFNiPwChc53R2bC-GGNZKo1SMc/exec';

// Infos de la réunion (page merci + lien Google Agenda) : à adapter avec l'école
var REUNION = {
  titre: "Réunion d'information – Bootcamp Traffic Manager (The BRIDGE)",
  lieu: 'The BRIDGE École-Entreprises, 73 rue Henri Barbusse, 92000 Nanterre',
  dureeMinutes: 60
};

window.dataLayer = window.dataLayer || [];

// Envoi d'un événement : via gtag (GA4) s'il est chargé, sinon via dataLayer (Google Tag Manager)
function track(name, params){
  params = params || {};
  if(typeof window.gtag === 'function'){
    window.gtag('event', name, params);
  } else {
    var data = {event:name};
    for(var k in params){ data[k] = params[k]; }
    window.dataLayer.push(data);
  }
}

// sessionStorage peut être indisponible (navigation privée, cookies bloqués)
function stocker(cle, valeur){
  try { sessionStorage.setItem(cle, valeur); } catch(e){}
}
function lire(cle){
  try { return sessionStorage.getItem(cle); } catch(e){ return null; }
}
function effacer(cle){
  try { sessionStorage.removeItem(cle); } catch(e){}
}

// Suivi des clics sur les boutons
document.querySelectorAll('[data-track]').forEach(function(b){
  b.addEventListener('click', function(){
    track('cta_click', {cta:b.getAttribute('data-track')});
  });
});

/* ---------- Page d'accueil : formulaire ---------- */

var form = document.getElementById('form');

if(form){
  var erreur = document.getElementById('formErreur');

  // Source du lead : UTM + gclid (identifiant de clic Google Ads) depuis l'URL
  var params = new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid'].forEach(function(name){
    if(params.get(name)){ form.elements[name].value = params.get(name); }
  });

  // Règles de validation : message affiché si le champ est invalide
  var regles = {
    prenom:    {test:function(v){ return v.length > 0; }, msg:'Indiquez votre prénom.'},
    nom:       {test:function(v){ return v.length > 0; }, msg:'Indiquez votre nom.'},
    email:     {test:function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }, msg:'Indiquez une adresse e-mail valide.'},
    tel:       {test:function(v){ return /^(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(v); }, msg:'Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).'},
    situation: {test:function(v){ return v !== ''; }, msg:'Sélectionnez votre situation.'},
    date:      {test:function(v){ return v !== ''; }, msg:'Choisissez une date de réunion.'}
  };

  var valider = function(){
    var messages = [], premier = null;
    Object.keys(regles).forEach(function(id){
      var el = document.getElementById(id);
      var ok = regles[id].test(el.value.trim());
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if(!ok){ messages.push(regles[id].msg); premier = premier || el; }
    });
    var rgpd = document.getElementById('rgpd');
    rgpd.setAttribute('aria-invalid', rgpd.checked ? 'false' : 'true');
    if(!rgpd.checked){ messages.push('Merci d\'accepter l\'utilisation de vos informations.'); premier = premier || rgpd; }
    erreur.textContent = messages.join(' ');
    if(premier){ premier.focus(); }
    return messages.length === 0;
  };

  // Formulaire : validation, envoi du lead, puis redirection vers la page merci
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(!valider()){ return; }

    var bouton = form.querySelector('button[type="submit"]');
    bouton.disabled = true;

    var select = form.elements.date;
    var dateLibelle = select.options[select.selectedIndex].text;

    // Envoi au format formulaire classique (lu par e.parameter côté Google Apps Script)
    var donnees = new URLSearchParams(new FormData(form));
    donnees.append('date_libelle', dateLibelle);
    donnees.append('page', window.location.href);

    var envoi = FORM_ENDPOINT
      ? fetch(FORM_ENDPOINT, {method:'POST', body:donnees})
          .then(function(r){ return r.json(); })
          .then(function(res){
            if(res.result !== 'success'){ throw new Error(res.message || 'Envoi refusé'); }
          })
      : Promise.resolve();

    envoi.then(function(){
      // La conversion est envoyée sur merci.html (une seule fois, même si la page est rechargée)
      stocker('inscription', JSON.stringify({
        prenom: form.elements.prenom.value.trim(),
        date: select.value,
        dateLibelle: dateLibelle,
        situation: form.elements.situation.value
      }));
      window.location.href = 'merci.html';
    }).catch(function(){
      erreur.textContent = 'Une erreur est survenue, merci de réessayer dans un instant.';
      bouton.disabled = false;
    });
  });
}

/* ---------- Page merci : conversion + ajout à l'agenda ---------- */

var merciDate = document.getElementById('merciDate');

if(merciDate){
  var inscription = null;
  try { inscription = JSON.parse(lire('inscription')); } catch(e){}

  if(inscription){
    // Conversion principale : inscription à la réunion d'information
    track('inscription_reunion_info', {
      date_reunion: inscription.date,
      situation: inscription.situation
    });
    effacer('inscription');

    document.getElementById('merciPrenom').textContent = ', ' + inscription.prenom;
    merciDate.textContent = inscription.dateLibelle;
    document.getElementById('merciDetail').hidden = false;

    // Lien Google Agenda : dates au format AAAAMMJJTHHMMSS, heure de Paris
    var m = inscription.date.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
    if(m){
      var debut = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      var fin = new Date(debut.getTime() + REUNION.dureeMinutes * 60000);
      var format = function(d){
        var p = function(n){ return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + '00';
      };
      var agenda = document.getElementById('agenda');
      agenda.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
        + '&text=' + encodeURIComponent(REUNION.titre)
        + '&dates=' + format(debut) + '/' + format(fin)
        + '&ctz=Europe/Paris'
        + '&location=' + encodeURIComponent(REUNION.lieu);
      agenda.hidden = false;
    }
  }
}
