/* =============================================================
   MARLIFT EMPILHADEIRAS - SISTEMA DE O.S MOBILE COMPLETO
   ============================================================= */

const DB_NAME = 'MarliftDB';
const DB_VERSION = 2;
const STORES = { clientes: 'clientes', equipamentos: 'equipamentos', ordens: 'ordens', empresa: 'empresa' };
let db = null;

// Fila de equipamentos em memória para quando for cadastrar um cliente novo
let equipamentosParaNovoCliente = [];

// ============================================================
// FUNÇÃO AUXILIAR DE BUSCA E VÍNCULO MULTI-ID (ANTI-ERRO)
// ============================================================
function vincularEventoMúltiplosIDs(listaIDs, evento, funcao) {
    listaIDs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener(evento, funcao);
        }
    });
}

function obterValorCamposMúltiplosIDs(listaIDs) {
    for (let id of listaIDs) {
        const elemento = document.getElementById(id);
        if (elemento && elemento.value) {
            return elemento.value.trim();
        }
    }
    return '';
}

function limparCamposMúltiplosIDs(listaIDs) {
    listaIDs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = '';
    });
}

// ============================================================
// 1. INICIALIZAÇÃO E BANCO DE DADOS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        setupNavTabs();
        setupEventListeners();
        await carregarClientesDropdown();
        
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
// 2. NAVEGAÇÃO ENTRE ABAS
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
// 3. CALENDÁRIO E HISTÓRICO
// ============================================================

function renderCalendario() {
    const container = document.getElementById('calendarioContainer') || document.querySelector('#tab-calendario');
    if (!container) return;
    
    const hoje = new Date().toLocaleDateString('pt-BR');
    container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #555;">
            <h3 style="color: #ff6600;">📅 Agenda - ${hoje}</h3>
            <p>Nenhum chamado agendado para hoje.</p>
            <button onclick="switchTab('tab-os')" style="padding: 10px 20px; background: #ff6600; color: white; border: none; border-radius: 5px; margin-top: 10px; font-weight: bold; cursor: pointer;">Nova O.S</button>
        </div>
    `;
}

async function renderHistorico() {
    const container = document.getElementById('historicoContainer') || document.querySelector('#tab-historico');
    if (!container) return;
    
    try {
        const transaction = db.transaction([STORES.ordens], 'readonly');
        const store = transaction.objectStore(STORES.ordens);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const ordens = request.result || [];
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
        };
    } catch (e) {
        console.log("Erro ao carregar histórico", e);
    }
}

// ============================================================
// 4. MAPEAMENTO DE EVENTOS DA TELA PRINCIPAL E MODAIS
// ============================================================

function setupEventListeners() {
    // Dropdowns de Seleção Principal
    const buscaCliente = document.getElementById('buscaCliente');
    if (buscaCliente) buscaCliente.addEventListener('change', preencherClienteSelecionado);
    
    const selectEquipamento = document.getElementById('selectEquipamento');
    if (selectEquipamento) selectEquipamento.addEventListener('change', preencherEquipamentoSelecionado);
    
    // Botões de Equipamento da tela principal
    vincularEventoMúltiplosIDs(['btnAdicionarEquipamento', 'btnDadosEquipamento'], 'click', cadastrarNovoEquipamentoMain);

    // Botões de Gerenciamento do Modal de Cliente (Abre / Fecha / Salva)
    vincularEventoMúltiplosIDs(['btnAbrirGerenciador', 'btnNovoCliente', 'btnAdicionarCliente'], 'click', abrirModalCliente);
    vincularEventoMúltiplosIDs(['btnFecharGerenciador', 'btnFecharModal', 'btnCancelarCliente'], 'click', fecharModalCliente);
    vincularEventoMúltiplosIDs(['btnSalvarNovoCliente', 'btnSalvarCliente', 'btnCadastrarCliente'], 'click', salvarNovoCliente);

    // Ações de Botões Gerais
    document.getElementById('btnGps')?.addEventListener('click', gerarRotaGPS);
    document.getElementById('btnGerarPdf')?.addEventListener('click', gerarPDF);
    document.getElementById('btnSalvarOS')?.addEventListener('click', salvarOS);
}

// ============================================================
// 5. MODAL DE NOVO CLIENTE COM MÚLTIPLOS EQUIPAMENTOS
// ============================================================

function abrirModalCliente() {
    equipamentosParaNovoCliente = []; // Zera a lista da memória ao abrir
    
    // Procura e abre o modal pelo ID correto
    const modal = document.getElementById('modalGerenciador') || document.getElementById('modalCliente');
    if (modal) modal.style.display = 'flex';

    // Injeta o botão dinâmico de adicionar mais equipamentos para não quebrar o HTML existente
    const campoMarca = document.getElementById('cadEqMarca') || document.getElementById('eqMarca') || document.querySelector('#modalGerenciador input');
    const areaFormulario = campoMarca?.parentElement || document.getElementById('cadClienteForm') || document.querySelector('#modalGerenciador form');
    
    if (areaFormulario && !document.getElementById('btnInjetadoMaisEquip')) {
        const btnMaisEquip = document.createElement('button');
        btnMaisEquip.id = 'btnInjetadoMaisEquip';
        btnMaisEquip.type = 'button';
        btnMaisEquip.innerText = '➕ Salvar esta máquina e adicionar outra';
        btnMaisEquip.style.cssText = 'background-color: #ff6600; color: white; border: none; padding: 12px; border-radius: 4px; margin-top: 15px; width: 100%; cursor: pointer; font-weight: bold; font-size: 14px;';
        btnMaisEquip.onclick = guardarEquipamentoNaFila;
        
        const txtContador = document.createElement('div');
        txtContador.id = 'txtContadorEquip';
        txtContador.style.cssText = 'font-size: 13px; color: #333; text-align: center; margin-top: 8px; font-weight: bold;';

        areaFormulario.appendChild(btnMaisEquip);
        areaFormulario.appendChild(txtContador);
    }
    
    atualizarContadorModal();
}

function fecharModalCliente() {
    const modal = document.getElementById('modalGerenciador') || document.getElementById('modalCliente');
    if (modal
