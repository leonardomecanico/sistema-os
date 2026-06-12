/* ============================================================
   SISTEMA MARLIFT - CÓDIGO CORRIGIDO
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    initDB().then(() => {
        setupEventListeners();
        carregarClientesDropdown();
    });
});

// 1. EVENTOS (Onde a mágica da conexão acontece)
function setupEventListeners() {
    // Botão de abrir modal
    document.getElementById('btnAbrirGerenciador')?.addEventListener('click', abrirModalCliente);
    
    // Botão de fechar modal
    document.getElementById('btnFecharGerenciador')?.addEventListener('click', fecharModalCliente);
    
    // BOTÃO DE SALVAR (A conexão principal)
    const btnSalvar = document.getElementById('btnSalvarNovoCliente');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarNovoCliente);
        console.log("✅ Botão salvar vinculado com sucesso");
    } else {
        console.error("❌ ERRO: Botão 'btnSalvarNovoCliente' não encontrado no HTML!");
    }
}

// 2. MODAL
function abrirModalCliente() {
    const modal = document.getElementById('modalGerenciador');
    if (modal) modal.style.display = 'flex';
}

function fecharModalCliente() {
    const modal = document.getElementById('modalGerenciador');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('cadClienteForm');
    if (form) form.reset();
}

// 3. SALVAMENTO (Sem validações que travam o código)
async function salvarNovoCliente() {
    console.log("Botão clicado! Iniciando salvamento...");

    // Pega os dados dos campos
    const cliNome = document.getElementById('cadCliNome')?.value;
    const eqMarca = document.getElementById('cadEqMarca')?.value;
    const eqModelo = document.getElementById('cadEqModelo')?.value;

    if (!cliNome || !eqMarca || !eqModelo) {
        alert("⚠️ Por favor, preencha Nome, Marca e Modelo.");
        return;
    }

    const novoCliente = {
        cliNome: cliNome,
        cliCnpj: document.getElementById('cadCliCnpj')?.value,
        cliEndereco: document.getElementById('cadCliEndereco')?.value,
        cliContato: document.getElementById('cadCliContato')?.value,
        cliTelefone: document.getElementById('cadCliTelefone')?.value,
        cliEmail: document.getElementById('cadCliEmail')?.value,
        dataCadastro: new Date().toISOString()
    };

    try {
        const tx = db.transaction(['clientes', 'equipamentos'], 'readwrite');
        
        // Salva Cliente
        const storeCli = tx.objectStore('clientes');
        const reqCli = storeCli.add(novoCliente);

        reqCli.onsuccess = () => {
            const clienteId = reqCli.result;
            // Salva Equipamento
            const storeEq = tx.objectStore('equipamentos');
            storeEq.add({
                clienteId: clienteId,
                eqMarca: eqMarca,
                eqModelo: eqModelo,
                eqCombustivel: document.getElementById('cadEqCombustivel')?.value,
                eqSerie: document.getElementById('cadEqSerie')?.value,
                dataCadastro: new Date().toISOString()
            });
        };

        tx.oncomplete = () => {
            alert("✅ Sucesso!");
            fecharModalCliente();
            carregarClientesDropdown();
        };

    } catch (error) {
        console.error(error);
        alert("Erro ao salvar no banco.");
    }
}

// Inicialização básica do DB (para garantir que não pare)
async function initDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open('MarliftDB', 2);
        request.onsuccess = (e) => { db = e.target.result; resolve(); };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if(!db.objectStoreNames.contains('clientes')) db.createObjectStore('clientes', {keyPath: 'id', autoIncrement: true});
            if(!db.objectStoreNames.contains('equipamentos')) db.createObjectStore('equipamentos', {keyPath: 'id', autoIncrement: true});
        };
    });
}
