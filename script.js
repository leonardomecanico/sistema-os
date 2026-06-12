/* =============================================================
   MARLIFT SERVICE - VERSÃO COMPLETA COM CALENDÁRIO E HISTÓRICO
   Sistema de Ordem de Serviço Mobile com Suporte Offline
   ============================================================= */

// ============================================================
// 1. BANCO DE DADOS (IndexedDB)
// ============================================================

const DB_NAME = 'MarliftDB';
const DB_VERSION = 2;
const STORES = {
    clientes: 'clientes',
    equipamentos: 'equipamentos',
    ordens: 'ordens',
    empresa: 'empresa'
};

let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('Erro ao abrir IndexedDB');
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB inicializado');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Store de clientes
            if (!database.objectStoreNames.contains(STORES.clientes)) {
                const clienteStore = database.createObjectStore(STORES.clientes, { keyPath: 'id', autoIncrement: true });
                clienteStore.createIndex('nome', 'cliNome', { unique: false });
            }
            
            // Store de equipamentos
            if (!database.objectStoreNames.contains(STORES.equipamentos)) {
                const eqStore = database.createObjectStore(STORES.equipamentos, { keyPath: 'id', autoIncrement: true });
                eqStore.createIndex('clienteId', 'clienteId', { unique: false });
            }
            
            // Store de ordens de serviço
            if (!database.objectStoreNames.contains(STORES.ordens)) {
                const osStore = database.createObjectStore(STORES.ordens, { keyPath: 'id', autoIncrement: true });
                osStore.createIndex('data', 'data', { unique: false });
                osStore.createIndex('status', 'status', { unique: false });
            }
            
            // Store de dados da empresa
            if (!database.objectStoreNames.contains(STORES.empresa)) {
                database.createObjectStore(STORES.empresa, { keyPath: 'id' });
            }
        };
    });
}

// ============================================================
// 2. INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        setupNavTabs();
        setupEventListeners();
        await carregarClientesDropdown();
        restaurarEmpresa();
        atualizarEstadoBotaoPDF();
        console.log('✅ Aplicação inicializada com sucesso');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        mostrarErro('Erro ao inicializar aplicação');
    }
});

// ============================================================
// 3. NAVEGAÇÃO ENTRE ABAS
// ============================================================

function setupNavTabs() {
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Remove active de todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(nav => {
        nav.classList.remove('active');
    });
    
    // Ativa a aba selecionada
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) selectedTab.classList.add('active');
    
    const navBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (navBtn) navBtn.classList.add('active');
    
    // Se clicou em calendário, renderiza
    if (tabId === 'tab-calendario') {
        renderCalendario();
        renderOSAgendadas();
    }
    
    // Se clicou em histórico, renderiza
    if (tabId === 'tab-historico') {
        renderHistorico();
    }
}

// ============================================================
// 4. EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Modais
    const btnAbrirGerenciador = document.getElementById('btnAbrirGerenciador');
    const btnFecharGerenciador = document.getElementById('btnFecharGerenciador');
    const btnSalvarNovoCliente = document.getElementById('btnSalvarNovoCliente');
    
    if (btnAbrirGerenciador) btnAbrirGerenciador.addEventListener('click', abrirModalCliente);
    if (btnFecharGerenciador) btnFecharGerenciador.addEventListener('click', fecharModalCliente);
    if (btnSalvarNovoCliente) btnSalvarNovoCliente.addEventListener('click', salvarNovoCliente);
    
    // Cliente
    const buscaCliente = document.getElementById('buscaCliente');
    if (buscaCliente) buscaCliente.addEventListener('change', preencherClienteSelecionado);
    
    // Equipamento
    const selectEquipamento = document.getElementById('selectEquipamento');
    const btnAdicionarEquipamento = document.getElementById('btnAdicionarEquipamento');
    if (selectEquipamento) selectEquipamento.addEventListener('change', preencherEquipamentoSelecionado);
    if (btnAdicionarEquipamento) btnAdicionarEquipamento.addEventListener('click', () => {
        switchTab('tab-os');
        document.getElementById('eqMarca').value = '';
        document.getElementById('eqModelo').value = '';
        document.getElementById('eqSerie').value = '';
        document.getElementById('eqCombustivel').value = '';
    });
    
    // GPS
    const btnGps = document.getElementById('btnGps');
    if (btnGps) btnGps.addEventListener('click', gerarRotaGPS);
    
    // Fotos
    const inputFotos = document.getElementById('inputFotos');
    const inputFotosUpload = document.getElementById('inputFotosUpload');
    if (inputFotos) inputFotos.addEventListener('change', (e) => handleFotosUpload(e, 'camera'));
    if (inputFotosUpload) inputFotosUpload.addEventListener('change', (e) => handleFotosUpload(e, 'gallery'));
    
    // Assinatura
    const btnAbrirAssinatura = document.getElementById('btnAbrirAssinatura');
    const btnLimparAssinatura = document.getElementById('btnLimparAssinatura');
    const btnSalvarAssinatura = document.getElementById('btnSalvarAssinatura');
    
    if (btnAbrirAssinatura) btnAbrirAssinatura.addEventListener('click', abrirModalAssinatura);
    if (btnLimparAssinatura) btnLimparAssinatura.addEventListener('click', limparAssinatura);
    if (btnSalvarAssinatura) btnSalvarAssinatura.addEventListener('click', salvarAssinatura);
    
    // PDF e Salvamento
    const btnGerarPdf = document.getElementById('btnGerarPdf');
    const btnSalvarOS = document.getElementById('btnSalvarOS');
    
    if (btnGerarPdf) btnGerarPdf.addEventListener('click', gerarPDF);
    if (btnSalvarOS) btnSalvarOS.addEventListener('click', salvarOS);
    
    // Config
    const btnSalvarEmpresa = document.getElementById('btnSalvarEmpresa');
    const btnExportarDados = document.getElementById('btnExportarDados');
    const btnLimparDados = document.getElementById('btnLimparDados');
    
    if (btnSalvarEmpresa) btnSalvarEmpresa.addEventListener('click', salvarDadosEmpresa);
    if (btnExportarDados) btnExportarDados.addEventListener('click', exportarDados);
    if (btnLimparDados) btnLimparDados.addEventListener('click', limparTodosOsDados);
    
    // Modal editar OS
    const btnFecharModalEditar = document.getElementById('btnFecharModalEditar');
    const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
    const btnConfirmarEdicao = document.getElementById('btnConfirmarEdicao');
    
    if (btnFecharModalEditar) btnFecharModalEditar.addEventListener('click', fecharModalEditarOS);
    if (btnCancelarEdicao) btnCancelarEdicao.addEventListener('click', fecharModalEditarOS);
    if (btnConfirmarEdicao) btnConfirmarEdicao.addEventListener('click', confirmarEdicaoOS);
    
    // AutoSave
    document.getElementById('osForm').addEventListener('input', autoSave);
    
    // Filtros
    const filtroCliente = document.getElementById('filtroCliente');
    const filtroStatus = document.getElementById('filtroStatus');
    if (filtroCliente) filtroCliente.addEventListener('input', renderHistorico);
    if (filtroStatus) filtroStatus.addEventListener('change', renderHistorico);
}

// ============================================================
// 5. GERENCIAMENTO DE CLIENTES
// ============================================================

async function carregarClientesDropdown() {
    const select = document.getElementById('buscaCliente');
    if (!select) return;
    
    const clientes = await obterTodosClientes();
    
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.cliNome;
        select.appendChild(option);
    });
}

async function obterTodosClientes() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.clientes], 'readonly');
        const store = transaction.objectStore(STORES.clientes);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

function abrirModalCliente() {
    const modal = document.getElementById('modalGerenciador');
    if (modal) modal.style.display = 'flex';
}

function fecharModalCliente() {
    const modal = document.getElementById('modalGerenciador');
    if (modal) modal.style.display = 'none';
    document.getElementById('cadClienteForm').reset();
}

async function salvarNovoCliente() {
    const form = document.getElementById('cadClienteForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const novoCliente = {
        cliNome: document.getElementById('cadCliNome').value,
        cliCnpj: document.getElementById('cadCliCnpj').value,
        cliEndereco: document.getElementById('cadCliEndereco').value,
        cliContato: document.getElementById('cadCliContato').value,
        cliTelefone: document.getElementById('cadCliTelefone').value,
        cliEmail: document.getElementById('cadCliEmail').value,
        dataCadastro: new Date().toISOString()
    };
    
    try {
        const clienteId = await salvarClienteDB(novoCliente);
        
        // Salva equipamento
        const novoEquipamento = {
            clienteId: clienteId,
            eqMarca: document.getElementById('cadEqMarca').value,
            eqModelo: document.getElementById('cadEqModelo').value,
            eqCombustivel: document.getElementById('cadEqCombustivel').value,
            eqSerie: document.getElementById('cadEqSerie').value,
            dataCadastro: new Date().toISOString()
        };
        
        await salvarEquipamentoDB(novoEquipamento);
        
        mostrarSucesso('✅ Cliente + Equipamento salvos!');
        fecharModalCliente();
        await carregarClientesDropdown();
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarErro('Erro ao salvar cliente');
    }
}

function salvarClienteDB(cliente) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.clientes], 'readwrite');
        const store = transaction.objectStore(STORES.clientes);
        const request = store.add(cliente);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function preencherClienteSelecionado(event) {
    const clienteId = event.target.value;
    if (!clienteId) return;
    
    const cliente = await obterClientePorId(parseInt(clienteId));
    if (!cliente) return;
    
    document.getElementById('cliNome').value = cliente.cliNome;
    document.getElementById('cliCnpj').value = cliente.cliCnpj || '';
    document.getElementById('cliEndereco').value = cliente.cliEndereco;
    document.getElementById('cliContato').value = cliente.cliContato || '';
    document.getElementById('cliTelefone').value = cliente.cliTelefone || '';
    document.getElementById('cliEmail').value = cliente.cliEmail || '';
    
    // Carrega equipamentos deste cliente
    await carregarEquipamentosDropdown(clienteId);
    autoSave();
}

function obterClientePorId(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.clientes], 'readonly');
        const store = transaction.objectStore(STORES.clientes);
        const request = store.get(id);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ============================================================
// 6. GERENCIAMENTO DE EQUIPAMENTOS
// ============================================================

async function carregarEquipamentosDropdown(clienteId) {
    const select = document.getElementById('selectEquipamento');
    if (!select) return;
    
    const equipamentos = await obterEquipamentosDoCliente(clienteId);
    
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    equipamentos.forEach(eq => {
        const option = document.createElement('option');
        option.value = eq.id;
        option.textContent = `${eq.eqMarca} ${eq.eqModelo} (${eq.eqSerie})`;
        select.appendChild(option);
    });
}

async function obterEquipamentosDoCliente(clienteId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.equipamentos], 'readonly');
        const store = transaction.objectStore(STORES.equipamentos);
        const index = store.index('clienteId');
        const request = index.getAll(clienteId);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

function salvarEquipamentoDB(equipamento) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.equipamentos], 'readwrite');
        const store = transaction.objectStore(STORES.equipamentos);
        const request = store.add(equipamento);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function preencherEquipamentoSelecionado(event) {
    const eqId = event.target.value;
    if (!eqId) return;
    
    const eq = await obterEquipamentoPorId(parseInt(eqId));
    if (!eq) return;
    
    document.getElementById('eqMarca').value = eq.eqMarca;
    document.getElementById('eqModelo').value = eq.eqModelo;
    document.getElementById('eqCombustivel').value = eq.eqCombustivel;
    document.getElementById('eqSerie').value = eq.eqSerie;
    
    autoSave();
}

function obterEquipamentoPorId(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.equipamentos], 'readonly');
        const store = transaction.objectStore(STORES.equipamentos);
        const request = store.get(id);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ============================================================
// 7. GPS
// ============================================================

function gerarRotaGPS() {
    const endereco = document.getElementById('cliEndereco').value.trim();
    if (!endereco) {
        mostrarErro('Digite o endereço primeiro');
        return;
    }
    
    const url = `https://www.google.com/maps/search/${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
}

// ============================================================
// 8. FOTOS (40 máximo)
// ============================================================

const MAX_FOTOS = 40;
let fotosBuff = [];

async function handleFotosUpload(event, tipo) {
    const files = Array.from(event.target.files);
    const totalFotos = fotosBuff.length + files.length;
    
    if (totalFotos > MAX_FOTOS) {
        mostrarErro(`📷 Máximo ${MAX_FOTOS} fotos. Você tem ${fotosBuff.length} + ${files.length}`);
        event.target.value = '';
        return;
    }
    
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const foto = {
                data: e.target.result,
                nome: file.name,
                tipo: file.type,
                data_upload: new Date().toISOString()
            };
            fotosBuff.push(foto);
            atualizarGaleriaFotos();
            autoSave();
        };
        reader.readAsDataURL(file);
    }
    
    event.target.value = '';
}

function atualizarGaleriaFotos() {
    const galeria = document.getElementById('galeriaFotos');
    const contador = document.getElementById('fotoContador');
    
    if (galeria) {
        galeria.innerHTML = '';
        fotosBuff.forEach((foto, index) => {
            const div = document.createElement('div');
            div.className = 'foto-item';
            div.style.backgroundImage = `url('${foto.data}')`;
            
            const btnRemove = document.createElement('button');
            btnRemove.type = 'button';
            btnRemove.className = 'btn-remove-foto';
            btnRemove.innerHTML = '×';
            btnRemove.addEventListener('click', () => {
                fotosBuff.splice(index, 1);
                atualizarGaleriaFotos();
                autoSave();
            });
            
            div.appendChild(btnRemove);
            galeria.appendChild(div);
        });
    }
    
    if (contador) contador.textContent = fotosBuff.length;
}

// ============================================================
// 9. ASSINATURA
// ============================================================

let canvasAssinatura = null;
let contextAssinatura = null;
let assinaturaSalva = null;
let desenho = false;

function abrirModalAssinatura() {
    const modal = document.getElementById('modalAssinatura');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(inicializarCanvas, 100);
    }
}

function inicializarCanvas() {
    canvasAssinatura = document.getElementById('canvasAssinatura');
    if (!canvasAssinatura) return;
    
    const wrapper = canvasAssinatura.parentElement;
    canvasAssinatura.width = wrapper.offsetWidth - 4;
    canvasAssinatura.height = 200;
    
    contextAssinatura = canvasAssinatura.getContext('2d');
    contextAssinatura.lineCap = 'round';
    contextAssinatura.lineJoin = 'round';
    contextAssinatura.lineWidth = 2;
    contextAssinatura.strokeStyle = '#000000';
    contextAssinatura.fillStyle = '#ffffff';
    contextAssinatura.fillRect(0, 0, canvasAssinatura.width, canvasAssinatura.height);
    
    canvasAssinatura.addEventListener('touchstart', iniciarDesenho);
    canvasAssinatura.addEventListener('touchmove', desenharToque);
    canvasAssinatura.addEventListener('touchend', finalizarDesenho);
    
    canvasAssinatura.addEventListener('mousedown', iniciarDesenho);
    canvasAssinatura.addEventListener('mousemove', desenharMouse);
    canvasAssinatura.addEventListener('mouseup', finalizarDesenho);
}

function iniciarDesenho() {
    desenho = true;
}

function desenharToque(e) {
    if (!desenho) return;
    e.preventDefault();
    
    const rect = canvasAssinatura.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (contextAssinatura) {
        contextAssinatura.beginPath();
        contextAssinatura.moveTo(x, y);
        contextAssinatura.lineTo(x + 1, y + 1);
        contextAssinatura.stroke();
    }
}

function desenharMouse(e) {
    if (!desenho || !e.buttons) return;
    
    const rect = canvasAssinatura.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (contextAssinatura) {
        contextAssinatura.beginPath();
        contextAssinatura.moveTo(x, y);
        contextAssinatura.lineTo(x + 1, y + 1);
        contextAssinatura.stroke();
    }
}

function finalizarDesenho() {
    desenho = false;
}

function limparAssinatura() {
    if (contextAssinatura) {
        contextAssinatura.fillStyle = '#ffffff';
        contextAssinatura.fillRect(0, 0, canvasAssinatura.width, canvasAssinatura.height);
    }
}

function salvarAssinatura() {
    if (!canvasAssinatura) return;
    
    assinaturaSalva = canvasAssinatura.toDataURL('image/png');
    
    const areaAssinatura = document.getElementById('areaAssinaturaSalva');
    if (areaAssinatura) {
        areaAssinatura.innerHTML = `<img src="${assinaturaSalva}" style="max-width:100%; max-height:100%; border-radius:4px;">`;
    }
    
    const modal = document.getElementById('modalAssinatura');
    if (modal) modal.style.display = 'none';
    
    autoSave();
    mostrarSucesso('✍️ Assinatura salva!');
}

// ============================================================
// 10. SALVAMENTO DE O.S
// ============================================================

async function salvarOS() {
    const cliNome = document.getElementById('cliNome').value.trim();
    const eqMarca = document.getElementById('eqMarca').value.trim();
    const eqModelo = document.getElementById('eqModelo').value.trim();
    
    if (!cliNome || !eqMarca || !eqModelo) {
        mostrarErro('Preencha cliente, marca e modelo');
        return;
    }
    
    const novaOS = {
        cliNome: document.getElementById('cliNome').value,
        cliCnpj: document.getElementById('cliCnpj').value,
        cliEndereco: document.getElementById('cliEndereco').value,
        cliContato: document.getElementById('cliContato').value,
        cliEmail: document.getElementById('cliEmail').value,
        cliTelefone: document.getElementById('cliTelefone').value,
        
        eqMarca: document.getElementById('eqMarca').value,
        eqModelo: document.getElementById('eqModelo').value,
        eqCombustivel: document.getElementById('eqCombustivel').value,
        eqSerie: document.getElementById('eqSerie').value,
        
        tipoChamado: document.getElementById('tipoChamado').value,
        defeitoApresentado: document.getElementById('defeitoApresentado').value,
        
        timeInicio: document.getElementById('timeInicio').value,
        timePausa: document.getElementById('timePausa').value,
        timeFim: document.getElementById('timeFim').value,
        
        servicoExecutado: document.getElementById('servicoExecutado').value,
        pecasAplicadas: document.getElementById('pecasAplicadas').value,
        obsGerais: document.getElementById('obsGerais').value,
        
        fotos: fotosBuff,
        assinatura: assinaturaSalva,
        
        data: new Date().toISOString(),
        status: 'concluida'
    };
    
    try {
        await salvarOSDB(novaOS);
        mostrarSucesso('✅ O.S salva com sucesso!');
        limparFormulario();
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarErro('Erro ao salvar O.S');
    }
}

function salvarOSDB(os) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.ordens], 'readwrite');
        const store = transaction.objectStore(STORES.ordens);
        const request = store.add(os);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ============================================================
// 11. AUTOSAVE
// ============================================================

function autoSave() {
    const dadosOS = {
        cliNome: document.getElementById('cliNome').value,
        cliCnpj: document.getElementById('cliCnpj').value,
        cliEndereco: document.getElementById('cliEndereco').value,
        cliContato: document.getElementById('cliContato').value,
        cliEmail: document.getElementById('cliEmail').value,
        cliTelefone: document.getElementById('cliTelefone').value,
        
        eqMarca: document.getElementById('eqMarca').value,
        eqModelo: document.getElementById('eqModelo').value,
        eqCombustivel: document.getElementById('eqCombustivel').value,
        eqSerie: document.getElementById('eqSerie').value,
        
        tipoChamado: document.getElementById('tipoChamado').value,
        defeitoApresentado: document.getElementById('defeitoApresentado').value,
        
        timeInicio: document.getElementById('timeInicio').value,
        timePausa: document.getElementById('timePausa').value,
        timeFim: document.getElementById('timeFim').value,
        
        servicoExecutado: document.getElementById('servicoExecutado').value,
        pecasAplicadas: document.getElementById('pecasAplicadas').value,
        obsGerais: document.getElementById('obsGerais').value,
        
        fotoCount: fotosBuff.length,
        assinatura_salva: assinaturaSalva ? true : false,
        data_alteracao: new Date().toISOString()
    };
    
    localStorage.setItem('os_em_andamento', JSON.stringify(dadosOS));
}

// ============================================================
// 12. PDF COMPLETO
// ============================================================

async function gerarPDF() {
    const cliNome = document.getElementById('cliNome').value;
    const eqMarca = document.getElementById('eqMarca').value;
    const eqModelo = document.getElementById('eqModelo').value;
    
    if (!cliNome || !eqMarca || !eqModelo) {
        mostrarErro('Preencha cliente e equipamento');
        return;
    }
    
    const empresa = await obterDadosEmpresa();
    
    const elementos = [];
    
    // Cabeçalho com dados da empresa
    elementos.push(`
        <div style="text-align:center; margin-bottom:20px; border-bottom:3px solid #ff6600; padding-bottom:15px;">
            <h1 style="color:#ff6600; margin:0; font-size:28px; font-weight:bold;">MARLIFT</h1>
            <p style="margin:5px 0 0 0; font-size:11px; color:#666;">Ordem de Serviço</p>
    `);
    
    if (empresa) {
        elementos.push(`
            <hr style="margin:10px 0; border:none; border-top:1px solid #ddd;">
            <p style="margin:5px 0; font-size:11px; font-weight:bold;">${empresa.nome || 'N/A'}</p>
            ${empresa.cnpj ? `<p style="margin:2px 0; font-size:10px;">CNPJ: ${empresa.cnpj}</p>` : ''}
            ${empresa.endereco ? `<p style="margin:2px 0; font-size:10px;">${empresa.endereco}</p>` : ''}
            ${empresa.telefone ? `<p style="margin:2px 0; font-size:10px;">Tel: ${empresa.telefone}</p>` : ''}
        `);
    }
    
    elementos.push(`</div>`);
    
    // Cliente
    elementos.push(`
        <div style="margin-bottom:15px;">
            <h3 style="color:#2b2b2b; border-bottom:2px solid #ff6600; padding-bottom:5px; margin-bottom:8px; font-size:13px;">CLIENTE</h3>
            <table style="width:100%; font-size:11px;">
                <tr><td style="width:30%; font-weight:bold;">Razão Social:</td><td>${cliNome}</td></tr>
                <tr><td style="font-weight:bold;">CNPJ:</td><td>${document.getElementById('cliCnpj').value || '---'}</td></tr>
                <tr><td style="font-weight:bold;">Endereço:</td><td>${document.getElementById('cliEndereco').value || '---'}</td></tr>
                <tr><td style="font-weight:bold;">Contato:</td><td>${document.getElementById('cliContato').value || '---'}</td></tr>
                <tr><td style="font-weight:bold;">Telefone:</td><td>${document.getElementById('cliTelefone').value || '---'}</td></tr>
                <tr><td style="font-weight:bold;">E-mail:</td><td>${document.getElementById('cliEmail').value || '---'}</td></tr>
            </table>
        </div>
    `);
    
    // Equipamento
    elementos.push(`
        <div style="margin-bottom:15px;">
            <h3 style="color:#2b2b2b; border-bottom:2px solid #ff6600; padding-bottom:5px; margin-bottom:8px; font-size:13px;">EQUIPAMENTO</h3>
            <table style="width:100%; font-size:11px;">
                <tr><td style="width:30%; font-weight:bold;">Marca:</td><td>${eqMarca}</td></tr>
                <tr><td style="font-weight:bold;">Modelo:</td><td>${eqModelo}</td></tr>
                <tr><td style="font-weight:bold;">Série:</td><td>${document.getElementById('eqSerie').value || '---'}</td></tr>
                <tr><td style="font-weight:bold;">Combustível:</td><td>${document.getElementById('eqCombustivel').value || '---'}</td></tr>
            </table>
        </div>
    `);
    
    // Triagem
    elementos.push(`
        <div style="margin-bottom:15px;">
            <h3 style="color:#2b2b2b; border-bottom:2px solid #ff6600; padding-bottom:5px; margin-bottom:8px; font-size:13px;">TRIAGEM</h3>
            <table style="width:100%; font-size:11px;">
                <tr><td style="width:30%; font-weight:bold;">Tipo:</td><td>${document.getElementById('tipoChamado').value || '---'}</td></tr>
                <tr><td style="font-weight:bold;">Defeito:</td><td>${document.getElementById('defeitoApresentado').value || '---'}</td></tr>
            </table>
        </div>
    `);
    
    // Horários
    elementos.push(`
        <div style="margin-bottom:15px;">
            <h3 style="color:#2b2b2b; border-bottom:2px solid #ff6600; padding-bottom:5px; margin-bottom:8px; font-size:13px;">HORÁRIOS</h3>
            <table style="width:100%; font-size:11px;">
                <tr><td style="width:30%; font-weight:bold;">Início:</td><td>${document.getElementById('timeInicio').value || '--:--'}</td></tr>
                <tr><td style="font-weight:bold;">Pausa:</td><td>${document.getElementById('timePausa').value || '--:--'}</td></tr>
                <tr><td style="font-weight:bold;">Fim:</td><td>${document.getElementById('timeFim').value || '--:--'}</td></tr>
            </table>
        </div>
    `);
    
    // Serviço executado
    const servicoExecutado = document.getElementById('servicoExecutado').value;
    if (servicoExecutado) {
        elementos.push(`
            <div style="margin-bottom:15px;">
                <h3 style="color:#2b2b2b; border-bottom:2px solid #ff6600; padding-bottom:5px; margin-bottom:8px; font-size:13px;">SERVIÇO EXECUTADO</h3>
                <p style="font-size:11px; white-space:pre-wrap; line-height:1.4;">${servicoExecutado}</p>
            </div>
        `);
    }
    
    // Peças
    const pecasAplicadas = document.getElementById('pecasAplicadas').value;
    if (pecasAplicadas) {
        elementos.push(`
            <div style="margin-bottom:15px;">
                <h3 style="color:#2b2b2b; border-bottom:2px solid #ff6600; padding-bottom:5px; margin-bottom:8px; font-size:13px;">PEÇAS APLICADAS</h3>
                <p style="font-size:11px; white-space:pre-wrap; line-height:1.4;">${pecasAplicadas}</p>
            </div>
        `);
    }
    
    // Observações
    const obsGerais = document.getElementById('obsGerais').value;
    if (obsGerais) {
        elementos.push(`
            <div style="margin-bottom:15px;">
                <h3 style="color:#2b2b2b; border-bottom:2px solid #ff6600; padding-bottom:5px; margin-bottom:8px; font-size:13px;">OBSERVAÇÕES</h3>
                <p style="font-size:11px; white-space:pre-wrap; line-height:1.4;">${obsGerais}</p>
            </div>
        `);
    }
    
    // Fotos (nova página)
    if (fotosBuff.length > 0) {
        elementos.push(`<div style="page-break-before:always; margin-top:20px;"></div>`);
        elementos.push(`
            <div style="margin-bo
