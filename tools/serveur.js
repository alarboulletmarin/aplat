/* Les deux serveurs dont l'outillage a besoin.
 *
 * `apercu()` sert le vrai build — c'est lui qu'il faut vérifier : politique de
 * sécurité, Service Worker, fichiers empreintés. Le moteur, lui, s'injecte
 * dans la page par `banc.js`, sans que l'application ait à l'exposer.
 *
 * Le port n'est jamais fixé : plusieurs vérifications tournent en parallèle et
 * se marchaient dessus. On lit celui que Vite annonce.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RACINE = path.resolve(__dirname, '..');
const VITE = path.join(RACINE, 'node_modules', '.bin', 'vite');

function demarrer(args, attente = 30000) {
  return new Promise((resoudre, rejeter) => {
    const enfant = spawn(VITE, args, { cwd: RACINE, stdio: ['ignore', 'pipe', 'pipe'] });
    let sortie = '';
    let fini = false;
    const minuterie = setTimeout(() => {
      if (fini) return;
      fini = true;
      enfant.kill();
      rejeter(new Error('serveur : pas d\'adresse en ' + attente + ' ms\n' + sortie));
    }, attente);

    const lire = (morceau) => {
      sortie += morceau;
      const trouve = sortie.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
      if (trouve && !fini) {
        fini = true;
        clearTimeout(minuterie);
        resoudre({
          url: 'http://127.0.0.1:' + trouve[1],
          arreter: () => { try { enfant.kill(); } catch (e) { /* déjà parti */ } }
        });
      }
    };
    enfant.stdout.on('data', lire);
    enfant.stderr.on('data', lire);
    enfant.on('error', rejeter);
  });
}

/** Le build de production, tel qu'il sera servi. Construit s'il manque. */
async function apercu() {
  if (!fs.existsSync(path.join(RACINE, 'dist', 'index.html'))) {
    throw new Error('dist/ absent : lance `npm run build` d\'abord.');
  }
  return demarrer(['preview', '--host', '127.0.0.1', '--port', '4173']);
}

/**
 * L'API que prennent les vérifications : `{ srv, port }`, comme un serveur
 * ordinaire. Toutes vérifient le build livré — c'est lui qui compte.
 */
async function ouvrir() {
  const serveur = await apercu();
  return {
    srv: { close: serveur.arreter },
    port: Number(new URL(serveur.url).port),
    url: serveur.url
  };
}

module.exports = { apercu, ouvrir, RACINE };
