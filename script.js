// ==========================================
// MARLIFT - VARIÁVEIS GLOBAIS E ESTADOS
// ==========================================
let bancoClientes = [];
let cronometroInterval = null;
let tempoSegundosAcumulados = 0;
let statusCronometro = 'parado'; // parado, rodando, pausado, finalizado
let historicoEventos = [];
let fotosArray = [];
let assinaturaDataUrl = null;

const canvas = document.getElementById('canvasAssinatura');
const ctx = canvas ? canvas.getContext('2d') : null;
let desenhando = false;

// ==========================================
// INICIALIZAÇÃO DO SISTEMA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarGerenciadorClientes();
    configurarEventosCronometro();
    configurarEventosFotos();
    configurarCanvas();
    configurarEventosModais();
    
    carregarDadosLocalStorage();
    
    // Captura digitação para salvar rascunho automático da OS principal
    const inputsForm = document.querySelectorAll('#osForm input, #osForm textarea, #osForm select');
    inputsForm.forEach(input => input.addEventListener('input', salvarDadosLocalStorage));
});

function obterHoraAtual() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ==========================================
// 1. BANCO DE CLIENTES OFFLINE (CORRIGIDO & REVISADO)
// ==========================================
function inicializarGerenciadorClientes() {
    console.log("Marlift: Inicializando banco offline...");
    
    try {
        const clientesSalvos = localStorage.getItem('marlift_banco_clientes');
        bancoClientes = clientesSalvos ? JSON.parse(clientesSalvos) : [];
    } catch (e) {
        bancoClientes = [];
    }

    atualizarSelectClientes();

    // Evento de seleção do cliente cadastrado para preencher a tela principal
    const buscaSelect = document.getElementById('buscaCliente');
    if (buscaSelect) {
        buscaSelect.addEventListener('change', (e) => {
            const id = e.target.value;
            if (!id) return;
            
            const cli = bancoClientes.find(c => c.id === id);
            if (cli) {
                if(document.getElementById('cliNome')) document.getElementById('cliNome').value = cli.nome || '';
                if(document.getElementById('cliCnpj')) document.getElementById('cliCnpj').value = cli.cnpj || '';
                if(document.getElementById('cliEndereco')) document.getElementById('cliEndereco').value = cli.endereco || '';
                if(document.getElementById('cliContato')) document.getElementById('cliContato').value = cli.contato || '';
                if(document.getElementById('cliEmail')) document.getElementById('cliEmail').value = cli.email || '';
                if(document.getElementById('cliTelefone')) document.getElementById('cliTelefone').value = cli.telefone || '';
                if(document.getElementById('eqMarca')) document.getElementById('eqMarca').value = cli.marca || '';
                if(document.getElementById('eqModelo')) document.getElementById('eqModelo').value = cli.modelo || '';
                if(document.getElementById('eqCombustivel')) document.getElementById('eqCombustivel').value = cli.combustivel || '';
                if(document.getElementById('eqSerie')) document.getElementById('eqSerie').value = cli.serie || '';
                
                salvarDadosLocalStorage();
                alert(`Dados de ${cli.nome} carregados com sucesso!`);
            }
        });
    }

    // Ação do Botão Salvar do Modal de Cadastro
    const btnSalvar = document.getElementById('btnSalvarNovoCliente');
    if (btnSalvar) {
        btnSalvar.onclick = function(evento) {
            if (evento) evento.preventDefault();
            
            console.log("Marlift: Processando clique de salvamento...");

            const nome = document.getElementById('cadCliNome').value.trim();
            const endereco = document.getElementById('cadCliEndereco').value.trim();
            const marca = document.getElementById('cadEqMarca').value.trim();
            const modelo = document.getElementById('cadEqModelo').value.trim();
            const serie = document.getElementById('cadEqSerie').value.trim();

            if (!nome || !endereco || !marca || !modelo || !serie) {
                alert("Por favor, preencha todos os campos obrigatórios marcados com (*)");
                return false;
            }

            const novoCliente = {
                id: Date.now().toString(),
                nome: nome,
                cnpj: document.getElementById('cadCliCnpj').value.trim(),
                endereco: endereco,
                contato: document.getElementById('cadCliContato').value.trim(),
                email: document.getElementById('cadCliEmail').value.trim(),
                telefone: document.getElementById('cadCliTelefone').value.trim(),
                marca: marca,
                modelo: modelo,
                combustivel: document.getElementById('cadEqCombustivel').value,
                serie: serie
            };

            bancoClientes.push(novoCliente);
            localStorage.setItem('marlift_banco_clientes', JSON.stringify(bancoClientes));
            
            atualizarSelectClientes();
            
            const formCad = document.getElementById('cadClienteForm');
            if (formCad) formCad.reset();
            
            fecharModais();
            
            alert("Cliente e Equipamento cadastrados com sucesso!");
            return true;
        };
    }
}

function atualizarSelectClientes() {
    const select = document.getElementById('buscaCliente');
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecione um Cliente ou Máquina --</option>';
    
    bancoClientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nome} (${c.marca} ${c.modelo})`;
        select.appendChild(opt);
    });
}

// ==========================================
// 2. SALVAMENTO AUTOMÁTICO E CACHE DA OS
// ==========================================
function salvarDadosLocalStorage() {
    const dados = {};
    document.querySelectorAll('#osForm input, #osForm textarea, #osForm select').forEach(el => {
        if(el.id && el.id !== 'buscaCliente' && el.id !== 'inputFotos') {
            dados[el.id] = el.value;
        }
    });
    dados.tempo = tempoSegundosAcumulados;
    dados.statusCronometro = statusCronometro;
    dados.historicoEventos = historicoEventos;
    localStorage.setItem('marlift_os_sessao', JSON.stringify(dados));
}

function carregarDadosLocalStorage() {
    const salvo = localStorage.getItem('marlift_os_sessao');
    if (!salvo) return;
    
    const dados = JSON.parse(salvo);
    Object.keys(dados).forEach(key => {
        const el = document.getElementById(key);
        if (el && typeof dados[key] === 'string') el.value = dados[key];
    });

    tempoSegundosAcumulados = dados.tempo || 0;
    statusCronometro = dados.statusCronometro || 'parado';
    historicoEventos = dados.historicoEventos || [];

    atualizarDisplayCronometro();
    renderizarLinhaDoTempo();

    const btnIniciar = document.getElementById('btnIniciar');
    const btnPausar = document.getElementById('btnPausar');

    if (statusCronometro === 'rodando') {
        statusCronometro = 'parado'; 
        iniciarCronometro(); 
    } else if (statusCronometro === 'pausado') {
        if(btnIniciar) {
            btnIniciar.disabled = false; 
            btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Retomar Atendimento';
        }
        if(btnPausar) btnPausar.disabled = true;
    } else if (statusCronometro === 'finalizado') {
        if(btnIniciar) {
            btnIniciar.disabled = true; 
            btnIniciar.innerHTML = '<i class="fa-solid fa-lock"></i> Serviço Encerrado';
        }
        if(btnPausar) btnPausar.disabled = true;
    }

    const fotosCache = localStorage.getItem('marlift_os_fotos');
    if (fotosCache) { 
        fotosArray = JSON.parse(fotosCache); 
        atualizarGaleriaFotos(); 
    }
    
    const assCache = localStorage.getItem('marlift_os_assinatura');
    if (assCache) { 
        assinaturaDataUrl = assCache; 
        exibirAssinaturaSalva(); 
    }
    
    verificarLiberacaoBotoesFinais();
}

// ==========================================
// 3. EVENTOS DO CRONÔMETRO E GPS
// ==========================================
function configurarEventosCronometro() {
    const btnInic = document.getElementById('btnIniciar');
    const btnPaus = document.getElementById('btnPausar');
    const btnGps = document.getElementById('btnGps');

    if(btnInic) btnInic.addEventListener('click', iniciarCronometro);
    if(btnPaus) {
        btnPaus.addEventListener('click', () => {
            document.getElementById('modalPausa').style.display = 'flex';
        });
    }
    
    if(btnGps) {
        btnGps.addEventListener('click', () => {
            const end = document.getElementById('cliEndereco').value;
            if(end) {
                window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(end), '_blank');
            } else {
                alert("Selecione um cliente com endereço válido para gerar a rota.");
            }
        });
    }
}

function iniciarCronometro() {
    if (statusCronometro === 'rodando') return;
    const hora = obterHoraAtual();

    if (statusCronometro === 'parado') historicoEventos.push({ evento: "Início do Atendimento", hora });
    else if (statusCronometro === 'pausado') historicoEventos.push({ evento: "Retorno do Atendimento", hora });

    statusCronometro = 'rodando';
    const btnInic = document.getElementById('btnIniciar');
    const btnPaus = document.getElementById('btnPausar');
    
    if(btnInic) {
        btnInic.disabled = true;
        btnInic.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Em Andamento';
    }
    if(btnPaus) btnPaus.disabled = false;

    cronometroInterval = setInterval(() => {
        tempoSegundosAcumulados++;
        atualizarDisplayCronometro();
        salvarDadosLocalStorage();
    }, 1000);
    
    renderizarLinhaDoTempo(); 
    salvarDadosLocalStorage();
}

function pausarCronometro(motivo) {
    if (statusCronometro !== 'rodando') return;
    clearInterval(cronometroInterval);
    statusCronometro = 'pausado';
    historicoEventos.push({ 
        evento: `Pausa (${motivo})`, 
        hora: obterHoraAtual(), 
        tempoParcial: formatarTempo(tempoSegundosAcumulados) 
    });

    const btnInic = document.getElementById('btnIniciar');
    const btnPaus = document.getElementById('btnPausar');

    if(btnInic) {
        btnInic.disabled = false;
        btnInic.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Retomar Atendimento';
    }
    if(btnPaus) btnPaus.disabled = true;
    
    renderizarLinhaDoTempo(); 
    salvarDadosLocalStorage();
}

function finalizarCronometroAutomatico() {
    if (statusCronometro === 'finalizado') return;
    if (cronometroInterval) clearInterval(cronometroInterval);
    
    statusCronometro = 'finalizado';
    const total = formatarTempo(tempoSegundosAcumulados);
    historicoEventos.push({ evento: "Fim do Atendimento (Assinatura)", hora: obterHoraAtual(), tempoTotalFinal: total });

    const btnInic = document.getElementById('btnIniciar');
    const btnPaus = document.getElementById('btnPausar');

    if(btnInic) {
        btnInic.disabled = true;
        btnInic.innerHTML = '<i class="fa-solid fa-lock"></i> Serviço Encerrado';
    }
    if(btnPaus) btnPaus.disabled = true;

    renderizarLinhaDoTempo(); 
    salvarDadosLocalStorage();
    localStorage.setItem('marlift_tempo_faturamento_final', total);
}

function atualizarDisplayCronometro() { 
    const disp = document.getElementById('cronometroTempo');
    if(disp) disp.innerText = formatarTempo(tempoSegundosAcumulados); 
}

function formatarTempo(segs) {
    const h = Math.floor(segs / 3600).toString().padStart(2, '0');
    const m = Math.floor((segs % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(segs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function renderizarLinhaDoTempo() {
    const container = document.getElementById('historicoTempos');
    if (!container) return;
    container.innerHTML = '';
    
    if(historicoEventos.length === 0) { 
        container.innerHTML = '<span class="text-muted">Aguardando início do serviço...</span>'; 
        return; 
    }
    
    historicoEventos.forEach(item => {
        const div = document.createElement('div'); 
        div.style.borderBottom = '1px solid #333'; 
        div.style.padding = '3px 0';
        
        let compl = item.tempoParcial ? ` <span style="color:#ff6600;">(${item.tempoParcial})</span>` : '';
        if(item.tempoTotalFinal) compl = ` <span style="color:#ff6600; font-weight:bold;">[TOTAL: ${item.tempoTotalFinal}]</span>`;
        
        div.innerHTML = `⏱️ <strong>${item.hora}</strong> - <span style="color:#ccc;">${item.evento}</span>${compl}`;
        container.appendChild(div);
    });
}

// ==========================================
// 4. EVIDÊNCIAS FOTOGRÁFICAS
// ==========================================
function configurarEventosFotos() {
    const inpFotos = document.getElementById('inputFotos');
    if(!inpFotos) return;

    inpFotos.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(arquivo => {
            if (fotosArray.length >= 15) { alert('Limite máximo de 15 fotos atingido.'); return; }
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image(); 
                img.src = event.target.result;
                img.onload = () => {
                    const canvasOc = document.createElement('canvas'); 
                    const ctxOc = canvasOc.getContext('2d');
                    const max = 800; 
                    const escala = max / img.width;
                    
                    canvasOc.width = img.width > max ? max : img.width;
                    canvasOc.height = img.width > max ? img.height * escala : img.height;
                    
                    ctxOc.drawImage(img, 0, 0, canvasOc.width, canvasOc.height);
                    fotosArray.push(canvasOc.toDataURL('image/jpeg', 0.7));
                    atualizarGaleriaFotos();
                    
                    try { localStorage.setItem('marlift_os_fotos', JSON.stringify(fotosArray)); } catch(err) {}
                };
            };
            reader.readAsDataURL(arquivo);
        });
        e.target.value = '';
    });
}

function atualizarGaleriaFotos() {
    const cont = document.getElementById('fotoContador');
    if(cont) cont.innerText = fotosArray.length;
    
    const gal = document.getElementById('galeriaFotos'); 
    if (!gal) return;
    gal.innerHTML = '';
    
    fotosArray.forEach((foto, i) => {
        const div = document.createElement('div'); 
        div.className = 'foto-item'; 
        div.style.backgroundImage = `url(${foto})`;
        
        const btn = document.createElement('button'); 
        btn.className = 'btn-remove-foto'; 
        btn.innerHTML = '×';
        btn.onclick = () => { 
            fotosArray.splice(i, 1); 
            atualizarGaleriaFotos(); 
            localStorage.setItem('marlift_os_fotos', JSON.stringify(fotosArray)); 
        };
        
        div.appendChild(btn); 
        gal.appendChild(div);
    });
}

// ==========================================
// 5. CANVAS DA ASSINATURA DIGITAL
// ==========================================
function configurarCanvas() {
    if (!canvas) return;
    
    function redimensionar() {
        const rascunho = canvas.toDataURL();
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width || 320; 
        canvas.height = 160;
        ctx.strokeStyle = "#000000"; 
        ctx.lineWidth = 3; 
        ctx.lineCap = "round"; 
        ctx.lineJoin = "round";
        if (raschunho && rascunho.length > 100) { 
            const img = new Image(); 
            img.src = rascunho; 
            img.onload = () => ctx.drawImage(img, 0, 0); 
        }
    }
    redimensionar();
    
    const tracaPonto = (x, y) => { ctx.lineTo(x, y); ctx.stroke(); };
    const iniciaPonto = (x, y) => { desenhando = true; ctx.beginPath(); ctx.moveTo(x, y); };

    canvas.onmousedown = (e) => iniciaPonto(e.offsetX, e.offsetY);
    canvas.onmousemove = (e) => { if(desenhando) tracaPonto(e.offsetX, e.offsetY); };
    canvas.onmouseup = () => desenhando = false; 
    canvas.onmouseleave = () => desenhando = false;

    canvas.addEventListener('touchstart', (e) => { 
        e.preventDefault(); 
        const r = canvas.getBoundingClientRect(); 
        iniciaPonto(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); 
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => { 
        e.preventDefault(); 
        if(desenhando){ 
            const r = canvas.getBoundingClientRect(); 
            tracaPonto(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); 
        } 
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => desenhando = false);

    const btnLimp = document.getElementById('btnLimparAssinatura');
    if(btnLimp) btnLimp.onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const btnSalvAss = document.getElementById('btnSalvarAssinatura');
    if(btnSalvAss) {
        btnSalvAss.onclick = () => {
            finalizarCronometroAutomatico();
            assinaturaDataUrl = canvas.toDataURL();
            localStorage.setItem('marlift_os_assinatura', assinaturaDataUrl);
            exibirAssinaturaSalva(); 
            fecharModais(); 
            verificarLiberacaoBotoesFinais();
        };
    }
}

function exibirAssinaturaSalva() {
    const area = document.getElementById('areaAssinaturaSalva');
    if(area) area.innerHTML = `<img src="${assinaturaDataUrl}" style="max-height:100%; max-width:100%;">`;
}

// ==========================================
// 6. MODAIS E EMISSÃO DE PDF CORPORATIVO
// ==========================================
function configurarEventosModais() {
    const btnAbAs = document.getElementById('btnAbrirAssinatura');
    if(btnAbAs) {
        btnAbAs.onclick = () => { 
            document.getElementById('modalAssinatura').style.display = 'flex'; 
            configurarCanvas(); 
        };
    }
    
    const btnAbGer = document.getElementById('btnAbrirGerenciador');
    if(btnAbGer) {
        btnAbGer.onclick = () => {
            document.getElementById('modalGerenciador').style.display = 'flex';
        };
    }
    
    const btnFechGer = document.getElementById('btnFecharGerenciador');
    if(btnFechGer) btnFechGer.onclick = fecharModais;
    
    const motSel = document.getElementById('motivoPausaSelect');
    if(motSel) {
        motSel.addEventListener('change', (e) => {
            const cMot = document.getElementById('campoMotivoOutro');
            if(cMot) cMot.style.display = e.target.value === 'Outro' ? 'block' : 'none';
        });
    }
    
    const btnConfPau = document.getElementById('btnConfirmarPausa');
    if(btnConfPau && motSel) {
        btnConfPau.onclick = () => {
            let m = motSel.value; 
            if(m === 'Outro') m = document.getElementById('motivoPausaOutroInput').value || 'Não especificado';
            pausarCronometro(m); 
            fecharModais();
        };
    }
    
    window.onclick = (e) => { if(e.target.classList.contains('modal')) fecharModais(); };
}

function fecharModais() { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
}

function verificarLiberacaoBotoesFinais() {
    const btnPdf = document.getElementById('btnGerarPdf');
    if (!btnPdf) return;
    if (assinaturaDataUrl) {
        btnPdf.disabled = false;
    }
}

const btnGf = document.getElementById('btnGerarPdf');
if(btnGf) {
    btnGf.onclick = function() {
        const template = document.getElementById('pdfTemplate');
        const v = (id) => {
            const el = document.getElementById(id);
            return el ? (el.value || '---') : '---';
        };
        const hrFinal = localStorage.getItem('marlift_tempo_faturamento_final') || '00:00:00';

        let fotosHtml = fotosArray.length > 0 ? '<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:10px;">' : '<p style="color:#777; font-style:italic;">Sem registros fotográficos.</p>';
        if (fotosArray.length > 0) {
            fotosArray.forEach((f, i) => {
                fotosHtml += `
