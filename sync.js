import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STORAGE_KEY = 'CH_GELADAS_DB_ENTERPRISE';

// ID fixo do sistema
const DOC_ID = "sistema";

// aguarda firebase carregar
function waitFirebase() {
  return new Promise(resolve => {
    const check = () => {
      if (window.firestoreDB) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

// BACKUP AUTOMÁTICO
async function backupFirestore() {

  await waitFirebase();

  const dbLocal = localStorage.getItem(STORAGE_KEY);

  if (!dbLocal) return;

  try {

    const parsedData = JSON.parse(dbLocal);

    await setDoc(
      doc(window.firestoreDB, "ch_geladas", DOC_ID),
      {
        data: parsedData,
        updated: new Date().toISOString(),
        timestamp: Date.now()
      },
      { merge: true }
    );

    console.log("✅ Backup automático OK - Dados salvos no Firebase");
    
    // Dispara evento customizado para feedback no UI
    window.dispatchEvent(new CustomEvent('firebaseSyncSuccess'));

  } catch (e) {

    console.error("❌ Erro backup Firebase:", e.message);
    window.dispatchEvent(new CustomEvent('firebaseSyncError', { detail: e.message }));

  }

}

// RESTORE AUTOMÁTICO
async function restoreFirestore() {

  await waitFirebase();

  try {

    const ref = doc(window.firestoreDB, "ch_geladas", DOC_ID);

    const snap = await getDoc(ref);

    if (snap.exists()) {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(snap.data().data)
      );

      console.log("🔥 Restore automático OK");

    }

  } catch (e) {

    console.error("Erro restore:", e);

  }

}


// intercepta qualquer save no localStorage

const originalSetItem = localStorage.setItem;

localStorage.setItem = function () {

  originalSetItem.apply(this, arguments);

  if (arguments[0] === STORAGE_KEY) {

    // Aguarda um pouco para garantir que o localStorage foi escrito
    setTimeout(() => {
      backupFirestore();
    }, 100);

  }

};


// restaura ao iniciar

restoreFirestore();

// Sincroniza a cada 30 segundos (backup contínuo)
setInterval(() => {
  const dbLocal = localStorage.getItem(STORAGE_KEY);
  if (dbLocal) {
    backupFirestore();
  }
}, 30000);