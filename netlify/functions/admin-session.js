// Vérifie si la requête porte une session admin valide (cookie signé).
// Utilisé au chargement du dashboard pour décider d'afficher l'écran de login ou le tableau de bord.

const { requireSession } = require("./lib/session");

exports.handler = async (event) => {
  const session = requireSession(event);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ authenticated: Boolean(session) }),
  };
};
