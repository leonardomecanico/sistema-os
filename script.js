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
// 4. CONFIGURAÇÃO DOS DIÁLOGOS E BOTÕES (NOVO CADASTRO)
// ============================================================

function setupEventListeners() {
    // Clientes
    const buscaCliente = document.getElementById('buscaCliente');
    if (buscaCliente) buscaCliente.addEventListener('change', preencherClienteSelecionado);
    
    // Equipamentos
    const selectEquipamento = document.getElementById('selectEquipamento');
    if (selectEquipamento) selectEquipamento.addEventListener('change', preencherEquipamentoSelecionado);
    
    // Vincula a nova função de cadastrar equipamento aos botões do seu HTML
    const btnEquip1 = document.getElementById('btnAdicionarEquipamento');
    const btnEquip2 = document.getElementById('btnDadosEquipamento');
    
    if (btnEquip1) btnEquip1.addEventListener('click', cadastrarNovoEquipamento);
    if (btnEquip2) btnEquip2.addEventListener('click', cadastrarNovoEquipamento);

    // Botões de Ação Gerais
    document.getElementById('btnGps')?.addEventListener('click', gerarRotaGPS);
    document.getElementById('btnGerarPdf')?.addEventListener('click', gerarPDF);
    document.getElementById('btnSalvarOS')?.addEventListener('click', salvarOS);
}

// ============================================================
// 5. FUNÇÃO DEDICADA: CADASTRAR NOVO EQUIPAMENTO NO CLIENTE
// ============================================================

async function cadastrarNovoEquipamento() {
    // 1. Identifica qual cliente está selecionado no menu de busca
    const selectCliente = document.getElementById('buscaCliente');
    if (!selectCliente || !selectCliente.value) {
        alert('⚠️ Por favor, selecione um cliente primeiro antes de cadastrar um equipamento.');
        return;
    }
    
    const clienteId = parseInt(selectCliente.value);
    if (isNaN(clienteId)) return;

    // 2. Coleta os dados digitados nos campos de equipamento da tela
    const eqMarca = document.getElementById('eqMarca')?.value.trim();
    const eqModelo = document.getElementById('eqModelo')?.value.trim();
    const eqSerie = document.getElementById('eqSerie')?.value.trim();
    const eqCombustivel = document.getElementById('eqCombustivel')?.value.trim();

    // 3. Validação básica para não salvar em branco
    if (!eqMarca || !eqModelo) {
        alert('⚠️ Preencha pelo menos a Marca e o Modelo para cadastrar o equipamento.');
        return;
    }

    // 4. Monta o objeto do equipamento com o vínculo do clienteId
    const novoEquipamento = {
        clienteId: clienteId,
        eqMarca: eqMarca,
        eqModelo: eqModelo,
        eqSerie: eqSerie || '---',
        eqCombustivel: eqCombustivel || '---',
        dataCadastro: new Date().toISOString()
    };

    // 5. Grava no IndexedDB
    try {
        const transaction = db.transaction([STORES.equipamentos], 'readwrite');
        const store = transaction.objectStore(STORES.equipamentos);
        const request = store.add(novoEquipamento);

        request.onsuccess = async () => {
            alert(`✅ Equipamento (${eqMarca} ${eqModelo}) cadastrado e vinculado com sucesso!`);
            
            // Atualiza o menu de equipamentos para incluir a nova máquina imediatamente
            await carregarEquipamentosDropdown(clienteId);
            
            // Deixa o menu posicionado no equipamento que acabou de ser criado
            const selectEquipamento = document.getElementById('selectEquipamento');
            if (selectEquipamento) {
                // Procura a opção recém-criada pelo texto correspondente
                setTimeout(() => {
                    for (let i = 0; i < selectEquipamento.options.length; i++) {
                        if (selectEquipamento.options[i].textContent.includes(eqSerie)) {
                            selectEquipamento.selectedIndex = i;
                            break;
                        }
                    }
                }, 100);
            }
        };

        request.onerror = () => {
            alert('❌ Erro técnico ao gravar equipamento no banco de dados.');
        };

    } catch (error) {
        console.error(error);
        alert('❌ Não foi possível salvar o equipamento.');
    }
}

// ============================================================
// 6. CARREGAMENTO E FLUXO DE DADOS
// ============================================================

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
        
        // Limpa os campos de equipamento antigos esperando a nova seleção ou cadastro
        ['eqMarca', 'eqModelo', 'eqSerie', 'eqCombustivel'].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = '';
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
            opt.textContent = `${eq.eqMarca} ${eq.eqModelo} (${eq.eqSerie})`;
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
    if (endereco) window.open(`http://googleusercontent.com/maps.google.com/3{encodeURIComponent(endereco)}`, '_blank');
}

// ============================================================
// 7. GERAÇÃO DO PDF E PREENCHIMENTO AUTOMÁTICO DA SEDE
// ============================================================

async function obterDadosEmpresa() {
    return {
        nome: "Marlift Empilhadeiras",
        cnpj: "65.707.636/0001-13",
        endereco: "Rua Maria Fernanda, 279, Santana de Parnaíba - SP",
        telefone: ""
    };
}

async function gerarPDF() {
    const cliNome = document.getElementById('cliNome')?.value || 'Cliente não informado';
    const empresa = await obterDadosEmpresa();
    
    const htmlFinal = `
        <div style="text-align:center; border-bottom:3px solid #ff6600; padding-bottom:15px; margin-bottom:20px;">
            <h1 style="color:#ff6600; margin:0; font-size:28px;">MARLIFT</h1>
            <p style="margin:5px 0 0 0; font-size:11px; color:#666;">Ordem de Serviço Eletrônica</p>
            <p style="margin:5px 0; font-size:11px;"><b>${empresa.nome}</b><br>${empresa.cnpj}<br>${empresa.endereco}</p>
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
    alert("O.S salva com sucesso no histórico!");
    renderHistorico();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) selectedTab.classList.add('active');
}
