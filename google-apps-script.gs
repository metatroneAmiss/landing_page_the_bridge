/**
 * Réception des inscriptions de la landing page dans un Google Sheet
 * + envoi d'un e-mail de confirmation à la personne inscrite.

 * Installation :
 * 1. Créer un Google Sheet, puis Extensions > Apps Script.
 * 2. Remplacer le contenu de Code.gs par ce fichier, puis enregistrer.
 * 3. Déployer > Nouveau déploiement > type « Application Web » :
 *      - Exécuter en tant que : Moi
 *      - Qui a accès : Tout le monde
 *    Autoriser l'accès quand Google le demande.
 * 4. Copier l'URL de l'application Web (https://script.google.com/macros/s/.../exec)
 *    et la coller dans FORM_ENDPOINT en haut de script.js.
 *
 * Après toute modification de ce script : Déployer > Gérer les déploiements >
 * modifier (crayon) > Version : « Nouvelle version », sinon l'ancien code reste actif.
 * L'envoi d'e-mails demande une nouvelle autorisation la première fois : lancer une fois
 * la fonction testerEmail depuis l'éditeur pour la donner.
 */

var NOM_ONGLET = 'Inscriptions';

// E-mail de confirmation : à adapter avec l'école
var EMAIL = {
  actif: true,
  nomExpediteur: 'The BRIDGE École-Entreprises',
  repondreA: '', // adresse de l'équipe admission si elle doit recevoir les réponses (sinon laisser vide)
  lieu: "En ligne – le lien de connexion vous sera communiqué par l'école avant la réunion",
  duree: 'environ 1 h'
};

// Colonnes du tableau : clé du champ du formulaire -> titre de la colonne
// (les nouvelles colonnes sont ajoutées automatiquement à droite si l'onglet existe déjà)
var COLONNES = [
  ['date_envoi',   'Date d\'envoi'],
  ['prenom',       'Prénom'],
  ['nom',          'Nom'],
  ['email',        'E-mail'],
  ['tel',          'Téléphone'],
  ['situation',    'Situation'],
  ['date',         'Date de réunion'],
  ['rgpd',         'Consentement RGPD'],
  ['utm_source',   'utm_source'],
  ['utm_medium',   'utm_medium'],
  ['utm_campaign', 'utm_campaign'],
  ['utm_content',  'utm_content'],
  ['utm_term',     'utm_term'],
  ['page',         'Page'],
  ['gclid',        'gclid'],
  ['date_libelle', 'Réunion (libellé)'],
  ['email_envoye', 'E-mail de confirmation']
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // évite que deux envois simultanés écrivent sur la même ligne
  try {
    var p = e.parameter;
    var onglet = getOnglet_();
    var emailEnvoye = envoyerConfirmation_(p);
    var ligne = COLONNES.map(function (c) {
      if (c[0] === 'date_envoi') { return new Date(); }
      if (c[0] === 'rgpd') { return p.rgpd ? 'Oui' : 'Non'; }
      if (c[0] === 'email_envoye') { return emailEnvoye; }
      return nettoyer_(p[c[0]]);
    });
    onglet.appendRow(ligne);
    return json_({ result: 'success' });
  } catch (err) {
    return json_({ result: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Envoie l'e-mail de confirmation ; une erreur d'envoi ne bloque pas l'enregistrement du lead
function envoyerConfirmation_(p) {
  if (!EMAIL.actif) { return 'Désactivé'; }
  var email = String(p.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { return 'Adresse invalide'; }
  try {
    var prenom = echapper_(String(p.prenom || '').trim());
    var date = echapper_(String(p.date_libelle || p.date || '').trim());
    var html =
      '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;max-width:560px">' +
      '<div style="background:#0b0b0b;color:#fff;padding:20px 24px;font-weight:bold;font-size:18px">THE BRIDGE <span style="font-weight:normal;opacity:.75">École-Entreprises</span></div>' +
      '<div style="padding:24px;border:1px solid #e3e3e8;border-top:0">' +
      '<p>Bonjour ' + prenom + ',</p>' +
      '<p>Votre inscription à la <b>réunion d\'information Bootcamp Traffic Manager</b> est bien confirmée.</p>' +
      '<p style="background:#ffe500;padding:14px 18px;border-radius:8px">' +
      '<b>Date :</b> ' + date + '<br><b>Durée :</b> ' + EMAIL.duree + '<br><b>Lieu :</b> ' + echapper_(EMAIL.lieu) + '</p>' +
      '<p>Au programme : le métier de Traffic Manager, le contenu du bootcamp de 3 mois, le financement, la poursuite en alternance et les étapes d\'admission. Venez avec vos questions !</p>' +
      '<p>Un empêchement ? Répondez simplement à cet e-mail pour changer de date.</p>' +
      '<p>À très bientôt,<br>L\'équipe The BRIDGE École-Entreprises</p>' +
      '</div></div>';
    var options = { name: EMAIL.nomExpediteur, htmlBody: html };
    if (EMAIL.repondreA) { options.replyTo = EMAIL.repondreA; }
    MailApp.sendEmail(email, 'Votre réunion d\'information Bootcamp Traffic Manager est confirmée',
      'Bonjour ' + p.prenom + ', votre inscription à la réunion d\'information du ' + (p.date_libelle || p.date) +
      ' est confirmée. Lieu : ' + EMAIL.lieu + '.', options);
    return 'Oui';
  } catch (err) {
    return 'Erreur : ' + String(err).slice(0, 200);
  }
}

// À lancer une fois depuis l'éditeur (bouton Exécuter) pour autoriser l'envoi d'e-mails :
// envoie un e-mail de test à votre propre adresse (ou à celle indiquée ici).
var EMAIL_TEST = '';

function testerEmail() {
  var destinataire = EMAIL_TEST || Session.getEffectiveUser().getEmail();
  Logger.log('Envoi du test à : ' + destinataire);
  Logger.log('Résultat : ' + envoyerConfirmation_({ email: destinataire, prenom: 'Test', date_libelle: 'Mercredi 14 oct. – 16h30' }));
  Logger.log('E-mails restants aujourd\'hui : ' + MailApp.getRemainingDailyQuota());
}

// Crée l'onglet et la ligne de titres au premier envoi, et ajoute les colonnes manquantes
function getOnglet_() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var onglet = classeur.getSheetByName(NOM_ONGLET) || classeur.insertSheet(NOM_ONGLET);
  var titres = COLONNES.map(function (c) { return c[1]; });
  if (onglet.getLastRow() === 0) {
    onglet.appendRow(titres);
    onglet.setFrozenRows(1);
  } else if (onglet.getLastColumn() < titres.length) {
    onglet.getRange(1, 1, 1, titres.length).setValues([titres]);
  }
  onglet.getRange(1, 1, 1, titres.length).setFontWeight('bold');
  return onglet;
}

// Empêche qu'une valeur soit interprétée comme une formule (ex. « +33 6… » ou « =… »)
function nettoyer_(valeur) {
  var v = String(valeur || '').trim().slice(0, 500);
  return /^[=+\-@]/.test(v) ? '\'' + v : v;
}

// Empêche l'injection de HTML dans l'e-mail
function echapper_(texte) {
  return String(texte).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function json_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}
