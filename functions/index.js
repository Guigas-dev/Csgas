// As Cloud Functions for Firebase
const functions = require("firebase-functions");

// Carrega o servidor Next.js da pasta 'app_next' que conterá a saída de 'output: standalone'
// O nome 'app_next' é arbitrário, mas deve corresponder ao que o script de build copia.
const nextServer = require("./app_next/server.js");
const nextHandle = nextServer.getRequestHandler();

exports.nextServer = functions
  .region("us-central1") // Região consistente com firebase.json e limites do plano gratuito
  .runWith({ memory: "512MB", timeoutSeconds: 60 }) // Ajuste memória e timeout
  .https.onRequest(async (req, res) => {
    // O prepare() não é necessário para output standalone, pois o server.js já está pronto.
    // Apenas encaminhe a requisição.
    return nextHandle(req, res);
  });
