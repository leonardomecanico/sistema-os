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
// INICIALIZAÇÃO DO SISTEMA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarGerenciadorClientes();
    configurarEventosCronometro();
    configurarEventosFotos();
    configurarCanvas();
    configurarEventosModais();
    
    carregarDadosLocalStorage();
    
    // Captura digitação para salvar rascunho automático da OS
    const inputsForm = document.querySelectorAll('#osForm input, #osForm textarea, #osForm select');
    inputsForm.forEach(input => input.addEventListener('input', salvarDadosLocalStorage));
});

function obterHoraAtual() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ==========================================
// 1. BANCO DE CLIENTES OFFLINE (CORRIGIDO)
// ==========================================
function inicializarGerenciadorClientes() {
    const clientesSalvos = localStorage.getItem('marlift_banco_clientes');
    if (clientesSalvos) {
        bancoClientes = JSON.parse(clientesSalvos);
    } else {
        bancoClientes = [];
    }

    atualizarSelectClientes();

    // Evento de seleção do cliente cadastrado
    document.getElementById('buscaCliente').addEventListener('change', (e) => {
        const id = e.target.value;
        if (!id) return;
        
        const cli = bancoClientes.find(c => c.id === id);
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
            
            salvarDadosLocalStorage();
            alert(`Dados de ${cli.nome} carregados com sucesso!`);
        }
    });

    // Ação do Botão Salvar do Modal de Cadastro
    const btnSalvar = document.getElementById('btnSalvarNovoCliente');
    if (btnSalvar) {
        btnSalvar.onclick = function() {
            const nome = document.getElementById('cadCliNome').value.trim();
            const endereco = document.getElementById('cadCliEndereco').value.trim();
            const marca = document.getElementById('cadEqMarca').value.trim();
            const modelo = document.getElementById('cadEqModelo').value.trim();
            const serie = document.getElementById('cadEqSerie').value.trim();

            if (!nome || !endereco || !marca || !modelo || !serie) {
                alert("Por favor, preencha todos os campos obrigatórios marcados com (*)");
                return;
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
            document.getElementById('cadClienteForm').reset();
            fecharModais();
            
            alert("Cliente e Equipamento cadastrados com sucesso!");
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
        btnIniciar.disabled = false; 
        btnIniciar.innerHTML = '<i class="fa-solid fa-play"></i> Retomar Atendimento';
        btnPausar.disabled = true;
    } else if (statusCronometro === 'finalizado') {
        btnIniciar.disabled = true; 
        btnIniciar.innerHTML = '<i class="fa-solid fa-lock"></i> Serviço Encerrado';
        btnPausar.disabled = true;
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
// 3. EVENTOS DO CRONÔMETRO
// ==========================================
function configurarEventosCronometro() {
    document.getElementById('btnIniciar').addEventListener('click', iniciarCronometro);
    document.getElementById('btnPausar').addEventListener('click', () => {
        document.getElementById('modalPausa').style.display = 'flex';
    });
    
    // CORRIGIDO: Rota corrigida com sintaxe limpa
    document.getElementById('btnGps').addEventListener('click', () => {
        const end = document.getElementById('cliEndereco').value;
        if(end) {
            window.open('https://maps.google.com/?q=' + encodeURIComponent(end), '_blank');
        } else {
            alert("Digite ou selecione um cliente com endereço para gerar a rota.");
        }
    });
}

function iniciarCronometro() {
    if (statusCronometro === 'rodando') return;
    const hora = obterHoraAtual();

    if (statusCronometro === 'parado') historicoEventos.push({ evento: "Início do Atendimento", hora });
    else if (statusCronometro === 'pausado') historicoEventos.push({ evento: "Retorno do Atendimento", hora });

    statusCronometro = 'rodando';
    document.getElementById('btnIniciar').disabled = true;
    document.getElementById('btnIniciar').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Em Andamento';
    document.getElementById('btnPausar').disabled = false;

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

    document.getElementById('btnIniciar').disabled = false;
    document.getElementById('btnIniciar').innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Retomar Atendimento';
    document.getElementById('btnPausar').disabled = true;
    
    renderizarLinhaDoTempo(); 
    salvarDadosLocalStorage();
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

    renderizarLinhaDoTempo(); 
    salvarDadosLocalStorage();
    localStorage.setItem('marlift_tempo_faturamento_final', total);
}

function atualizarDisplayCronometro() { 
    document.getElementById('cronometroTempo').innerText = formatarTempo(tempoSegundosAcumulados); 
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
        container.innerHTML = '<span class="text-muted">Aguardando início...</span>'; 
        return; 
    }
    
    historicoEventos.forEach(item => {
        const div = document.createElement('div'); 
        div.style.borderBottom = '1px solid #333'; 
        div.style.padding = '3px 0';
        
        let compl = item.tempoParcial ? ` <span style="color:var(--marlift-orange);">(${item.tempoParcial})</span>` : '';
        if(item.tempoTotalFinal) compl = ` <span style="color:#28a745; font-weight:bold;">[TOTAL: ${item.tempoTotalFinal}]</span>`;
        
        div.innerHTML = `⏱️ <strong>${item.hora}</strong> - <span style="color:#ccc;">${item.evento}</span>${compl}`;
        container.appendChild(div);
    });
}

// ==========================================
// 4. EVIDÊNCIAS FOTOGRÁFICAS
// ==========================================
function configurarEventosFotos() {
    document.getElementById('inputFotos').addEventListener('change', (e) => {
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
    document.getElementById('fotoContador').innerText = fotosArray.length;
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
        if (rascunho.length > 100) { 
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

    document.getElementById('btnLimparAssinatura').onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    document.getElementById('btnSalvarAssinatura').onclick = () => {
        finalizarCronometroAutomatico();
        assinaturaDataUrl = canvas.toDataURL();
        localStorage.setItem('marlift_os_assinatura', assinaturaDataUrl);
        exibirAssinaturaSalva(); 
        fecharModais(); 
        verificarLiberacaoBotoesFinais();
    };
}

function exibirAssinaturaSalva() {
    document.getElementById('areaAssinaturaSalva').innerHTML = `<img src="${assinaturaDataUrl}" style="max-height:100%; max-width:100%;">`;
}

// ==========================================
// 6. MODAIS E EMISSÃO DE PDF CORPORATIVO
// ==========================================
function configurarEventosModais() {
    document.getElementById('btnAbrirAssinatura').onclick = () => { 
        document.getElementById('modalAssinatura').style.display = 'flex'; 
        configurarCanvas(); 
    };
    document.getElementById('btnAbrirGerenciador').onclick = () => {
        document.getElementById('modalGerenciador').style.display = 'flex';
    };
    document.getElementById('btnFecharGerenciador').onclick = fecharModais;
    
    const motSel = document.getElementById('motivoPausaSelect');
    motSel.addEventListener('change', (e) => {
        document.getElementById('campoMotivoOutro').style.display = e.target.value === 'Outro' ? 'block' : 'none';
    });
    
    document.getElementById('btnConfirmarPausa').onclick = () => {
        let m = motSel.value; 
        if(m === 'Outro') m = document.getElementById('motivoPausaOutroInput').value || 'Não especificado';
        pausarCronometro(m); 
        fecharModais();
    };
    
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

document.getElementById('btnGerarPdf').onclick = function() {
    const template = document.getElementById('pdfTemplate');
    const v = (id) => document.getElementById(id).value || '---';
    const hrFinal = localStorage.getItem('marlift_tempo_faturamento_final') || '00:00:00';

    let fotosHtml = fotosArray.length > 0 ? '<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:10px;">' : '<p style="color:#777; font-style:italic;">Sem registros fotográficos.</p>';
    if (fotosArray.length > 0) {
        fotosArray.forEach((f, i) => {
            fotosHtml += `<div style="text-align:center; border:1px solid #ddd; padding:2px; background:#fff;"><img src="${f}" style="width:100%; height:110px; object-fit:cover;"><small style="font-size:10px; color:#555;">Foto ${i+1}</small></div>`;
        });
        fotosHtml += '</div>';
    }

    template.innerHTML = `
        <div style="padding: 25px; font-family: Arial, sans-serif; color: #222; line-height: 1.4; background: #fff;">
            <div style="border-bottom: 3px solid #ff6600; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items:center;">
                <div><h1 style="margin: 0; color: #ff6600; font-size: 26px; font-weight:bold;">MARLIFT</h1><span style="font-size: 10px; font-weight:bold; color:#444;">MANUTENÇÃO DE EMPILHADEIRAS</span></div>
                <div style="text-align: right;"><h3 style="margin: 0; font-size: 15px; color:#222;">RELATÓRIO TÉCNICO DE OS</h3><small>Data: ${new Date().toLocaleDateString('pt-BR')}</small></div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                <tr style="background: #2b2b2b; color:#fff;"><td colspan="4" style="padding: 6px; font-weight: bold; border: 1px solid #2b2b2b;">1. INFORMAÇÕES DO CLIENTE</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd; width:18%;"><strong>Empresa:</strong></td><td colspan="3" style="padding: 5px; border: 1px solid #ddd;">${v('cliNome')}</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>CNPJ:</strong></td><td style="padding: 5px; border: 1px solid #ddd; width:32%;">${v('cliCnpj')}</td><td style="padding: 5px; border: 1px solid #ddd; width:15%;"><strong>Contato:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${v('cliContato')}</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Endereço:</strong></td><td colspan="3" style="padding: 5px; border: 1px solid #ddd;">${v('cliEndereco')}</td></tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                <tr style="background: #2b2b2b; color:#fff;"><td colspan="4" style="padding: 6px; font-weight: bold; border: 1px solid #2b2b2b;">2. IDENTIFICAÇÃO DO EQUIPAMENTO</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd; width:18%;"><strong>Máquina:</strong></td><td style="padding: 5px; border: 1px solid #ddd; width:32%;">${v('eqMarca')} - ${v('eqModelo')}</td><td style="padding: 5px; border: 1px solid #ddd; width:15%;"><strong>Combustível:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${v('eqCombustivel')}</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Nº Série:</strong></td><td style="padding: 5px; border: 1px solid #ddd;">${v('eqSerie')}</td><td style="padding: 5px; border: 1px solid #ddd;"><strong>Tempo Técnico:</strong></td><td style="padding: 5px; border: 1px solid #ddd; color: #ff6600; font-weight: bold;">${hrFinal}</td></tr>
                <tr><td style="padding: 5px; border: 1px solid #ddd;"><strong>Tipo Chamado:</strong></td><td colspan="3" style="padding: 5px; border: 1px solid #ddd;">${v('tipoChamado')}</td></tr>
            </table>

            <div style="margin-bottom: 12px; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0; font-size:11px;">3. DEFEITO APRESENTADO</h4><p style="background: #fafafa; padding: 6px; border: 1px solid #eee; margin: 0;">${v('defeitoApresentado')}</p></div>
            <div style="margin-bottom: 12px; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0; font-size:11px;">4. SERVIÇOS EXECUTADOS</h4><p style="background: #fafafa; padding: 6px; border: 1px solid #eee; margin: 0; white-space: pre-wrap;">${v('servicoExecutado')}</p></div>
            <div style="margin-bottom: 12px; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0; font-size:11px;">5. PEÇAS E MATERIAIS APLICADOS</h4><p style="background: #fafafa; padding: 6px; border: 1px solid #eee; margin: 0; white-space: pre-wrap;">${v('pecasAplicadas')}</p></div>
            <div style="margin-bottom: 12px; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0; font-size:11px;">6. OBSERVAÇÕES ADICIONAIS</h4><p style="background: #fafafa; padding: 6px; border: 1px solid #eee; margin: 0; white-space: pre-wrap;">${v('obsGerais')}</p></div>
            
            <div style="margin-bottom: 25px; page-break-inside: avoid; font-size: 12px;"><h4 style="border-bottom: 1px solid #ff6600; color:#ff6600; margin: 0 0 4px 0; font-size:11px;">7. EVIDÊNCIAS FOTOGRÁFICAS</h4>${fotosHtml}</div>

            <div style="margin-top: 35px; page-break-inside: avoid; text-align: center; font-size: 12px;">
                <p>Declaro a execução técnica e conformidade dos serviços descritos acima:</p>
                <div style="border-bottom: 1px solid #333; width: 250px; margin: 5px auto; height: 55px; display: flex; justify-content: center; align-items: center;"><img src="${assinaturaDataUrl}" style="max-height: 50px;"></div>
                <small style="font-weight: bold; color:#444;">Assinatura do Representante do Cliente</small>
            </div>
        </div>`;

    html2pdf().set({
        margin: 8, 
        filename: `OS_MARLIFT_${v('cliNome').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.95 }, 
        html2canvas: { scale: 2, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(template).save().then(() => {
        if (confirm("Ordem de Serviço salva! Deseja limpar os campos para a próxima OS?")) {
            ['marlift_os_sessao', 'marlift_os_fotos', 'marlift_os_assinatura', 'marlift_tempo_faturamento_final'].forEach(k => localStorage.removeItem(k));
            window.location.reload();
        }
    });
};
