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

    await setDoc(
      doc(window.firestoreDB, "ch_geladas", DOC_ID),
      {
        data: JSON.parse(dbLocal),
        updated: new Date().toISOString()
      }
    );

    console.log("🔥 Backup automático OK");

  } catch (e) {

    console.error("Erro backup:", e);

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

    backupFirestore();

  }

};


// restaura ao iniciar

restoreFirestore();