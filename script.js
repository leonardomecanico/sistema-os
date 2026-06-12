/* =============================================================
   MARLIFT EMPILHADEIRAS - SISTEMA DE O.S MOBILE COMPLETO
   ============================================================= */

const DB_NAME = 'MarliftDB';
const DB_VERSION = 2;
const STORES = { clientes: 'clientes', equipamentos: 'equipamentos', ordens: 'ordens', empresa: 'empresa' };
let db = null;

// ============================================================
// 1. INICIALIZAÇÃO E BANCO DE DADOS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        setupNavTabs();
        setupEventListeners();
        await carregarClientesDropdown();
        
        // Inicia na aba principal ou renderiza as outras em background
        renderCalendario();
        renderHistorico();
        console.log('✅ Sistema Marlift iniciado com sucesso');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        alert('Erro ao carregar o aplicativo. Tente recarregar a página.');
    }
});

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(db); };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORES.clientes)) {
                database.createObjectStore(STORES.clientes, { keyPath: 'id', autoIncrement: true });
            }
            if (!database.objectStoreNames.contains(STORES.equipamentos)) {
                const eqStore = database.createObjectStore(STORES.equipamentos, { keyPath: 'id', autoIncrement: true });
                eqStore.createIndex('clienteId', 'clienteId', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORES.ordens)) {
                database.createObjectStore(STORES.ordens, { keyPath: 'id', autoIncrement: true });
            }
            if (!database.objectStoreNames.contains(STORES.empresa)) {
                database.createObjectStore(STORES.empresa, { keyPath: 'id' });
            }
        };
    });
}

// ============================================================
// 2. NAVEGAÇÃO
// ============================================================

function setupNavTabs() {
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(nav => nav.classList.remove('active'));
            
            const selectedTab = document.getElementById(tabId);
            if (selectedTab) selectedTab.classList.add('active');
            btn.classList.add('active');
            
            if (tabId === 'tab-calendario') renderCalendario();
            if (tabId === 'tab-historico') renderHistorico();
        });
    });
}

// ============================================================
// 3. CALENDÁRIO E HISTÓRICO (FUNÇÕES QUE HAVIAM SUMIDO)
// ============================================================

function renderCalendario() {
    const container = document.getElementById('calendarioContainer') || document.querySelector('#tab-calendario');
    if (!container) return; // Evita erro se o HTML não tiver a aba
    
    // Um calendário simples e funcional para o dia atual
    const hoje = new Date().toLocaleDateString('pt-BR');
    container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #555;">
            <h3 style="color: #ff6600;">📅 Agenda - ${hoje}</h3>
            <p>Nenhum chamado agendado para hoje.</p>
            <button onclick="switchTab('tab-os')" style="padding: 10px 20px; background: #ff6600; color: white; border: none; border-radius: 5px; margin-top: 10px; font-weight: bold;">Nova O.S</button>
        </div>
    `;
}

async function renderHistorico() {
    const container = document.getElementById('historicoContainer') || document.querySelector('#tab-historico');
    if (!container) return;
    
    try {
        const ordens = await obterTodasOS();
        if (ordens.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center;">Nenhuma O.S finalizada ainda.</div>';
            return;
        }
        
        let html = '<div style="padding: 10px;">';
        ordens.reverse().forEach(os => {
            html += `
                <div style="border: 1px solid #ddd; border-left: 4px solid #ff6600; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: #fff;">
                    <strong>${os.cliNome || 'Cliente não informado'}</strong><br>
                    <small>${os.eqMarca} ${os.eqModelo} - Data: ${new Date(os.data).toLocaleDateString('pt-BR')}</small>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (e) {
        console.log("Erro ao carregar histórico", e);
    }
}

function obterTodasOS() {
    return new Promise((resolve) => {
        const transaction = db.transaction([STORES.ordens], 'readonly');
        const store = transaction.objectStore(STORES.ordens);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
}

// ============================================================
// 4. CLIENTES E EQUIPAMENTOS (AJUSTE DO BOTÃO)
// ============================================================

function setupEventListeners() {
    // Clientes
    const buscaCliente = document.getElementById('buscaCliente');
    if (buscaCliente) buscaCliente.addEventListener('change', preencherClienteSelecionado);
    
    // Equipamentos
    const selectEquipamento = document.getElementById('selectEquipamento');
    if (selectEquipamento) selectEquipamento.addEventListener('change', preencherEquipamentoSelecionado);
    
    // Botão Adicionar/Dados do Equipamento (cobre múltiplas IDs do seu HTML)
    const btnEquip1 = document.getElementById('btnAdicionarEquipamento');
    const btnEquip2 = document.getElementById('btnDadosEquipamento');
    
    const acaoBotaoEquipamento = () => {
        // Apenas foca na aba da O.S e permite digitar um novo equipamento sem travar a tela
        const camposEquipamento = ['eqMarca', 'eqModelo', 'eqSerie', 'eqCombustivel'];
        camposEquipamento.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = '';
        });
        if (selectEquipamento) selectEquipamento.value = '';
        alert("Campos de equipamento liberados para digitação manual.");
    };

    if (btnEquip1) btnEquip1.addEventListener('click', acaoBotaoEquipamento);
    if (btnEquip2) btnEquip2.addEventListener('click', acaoBotaoEquipamento);

    // Botões de Ação
    document.getElementById('btnGps')?.addEventListener('click', gerarRotaGPS);
    document.getElementById('btnGerarPdf')?.addEventListener('click', gerarPDF);
    document.getElementById('btnSalvarOS')?.addEventListener('click', salvarOS);
}

// ... [O restante das funções de banco de dados permanecem iguais à versão anterior] ...

async function carregarClientesDropdown() {
    const select = document.getElementById('buscaCliente');
    if (!select) return;
    
    const transaction = db.transaction([STORES.clientes], 'readonly');
    const request = transaction.objectStore(STORES.clientes).getAll();
    
    request.onsuccess = () => {
        const clientes = request.result || [];
        while (select.options.length > 1) select.remove(1);
        clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.cliNome;
            select.appendChild(opt);
        });
    };
}

async function preencherClienteSelecionado(event) {
    const clienteId = parseInt(event.target.value);
    if (isNaN(clienteId)) return;
    
    const request = db.transaction([STORES.clientes]).objectStore(STORES.clientes).get(clienteId);
    request.onsuccess = () => {
        const cliente = request.result;
        if (!cliente) return;
        
        ['cliNome', 'cliCnpj', 'cliEndereco', 'cliContato', 'cliTelefone', 'cliEmail'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = cliente[id] || '';
        });
        
        carregarEquipamentosDropdown(clienteId);
    };
}

async function carregarEquipamentosDropdown(clienteId) {
    const select = document.getElementById('selectEquipamento');
    if (!select) return;
    
    const transaction = db.transaction([STORES.equipamentos], 'readonly');
    const index = transaction.objectStore(STORES.equipamentos).index('clienteId');
    const request = index.getAll(clienteId);
    
    request.onsuccess = () => {
        const equipamentos = request.result || [];
        while (select.options.length > 1) select.remove(1);
        equipamentos.forEach(eq => {
            const opt = document.createElement('option');
            opt.value = eq.id;
            opt.textContent = `${eq.eqMarca} ${eq.eqModelo}`;
            select.appendChild(opt);
        });
    };
}

async function preencherEquipamentoSelecionado(event) {
    const eqId = parseInt(event.target.value);
    if (isNaN(eqId)) return;
    
    const request = db.transaction([STORES.equipamentos]).objectStore(STORES.equipamentos).get(eqId);
    request.onsuccess = () => {
        const eq = request.result;
        if (!eq) return;
        
        document.getElementById('eqMarca').value = eq.eqMarca || '';
        document.getElementById('eqModelo').value = eq.eqModelo || '';
        document.getElementById('eqSerie').value = eq.eqSerie || '';
        document.getElementById('eqCombustivel').value = eq.eqCombustivel || '';
    };
}

function gerarRotaGPS() {
    const endereco = document.getElementById('cliEndereco')?.value.trim();
    if (endereco) window.open(`http://maps.google.com/maps?q=${encodeURIComponent(endereco)}`, '_blank');
}

// ============================================================
// 5. GERAÇÃO DO PDF (COM OS DADOS DA MARLIFT POR PADRÃO)
// ============================================================

async function obterDadosEmpresa() {
    // Retorna os dados da Marlift como padrão para preencher automaticamente o cabeçalho
    return {
        nome: "Marlift Empilhadeiras",
        cnpj: "65.707.636/0001-13",
