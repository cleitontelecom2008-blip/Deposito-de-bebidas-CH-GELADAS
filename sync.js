import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STORAGE_KEY = 'CH_GELADAS_DB_ENTERPRISE';
const DOC_ID = "sistema";

// ─── Evita reload infinito após restore ───────────────────────────────────────
const RESTORE_FLAG = '__ch_restored__';

// ─── Aguarda o Firebase inicializar (máx. 8 segundos) ────────────────────────
function waitFirebase(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (window.firestoreDB) return resolve();
    const start = Date.now();
    const check = () => {
      if (window.firestoreDB) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('Firebase timeout'));
      setTimeout(check, 100);
    };
    check();
  });
}

// ─── BACKUP (com debounce de 2s) ─────────────────────────────────────────────
// Nunca dispara mais de 1 vez a cada 2 segundos, mesmo que save() seja
// chamado 10 vezes seguidas num clique de venda.
let _backupTimer = null;

async function backupFirestore() {
  clearTimeout(_backupTimer);
  _backupTimer = setTimeout(async () => {
    const dbLocal = localStorage.getItem(STORAGE_KEY);
    if (!dbLocal) return;

    try {
      await waitFirebase();
      await setDoc(
        doc(window.firestoreDB, "ch_geladas", DOC_ID),
        {
          data: JSON.parse(dbLocal),
          updated: new Date().toISOString()
        }
      );
      console.log("🔥 Backup OK →", new Date().toLocaleTimeString());
    } catch (e) {
      console.warn("⚠️ Backup falhou (sem conexão?):", e.message);
      // Não trava a UI — falha silenciosa é intencional
    }
  }, 2000); // espera 2s de inatividade antes de gravar
}

// ─── RESTORE (só na primeira carga, sem reload infinito) ──────────────────────
async function restoreFirestore() {
  // Se já fizemos restore nesta sessão, não faz de novo
  if (sessionStorage.getItem(RESTORE_FLAG)) {
    console.log("🔥 Restore já feito nesta sessão — ignorado");
    return;
  }

  try {
    await waitFirebase();

    const ref = doc(window.firestoreDB, "ch_geladas", DOC_ID);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.log("🔥 Nenhum backup no Firestore ainda");
      sessionStorage.setItem(RESTORE_FLAG, '1');
      return;
    }

    const firestoreData = snap.data().data;
    const localRaw = localStorage.getItem(STORAGE_KEY);

    // Compara timestamps para decidir qual versão é mais recente
    let localData = null;
    try { localData = localRaw ? JSON.parse(localRaw) : null; } catch(_) {}

    const firestoreUpdated = snap.data().updated || '0';
    const localVendas = localData?.vendas?.length ?? 0;
    const firestoreVendas = firestoreData?.vendas?.length ?? 0;

    // Usa Firestore se: não há dados locais OU Firestore tem mais vendas
    const deveRestaurar = !localData || firestoreVendas > localVendas;

    if (deveRestaurar) {
      console.log(`🔥 Restaurando do Firestore (${firestoreVendas} vendas vs ${localVendas} local)`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(firestoreData));
      sessionStorage.setItem(RESTORE_FLAG, '1');

      // Recarrega a página para que o init() do app leia os dados corretos
      // sem o flag de restore, isso criaria loop infinito
      location.reload();
    } else {
      console.log(`🔥 Dados locais já são mais recentes — Firestore ignorado`);
      sessionStorage.setItem(RESTORE_FLAG, '1');
    }

  } catch (e) {
    console.warn("⚠️ Restore falhou (sem conexão?):", e.message);
    sessionStorage.setItem(RESTORE_FLAG, '1'); // não tenta de novo
  }
}

// ─── Intercepta localStorage.setItem para backup automático ──────────────────
// O debounce no backupFirestore() garante que múltiplos saves rápidos
// (ex: renderCarrinho + save + updateStats) disparam apenas 1 gravação.
const _originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  _originalSetItem(key, value);
  if (key === STORAGE_KEY) {
    backupFirestore(); // não-bloqueante, com debounce
  }
};

// ─── Inicia restore ao carregar ───────────────────────────────────────────────
restoreFirestore();
