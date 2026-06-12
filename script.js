let db;

// 1. INICIALIZAÇÃO DO BANCO COM RELACIONAMENTO
const request = indexedDB.open("MarliftDB", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains('clientes')) db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
    if (!db.objectStoreNames.contains('equipamentos')) {
        const store = db.createObjectStore('equipamentos', { keyPath: 'id', autoIncrement: true });
        store.createIndex('clienteId', 'clienteId', { unique: false });
    }
};
request.onsuccess = (e) => { db = e.target.result; carregarListaClientes(); };

// 2. BUSCAR EQUIPAMENTOS AO SELECIONAR CLIENTE
document.getElementById('buscaCliente').addEventListener('change', (e) => {
    const cliId = e.target.value;
    if (cliId) carregarEquipamentos(cliId);
});

async function carregarEquipamentos(clienteId) {
    const tx = db.transaction('equipamentos', 'readonly');
    const index = tx.objectStore('equipamentos').index('clienteId');
    const request = index.getAll(parseInt(clienteId));

    request.onsuccess = () => {
        const select = document.getElementById('selectEquipamento');
        select.innerHTML = '<option value="">-- Selecione um Equipamento --</option>';
        request.result.forEach(eq => {
            const opt = document.createElement('option');
            opt.value = eq.id;
            opt.textContent = `${eq.marca} - ${eq.modelo} (Série: ${eq.serie})`;
            select.appendChild(opt);
        });
    };
}

// 3. SALVAR EQUIPAMENTO NOVO VINCULADO AO CLIENTE
async function salvarEquipamento() {
    const clienteId = document.getElementById('buscaCliente').value;
    if (!clienteId) return alert("Selecione um cliente primeiro!");

    const novoEquip = {
        clienteId: parseInt(clienteId),
        marca: document.getElementById('cadEqMarca').value,
        modelo: document.getElementById('cadEqModelo').value,
        serie: document.getElementById('cadEqSerie').value
    };

    const tx = db.transaction('equipamentos', 'readwrite');
    tx.objectStore('equipamentos').add(novoEquip);
    tx.oncomplete = () => {
        alert("Equipamento salvo!");
        carregarEquipamentos(clienteId);
    };
}

// 4. TRAVA DO PDF
// Adicione isto ao seu form de OS
document.getElementById('osForm').addEventListener('change', () => {
    const btnPdf = document.getElementById('btnGerarPdf');
    const cliente = document.getElementById('buscaCliente').value;
    const equip = document.getElementById('selectEquipamento').value;
    
    // Supondo que você tenha uma variável booleana 'assinaturaSalva'
    if (cliente && equip && assinaturaSalva) {
        btnPdf.disabled = false;
    }
});

// FUNÇÃO PARA CARREGAR CLIENTES NO SELECT INICIAL
async function carregarListaClientes() {
    const tx = db.transaction('clientes', 'readonly');
    const request = tx.objectStore('clientes').getAll();
    request.onsuccess = () => {
        const select = document.getElementById('buscaCliente');
        request.result.forEach(cli => {
            const opt = document.createElement('option');
            opt.value = cli.id;
            opt.textContent = cli.cliNome;
            select.appendChild(opt);
        });
    };
}
