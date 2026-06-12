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
// 1. INICIALIZAÇÃO E BANCO DE DADOS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        setupNavTabs();
        setupEventListeners();
        await carregarClientesDropdown();
        
        // Renderiza as telas iniciais
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
// 4. EVENTOS GERAIS E CADASTROS
// ============================================================

function setupEventListeners() {
    // Menu de busca da tela principal
    const buscaCliente = document.getElementById('buscaCliente');
    if (buscaCliente) buscaCliente.addEventListener('change', preencherClienteSelecionado);
    
    const selectEquipamento = document.getElementById('selectEquipamento');
    if (selectEquipamento) selectEquipamento.addEventListener('change', preencherEquipamentoSelecionado);
    
    // Botões de Equipamento da tela principal (Adicionar/Dados)
    const btnEquip1 = document.getElementById('btnAdicionarEquipamento');
    const btnEquip2 = document.getElementById('btnDadosEquipamento');
    if (btnEquip1) btnEquip1.addEventListener('click', cadastrarNovoEquipamentoMain);
    if (btnEquip2) btnEquip2.addEventListener('click', cadastrarNovoEquipamentoMain);

    // Botões do Modal de Cliente
    const btnAbrirGerenciador = document.getElementById('btnAbrirGerenciador');
    const btnFecharGerenciador = document.getElementById('btnFecharGerenciador');
    const btnSalvarNovoCliente = document.getElementById('btnSalvarNovoCliente');
    
    if (btnAbrirGerenciador) btnAbrirGerenciador.addEventListener('click', abrirModalCliente);
    if (btnFecharGerenciador) btnFecharGerenciador.addEventListener('click', fecharModalCliente);
    if (btnSalvarNovoCliente) btnSalvarNovoCliente.addEventListener('click', salvarNovoCliente);

    // Ações Gerais
    document.getElementById('btnGps')?.addEventListener('click', gerarRotaGPS);
    document.getElementById('btnGerarPdf')?.addEventListener('click', gerarPDF);
    document.getElementById('btnSalvarOS')?.addEventListener('click', salvarOS);
}

// ============================================================
// 5. MODAL DE NOVO CLIENTE COM MÚLTIPLOS EQUIPAMENTOS
// ============================================================

function abrirModalCliente() {
    equipamentosParaNovoCliente = []; // Zera a lista sempre que abrir o modal
    const modal = document.getElementById('modalGerenciador');
    if (modal) modal.style.display = 'flex';

    // Criação automática do botão de adicionar mais equipamentos (Sem precisar mexer no HTML)
    const areaEquipamento = document.getElementById('cadEqMarca')?.parentElement;
    if (areaEquipamento && !document.getElementById('btnInjetadoMaisEquip')) {
        
        // Cria botão
        const btnMaisEquip = document.createElement('button');
        btnMaisEquip.id = 'btnInjetadoMaisEquip';
        btnMaisEquip.type = 'button';
        btnMaisEquip.innerText = '➕ Salvar esta máquina e adicionar outra';
        btnMaisEquip.style.cssText = 'background-color: #ff6600; color: white; border: none; padding: 10px; border-radius: 4px; margin-top: 15px; width: 100%; cursor: pointer; font-weight: bold;';
        btnMaisEquip.onclick = guardarEquipamentoNaFila;
        
        // Cria texto de contador
        const txtContador = document.createElement('div');
        txtContador.id = 'txtContadorEquip';
        txtContador.style.cssText = 'font-size: 13px; color: #2b2b2b; text-align: center; margin-top: 8px; font-weight: bold;';

        areaEquipamento.appendChild(btnMaisEquip);
        areaEquipamento.appendChild(txtContador);
    }
    
    atualizarContadorModal();
}

function fecharModalCliente() {
    const modal = document.getElementById('modalGerenciador');
    if (modal) modal.style.display = 'none';
    
    const form = document.getElementById('cadClienteForm');
    if (form) form.reset();
}

function guardarEquipamentoNaFila() {
    const marca = document.getElementById('cadEqMarca')?.value.trim();
    const modelo = document.getElementById('cadEqModelo')?.value.trim();
    const serie = document.getElementById('cadEqSerie')?.value.trim();
    const comb = document.getElementById('cadEqCombustivel')?.value.trim();

    if (!marca || !modelo) {
        alert('⚠️ Preencha pelo menos a Marca e o Modelo antes de adicionar à lista.');
        return;
    }

    // Salva na memória
    equipamentosParaNovoCliente.push({
        eqMarca: marca,
        eqModelo: modelo,
        eqSerie: serie || '---',
        eqCombustivel: comb || '---'
    });

    // Limpa a tela para ele digitar o próximo
    document.getElementById('cadEqMarca').value = '';
    document.getElementById('cadEqModelo').value = '';
    document.getElementById('cadEqSerie').value = '';
    document.getElementById('cadEqCombustivel').value = '';

    atualizarContadorModal();
    alert(`✅ Máquina ${marca} ${modelo} adicionada à lista! Você pode preencher os dados da próxima agora.`);
}

function atualizarContadorModal() {
    const contador = document.getElementById('txtContadorEquip');
    if (contador) {
        if (equipamentosParaNovoCliente.length > 0) {
            contador.innerText = `📦 ${equipamentosParaNovoCliente.length} equipamento(s) na fila aguardando salvamento.`;
        } else {
            contador.innerText = '';
        }
    }
}

async function salvarNovoCliente() {
    const cliNome = document.getElementById('cadCliNome')?.value.trim();
    if (!cliNome) {
        alert('⚠️ Preencha o nome/razão social do cliente.');
        return;
    }

    // Pega o que ficou digitado na tela mas o usuário não clicou no botão "➕"
    const marcaTela = document.getElementById('cadEqMarca')?.value.trim();
    const modeloTela = document.getElementById('cadEqModelo')?.value.trim();
    
    if (marcaTela && modeloTela) {
        equipamentosParaNovoCliente.push({
            eqMarca: marcaTela,
            eqModelo: modeloTela,
            eqSerie: document.getElementById('cadEqSerie')?.value.trim() || '---',
            eqCombustivel: document.getElementById('cadEqCombustivel')?.value.trim() || '---'
        });
    }

    if (equipamentosParaNovoCliente.length === 0) {
        alert('⚠️ Adicione pelo menos um equipamento (Marca e Modelo) para este cliente.');
        return;
    }

    // Monta o Cliente
    const novoCliente = {
        cliNome: cliNome,
        cliCnpj: document.getElementById('cadCliCnpj')?.value || '',
        cliEndereco: document.getElementById('cadCliEndereco')?.value || '',
        cliContato: document.getElementById('cadCliContato')?.value || '',
        cliTelefone: document.getElementById('cadCliTelefone')?.value || '',
        cliEmail: document.getElementById('cadCliEmail')?.value || '',
        dataCadastro: new Date().toISOString()
    };

    try {
        // 1. Salva Cliente
        const txCliente = db.transaction([STORES.clientes], 'readwrite');
        const storeCliente = txCliente.objectStore(STORES.clientes);
        const reqCliente = storeCliente.add(novoCliente);

        reqCliente.onsuccess = () => {
            const clienteId = reqCliente.result;

            // 2. Salva todos os equipamentos atrelados a ele
            const txEquip = db.transaction([STORES.equipamentos], 'readwrite');
            const storeEquip = txEquip.objectStore(STORES.equipamentos);
            
            equipamentosParaNovoCliente.forEach(eq => {
                eq.clienteId = clienteId;
                eq.dataCadastro = new Date().toISOString();
                storeEquip.add(eq);
            });

            txEquip.oncomplete = async () => {
                alert(`✅ Cliente e ${equipamentosParaNovoCliente.length} equipamento(s) salvos com sucesso!`);
                fecharModalCliente();
                await carregarClientesDropdown();
            };
        };
    } catch (error) {
        console.error(error);
        alert('Erro ao salvar no banco de dados.');
    }
}

// ============================================================
// 6. ADICIONAR EQUIPAMENTO PELA TELA PRINCIPAL
// ============================================================

async function cadastrarNovoEquipamentoMain() {
    const selectCliente = document.getElementById('buscaCliente');
    if (!selectCliente || !selectCliente.value) {
        alert('⚠️ Selecione um cliente no topo primeiro.');
        return;
    }
    
    const clienteId = parseInt(selectCliente.value);
    const eqMarca = document.getElementById('eqMarca')?.value.trim();
    const eqModelo = document.getElementById('eqModelo')?.value.trim();

    if (!eqMarca || !eqModelo) {
        alert('⚠️ Preencha a Marca e o Modelo para cadastrar nova máquina.');
        return;
    }

    const novoEquip = {
        clienteId: clienteId,
        eqMarca: eqMarca,
        eqModelo: eqModelo,
        eqSerie: document.getElementById('eqSerie')?.value.trim() || '---',
        eqCombustivel: document.getElementById('eqCombustivel')?.value.trim() || '---',
        dataCadastro: new Date().toISOString()
    };

    try {
        const tx = db.transaction([STORES.equipamentos], 'readwrite');
        tx.objectStore(STORES.equipamentos).add(novoEquip);
        tx.oncomplete = async () => {
            alert(`✅ Máquina (${eqMarca} ${eqModelo}) vinculada ao cliente atual!`);
            await carregarEquipamentosDropdown(clienteId);
        };
    } catch (error) {
        alert('Erro ao salvar equipamento.');
    }
}

// ============================================================
// 7. PREENCHIMENTO E FLUXO DE MENUS
// ============================================================

async function carregarClientesDropdown() {
    const select = document.getElementById('buscaCliente');
    if (!select) return;
    
    const tx = db.transaction([STORES.clientes], 'readonly');
    const req = tx.objectStore(STORES.clientes).getAll();
    
    req.onsuccess = () => {
        const clientes = req.result || [];
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
    
    const req = db.transaction([STORES.clientes]).objectStore(STORES.clientes).get(clienteId);
    req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        
        ['cliNome', 'cliCnpj', 'cliEndereco', 'cliContato', 'cliTelefone', 'cliEmail'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = c[id] || '';
        });
        
        ['eqMarca', 'eqModelo', 'eqSerie', 'eqCombustivel'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        carregarEquipamentosDropdown(clienteId);
    };
}

async function carregarEquipamentosDropdown(clienteId) {
    const select = document.getElementById('selectEquipamento');
    if (!select) return;
    
    const tx = db.transaction([STORES.equipamentos], 'readonly');
    const index = tx.objectStore(STORES.equipamentos).index('clienteId');
    const req = index.getAll(clienteId);
    
    req.onsuccess = () => {
        const equipamentos = req.result || [];
        while (select.options.length > 1) select.remove(1);
        equipamentos.forEach(eq => {
            const opt = document.createElement('option');
            opt.value = eq.id;
            opt.textContent = `${eq.eqMarca} ${eq.eqModelo} (Série: ${eq.eqSerie})`;
            select.appendChild(opt);
        });
    };
}

async function preencherEquipamentoSelecionado(event) {
    const eqId = parseInt(event.target.value);
    if (isNaN(eqId)) return;
    
    const req = db.transaction([STORES.equipamentos]).objectStore(STORES.equipamentos).get(eqId);
    req.onsuccess = () => {
        const eq = req.result;
        if (!eq) return;
        
        document.getElementById('eqMarca').value = eq.eqMarca || '';
        document.getElementById('eqModelo').value = eq.eqModelo || '';
        document.getElementById('eqSerie').value = eq.eqSerie || '';
        document.getElementById('eqCombustivel').value = eq.eqCombustivel || '';
    };
}

function gerarRotaGPS() {
    const endereco = document.getElementById('cliEndereco')?.value.trim();
    if (endereco) window.open(`http://googleusercontent.com/maps.google.com/4{encodeURIComponent(endereco)}`, '_blank');
}

// ============================================================
// 8. PDF E SALVAMENTO DE OS
// ============================================================

async function gerarPDF() {
    const cliNome = document.getElementById('cliNome')?.value || 'Cliente não informado';
    
    const htmlFinal = `
        <div style="text-align:center; border-bottom:3px solid #ff6600; padding-bottom:15px; margin-bottom:20px;">
            <h1 style="color:#ff6600; margin:0; font-size:28px;">MARLIFT</h1>
            <p style="margin:5px 0 0 0; font-size:11px; color:#666;">Ordem de Serviço Eletrônica</p>
            <p style="margin:5px 0; font-size:11px;"><b>Marlift Empilhadeiras</b><br>65.707.636/0001-13<br>Rua Maria Fernanda, 279, Santana de Parnaíba - SP</p>
        </div>
        
        <h3>DADOS DO CLIENTE</h3>
        <p><b>Razão Social:</b> ${cliNome}</p>
        <p><b>Endereço:</b> ${document.getElementById('cliEndereco')?.value || ''}</p>
        
        <h3>EQUIPAMENTO</h3>
        <p><b>Marca:</b> ${document.getElementById('eqMarca')?.value || ''}</p>
        <p><b>Modelo:</b> ${document.getElementById('eqModelo')?.value || ''}</p>
        <p><b>Série:</b> ${document.getElementById('eqSerie')?.value || ''}</p>
        
        <h3>SERVIÇOS EXECUTADOS</h3>
        <p>${document.getElementById('servicoExecutado')?.value || 'Nenhum serviço descrito'}</p>
    `;

    const janelaPDF = window.open('', '_blank', 'width=800,height=900');
    if (janelaPDF) {
        janelaPDF.document.write(`
            <html><head><title>OS - ${cliNome}</title>
            <style>body{font-family: Arial, sans-serif; padding: 20px;} h3{border-bottom: 2px solid #ff6600;}</style>
            </head><body>${htmlFinal}</body></html>
        `);
        janelaPDF.document.close();
        setTimeout(() => janelaPDF.print(), 500);
    } else {
        alert("O bloqueador de pop-ups impediu a geração do PDF.");
    }
}

async function salvarOS() {
    // Coleta dados vitais para o histórico
    const osData = {
        cliNome: document.getElementById('cliNome')?.value || 'Sem Nome',
        eqMarca: document.getElementById('eqMarca')?.value || '',
        eqModelo: document.getElementById('eqModelo')?.value || '',
        data: new Date().toISOString()
    };

    const tx = db.transaction([STORES.ordens], 'readwrite');
    tx.objectStore(STORES.ordens).add(osData);
    
    tx.oncomplete = () => {
        alert("✅ O.S salva com sucesso no histórico!");
        renderHistorico();
        switchTab('tab-historico'); // Joga o usuário para a aba histórico pra ele ver que salvou
    };
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(nav => nav.classList.remove('active'));
    
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) selectedTab.classList.add('active');
    
    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    if(btn) btn.classList.add('active');
}
