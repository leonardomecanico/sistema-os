// ==========================================
// VARIÁVEIS GLOBAIS E ESTADOS
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
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarGerenciadorClientes();
    configurarEventosCronometro();
    configurarEventosFotos();
    configurarCanvas();
    configurarEventosModais();
    
    carregarDadosLocalStorage();
    
    const inputsForm = document.querySelectorAll('#osForm input, #osForm textarea, #osForm select');
    inputsForm.forEach(input => input.addEventListener('input', salvarDadosLocalStorage));
});

function obterHoraAtual() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ==========================================
// ==========================================
// 1. BANCO DE CLIENTES OFFLINE - CORRIGIDO
// ==========================================
function inicializarGerenciadorClientes() {
    // Carrega do LocalStorage garantindo que venha como um array limpo se não existir nada
    const clientesSalvos = localStorage.getItem('marlift_banco_clientes');
    if (clientesSalvos) {
        bancoClientes = JSON.parse(clientesSalvos);
    } else {
        bancoClientes = [];
    }

    // Alimenta o select logo que a página abre
    atualizarSelectClientes();

    // Evento de seleção do cliente no menu suspenso
    document.getElementById('buscaCliente').addEventListener('change', (e) => {
        const idSelected = e.target.value;
        if (!idSelected) return;
        
        const cli = bancoClientes.find(c => c.id === idSelected);
        if (cli) {
            document.getElementById('cliNome').value = cli.nome || '';
            document.getElementById('cliCnpj').value = cli.cnpj || '';
            document.getElementById('cliEndereco').value = cli.endereco || '';
            document.getElementById('cliContato').value = cli.contato || '';
            document.getElementById('cliEmail').value = cli.email || '';
            document.getElementById('cliTelefone').value = cli.telefone || '';
            document.getElementById('eqMarca').value = cli.marca || '';
            document.getElementById('eqModelo').value = cli.modelo || '';
            document.getElementById('eqCombustivel').value = cli.combustivel || '';
            document.getElementById('eqSerie').value = cli.serie || '';
            
            // Força salvar o rascunho da OS atual com os dados novos
            salvarDadosLocalStorage();
            alert(`Dados de ${cli.nome} carregados com sucesso!`);
        }
    });

    // CORREÇÃO CRÍTICA: Captura correta do clique do botão salvar
    const btnSalvar = document.getElementById('btnSalvarNovoCliente');
    if (btnSalvar) {
        btnSalvar.onclick = function() {
            const nome = document.getElementById('cadCliNome').value.trim();
            const endereco = document.getElementById('cadCliEndereco').value.trim();
            const marca = document.getElementById('cadEqMarca').value.trim();
            const modelo = document.getElementById('cadEqModelo').value.trim();
            const serie = document.getElementById('cadEqSerie').value.trim();

            // Validação de campos obrigatórios
            if (!nome || !endereco || !marca || !modelo || !serie) {
                alert("Por favor, preencha todos os campos obrigatórios marcados com (*)");
                return;
            }

            // Monta o objeto com os IDs corretos do HTML
            const novoCliente = {
                id: Date.now().toString(), // ID Único
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

            // Adiciona no array global
            bancoClientes.push(novoCliente);
            
            // Grava de forma definitiva no navegador
            localStorage.setItem('marlift_banco_clientes', JSON.stringify(bancoClientes));
            
            // Atualiza o menu de busca na tela de fundo
            atualizarSelectClientes();
            
            // Limpa o formulário do modal
            document.getElementById('cadClienteForm').reset();
            
            // Fecha o modal
            fecharModais();
            
            alert("Cliente e Equipamento salvos com sucesso na base offline!");
        };
    }
}
// ==========================================
// 2. CRONÔMETRO DE ATENDIMENTO E PERSISTÊNCIA
// ==========================================
function salvarDadosLocalStorage() {
    const dados = {};
    document.querySelectorAll('#osForm input, #osForm textarea, #osForm select').forEach(el => {
        if(el.id && el.id !== 'buscaCliente' && el.id !== 'inputFotos') dados[el.id] = el.value;
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
        statusCronometro = 'parado'; iniciarCronometro(); // Retoma automático
    } else if (statusCronometro === 'pausado') {
        btnIniciar.disabled = false; btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Retomar';
        btnPausar.disabled = true;
    } else if (statusCronometro === 'finalizado') {
        btnIniciar.disabled = true; btnIniciar.innerHTML = '<i class="fa-solid fa-lock"></i> Finalizado';
        btnPausar.disabled = true;
    }

    const fotosCache = localStorage.getItem('marlift_os_fotos');
    if (fotosCache) { fotosArray = JSON.parse(fotosCache); atualizarGaleriaFotos(); }
    
    const assCache = localStorage.getItem('marlift_os_assinatura');
    if (assCache) { assinaturaDataUrl = assCache; exibirAssinaturaSalva(); }
    
    verificarLiberacaoBotoesFinais();
}

function configurarEventosCronometro() {
    document.getElementById('btnIniciar').addEventListener('click', iniciarCronometro);
    document.getElementById('btnPausar').addEventListener('click', () => document.getElementById('modalPausa').style.display = 'flex');
    document.getElementById('btnGps').addEventListener('click', () => {
        const end = document.getElementById('cliEndereco').value;
        if(end) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank');
    });
}

function iniciarCronometro() {
    if (statusCronometro === 'rodando') return;
    const hora = obterHoraAtual();

    if (statusCronometro === 'parado') historicoEventos.push({ evento: "Início do Atendimento", hora });
    else if (statusCronometro === 'pausado') historicoEventos.push({ evento: "Retorno do Atendimento", hora });

    statusCronometro = 'rodando';
    document.getElementById('btnIniciar').disabled = true;
    document.getElementById('btnIniciar').innerHTML = '<i class="fa-solid fa-play"></i> Em Andamento';
    document.getElementById('btnPausar').disabled = false;

    cronometroInterval = setInterval(() => {
        tempoSegundosAcumulados++;
        atualizarDisplayCronometro();
        salvarDadosLocalStorage();
    }, 1000);
    renderizarLinhaDoTempo(); salvarDadosLocalStorage();
}

function pausarCronometro(motivo) {
    if (statusCronometro !== 'rodando') return;
    clearInterval(cronometroInterval);
    statusCronometro = 'pausado';
    historicoEventos.push({ evento: `Pausa (${motivo})`, hora: obterHoraAtual(), tempoParcial: formatarTempo(tempoSegundosAcumulados) });

    document.getElementById('btnIniciar').disabled = false;
    document.getElementById('btnIniciar').innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Retomar Atendimento';
    document.getElementById('btnPausar').disabled = true;
    renderizarLinhaDoTempo(); salvarDadosLocalStorage();
}

function finalizarCronometroAutomatico() {
    if (statusCronometro === 'finalizado') return;
    if (cronometroInterval) clearInterval(cronometroInterval);
    
    statusCronometro = 'finalizado';
    const total = formatarTempo(tempoSegundosAcumulados);
    historicoEventos.push({ evento: "Fim do Atendimento (Assinatura)", hora: obterHoraAtual(), tempoTotalFinal: total });

    document.getElementById('btnIniciar').disabled = true;
    document.getElementById('btnIniciar').innerHTML = '<i class="fa-solid fa-lock"></i> Serviço Encerrado';
    document.getElementById('btnPausar').disabled = true;

    renderizarLinhaDoTempo(); salvarDadosLocalStorage();
    localStorage.setItem('marlift_tempo_faturamento_final', total);
}

function atualizarDisplayCronometro() { document.getElementById('cronometroTempo').innerText = formatarTempo(tempoSegundosAcumulados); }
function formatarTempo(segs) {
    const h = Math.floor(segs / 3600).toString().padStart(2, '0');
    const m = Math.floor((segs % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(segs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function renderizarLinhaDoTempo() {
    const container = document.getElementById('historicoTempos');
    container.innerHTML = '';
    if(historicoEventos.length === 0) { container.innerHTML = '<span class="text-muted">Aguardando início...</span>'; return; }
    
    historicoEventos.forEach(item => {
        const div = document.createElement('div'); div.style.borderBottom = '1px solid #333'; div.style.marginBottom = '4px';
        let compl = item.tempoParcial ? ` <span style="color:var(--marlift-orange);">(${item.tempoParcial})</span>` : '';
        if(item.tempoTotalFinal) compl = ` <span style="color:#28a745; font-weight:bold;">[TOTAL: ${item.tempoTotalFinal}]</span>`;
        div.innerHTML = `⏱️ <strong>${item.hora}</strong> - ${item.evento}${compl}`;
        container.appendChild(div);
    });
}

// ==========================================
// 3. EVIDÊNCIAS FOTOGRÁFICAS E COMPRESSÃO
// ==========================================
function configurarEventosFotos() {
    document.getElementById('inputFotos').addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(arquivo => {
            if (fotosArray.length >= 15) { alert('Limite de 15 fotos.'); return; }
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image(); img.src = event.target.result;
                img.onload = () => {
                    const canvasOc = document.createElement('canvas'); const ctxOc = canvasOc.getContext('2d');
                    const max = 800; const escala = max / img.width;
                    canvasOc.width = img.width > max ? max : img.width;
                    canvasOc.height = img.width > max ? img.height * escala : img.height;
                    ctxOc.drawImage(img, 0, 0, canvasOc.width, canvasOc.height);
                    fotosArray.push(canvasOc.toDataURL('image/jpeg', 0.7));
                    atualizarGaleriaFotos();
                    try { localStorage.setItem('marlift_os_fotos', JSON.stringify(fotosArray)); } catch(e) {}
                };
            };
            reader.readAsDataURL(arquivo);
        });
        e.target.value = '';
    });
}

function atualizarGaleriaFotos() {
    document.getElementById('fotoContador').innerText = fotosArray.length;
    const gal = document.getElementById('galeriaFotos'); gal.innerHTML = '';
    fotosArray.forEach((foto, i) => {
        const div = document.createElement('div'); div.className = 'foto-item'; div.style.backgroundImage = `url(${foto})`;
        const btn = document.createElement('button'); btn.className = 'btn-remove-foto'; btn.innerHTML = '&times;';
        btn.onclick = () => { fotosArray.splice(i, 1); atualizarGaleriaFotos(); localStorage.setItem('marlift_os_fotos', JSON.stringify(fotosArray)); };
        div.appendChild(btn); gal.appendChild(div);
    });
}

// ==========================================
// 4. ASSINATURA TOUCH/MOUSE
// ==========================================
function configurarCanvas() {
    if (!canvas) return;
    function redimensionar() {
        const rascunho = canvas.toDataURL();
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width || 320; canvas.height = 160;
        ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
        if (rascunho.length > 100) { const img = new Image(); img.src = rascunho; img.onload = () => ctx.drawImage(img, 0, 0); }
    }
    redimensionar();
    
    const tracaPonto = (x, y) => { ctx.lineTo(x, y); ctx.stroke(); };
    const iniciaPonto = (x, y) => { desenhando = true; ctx.beginPath(); ctx.moveTo(x, y); };

    canvas.onmousedown = (e) => iniciaPonto(e.offsetX, e.offsetY);
    canvas.onmousemove = (e) => { if(desenhando) tracaPonto(e.offsetX, e.offsetY); };
    canvas.onmouseup = () => desenhando = false; canvas.onmouseleave = () => desenhando = false;

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const r = canvas.getBoundingClientRect(); iniciaPonto(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if(desenhando){ const r = canvas.getBoundingClientRect(); tracaPonto(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); } }, { passive: false });
    canvas.addEventListener('touchend', () => desenhando = false);

    document.getElementById('btnLimparAssinatura').addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    document.getElementById('btnSalvarAssinatura').addEventListener('click', () => {
        finalizarCronometroAutomatico();
        assinaturaDataUrl = canvas.toDataURL();
        localStorage.setItem('marlift_os_assinatura', assinaturaDataUrl);
        exibirAssinaturaSalva(); fecharModais(); verificarLiberacaoBotoesFinais();
    });
}

function exibirAssinaturaSalva() {
    document.getElementById('areaAssinaturaSalva').innerHTML = `<img src="${assinaturaDataUrl}" style="max-height:100%; max-width:100%;">`;
}

// ==========================================
// 5. CONTROLE DE MODAIS E PDF
// ==========================================
function configurarEventosModais() {
    document.getElementById('btnAbrirAssinatura').addEventListener('click', () => { document.getElementById('modalAssinatura').style.display = 'flex'; configurarCanvas(); });
    document.getElementById('btnAbrirGerenciador').addEventListener('click', () => document.getElementById('modalGerenciador').style.display = 'flex');
    document.getElementById('btnFecharGerenciador').addEventListener('click', fecharModais);
    
    const motSel = document.getElementById('motivoPausaSelect');
    motSel.addEventListener('change', (e) => document.getElementById('campoMotivoOutro').style.display = e.target.value === 'Outro' ? 'block' : 'none');
    document.getElementById('btnConfirmarPausa').addEventListener('click', () => {
        let m = motSel.value; if(m === 'Outro') m = document.getElementById('motivoPausaOutroInput').value || 'Não especificado';
        pausarCronometro(m); fecharModais();
    });
    
    window.addEventListener('click', (e) => { if(e.target.classList.contains('modal')) fecharModais(); });
}

function fecharModais() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

function verificarLiberacaoBotoesFinais() {
    const btnPdf = document.getElementById('btnGerarPdf');
    if (assinaturaDataUrl) {
        btnPdf.disabled = false; btnPdf.style.backgroundColor = '#ff6600'; btnPdf.style.borderColor = '#ff6600';
    }
}

document.getElementById('btnGerarPdf').addEventListener('click', () => {
    const template = document.getElementById('pdfTemplate');
    const v = (id) => document.getElementById(id).value || '---';
    const hrFinal = localStorage.getItem('marlift_tempo_faturamento_final') || '00:00:00';

    let fotosHtml = fotosArray.length > 0 ? '<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:10px;">' : '<p>Sem fotos.</p>';
    if (fotosArray.length > 0) fotosArray.forEach((f, i) => fotosHtml += `<div style="text-align:center;"><img src="${f}" style="width:100%; height:120px; object-fit:cover;"><small>Foto ${i+1}</small></div>`);
    if (fotosArray.length > 0) fotosHtml += '</div>';

    template.innerHTML = `
        <div style="padding: 25px; font-family: Arial, sans-serif; color: #333; line-height: 1.4; background: #fff;">
            <div style="border-bottom: 3px solid #ff6600; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between;">
                <div><h1 style="margin: 0; color: #ff6600; font-size: 26px;">MARLIFT</h1><span style="font-size: 11px;">MANUTENÇÃO DE EMPILHADEIRAS</span></div>
                <div style="text-align: right;"><h3 style="margin: 0; font-size: 16px;">ORDEM DE SERVIÇO</h3><small>Emissão: ${new Date().toLocaleDateString('pt-BR')}</small></div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                <tr style="background: #f2f2f2;"><td colspan="4" style="padding: 6px; font-weight: bold; border: 1px solid #ddd; color:#ff6600;">1. CLIENTE</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Empresa:</strong></td><td colspan="3" style="padding: 5px; border: 1px solid #ddd;">${v('cliNome')}</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>CNPJ:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${v('cliCnpj')}</td><td style="padding: 5px; border: 1px solid #ddd;"><strong>Contato:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${v('cliContato')}</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Endereço:</strong></td><td colspan="3" style="padding: 5px; border: 1px solid #ddd;">${v('cliEndereco')}</td></tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                <tr style="background: #f2f2f2;"><td colspan="4" style="padding: 6px; font-weight: bold; border: 1px solid #ddd; color:#ff6600;">2. EQUIPAMENTO E CHAMADO</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Máquina:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${v('eqMarca')} - ${v('eqModelo')} (${v('eqCombustivel')})</td><td style="padding: 5px; border: 1px solid #ddd;"><strong>Série:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${v('eqSerie')}</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Tipo:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${v('tipoChamado')}</td><td style="padding: 5px; border: 1px solid #ddd;"><strong>Tempo:</strong></td><td style="padding: 5px; border: 1px solid #ddd; color: #28a745; font-weight: bold;">${hrFinal}</td></tr>
            </table>

            <div style="margin-bottom: 12px; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0;">3. DEFEITO RECLAMADO</h4><p style="background: #fafafa; padding: 6px; border: 1px solid #eee; margin: 0;">${v('defeitoApresentado')}</p></div>
            <div style="margin-bottom: 12px; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0;">4. SERVIÇOS EXECUTADOS</h4><p style="background: #fafafa; padding: 6px; border: 1px solid #eee; margin: 0; white-space: pre-wrap;">${v('servicoExecutado')}</p></div>
            <div style="margin-bottom: 12px; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0;">5. PEÇAS APLICADAS</h4><p style="background: #fafafa; padding: 6px; border: 1px solid #eee; margin: 0; white-space: pre-wrap;">${v('pecasAplicadas') || 'Nenhuma'}</p></div>
            
            <div style="margin-bottom: 25px; page-break-inside: avoid; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0;">6. FOTOS</h4>${fotosHtml}</div>

            <div style="margin-top: 35px; page-break-inside: avoid; text-align: center; font-size: 12px;">
                <p>Declaro a execução técnica dos serviços acima:</p>
                <div style="border-bottom: 1px solid #333; width: 250px; margin: 5px auto; height: 55px; display: flex; justify-content: center; align-items: center;"><img src="${assinaturaDataUrl}" style="max-height: 50px;"></div>
                <small style="font-weight: bold;">Assinatura do Cliente</small>
            </div>
        </div>`;

    html2pdf().set({
        margin: 8, filename: `OS_MARLIFT_${v('cliNome').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(template).save().then(() => {
        if (confirm("Gerado! Deseja limpar para uma nova OS?")) {
            ['marlift_os_sessao', 'marlift_os_fotos', 'marlift_os_assinatura', 'marlift_tempo_faturamento_final'].forEach(k => localStorage.removeItem(k));
            window.location.reload();
        }
    });
});
