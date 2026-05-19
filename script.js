// ==========================================
// VARIÁVEIS GLOBAIS E ESTADOS
// ==========================================
let cronometroInterval = null;
let tempoSegundos = 0;
let statusCronometro = 'parado'; // parado, rodando, pausado
let historicoPausas = [];
let fotosArray = [];
let assinaturaDataUrl = null;

// Elementos da Assinatura (Canvas)
const canvas = document.getElementById('canvasAssinatura');
const ctx = canvas ? canvas.getContext('2d') : null;
let desenhando = false;

// ==========================================
// INICIALIZAÇÃO DO SISTEMA (DOM Content Loaded)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    configurarCanvas();
    configurarEventosCronometro();
    configurarEventosFotos();
    configurarEventosModais();
    
    // Recuperar dados salvos no LocalStorage para não perder nada ao atualizar
    carregarDadosLocalStorage();
    
    // Monitorar mudanças nos campos de texto para salvar automaticamente
    const inputsForm = document.querySelectorAll('#osForm input, #osForm textarea, #osForm select');
    inputsForm.forEach(input => {
        input.addEventListener('input', salvarDadosLocalStorage);
    });
});

// ==========================================
// 1. PERSISTÊNCIA DE DADOS (LOCAL STORAGE)
// ==========================================
function salvarDadosLocalStorage() {
    const dadosOS = {
        // Dados do Cliente
        cliNome: document.getElementById('cliNome').value,
        cliCnpj: document.getElementById('cliCnpj').value,
        cliEndereco: document.getElementById('cliEndereco').value,
        cliContato: document.getElementById('cliContato').value,
        cliEmail: document.getElementById('cliEmail').value,
        cliTelefone: document.getElementById('cliTelefone').value,
        // Dados do Equipamento
        eqMarca: document.getElementById('eqMarca').value,
        eqModelo: document.getElementById('eqModelo').value,
        eqCombustivel: document.getElementById('eqCombustivel').value,
        eqSerie: document.getElementById('eqSerie').value,
        // Triagem
        tipoChamado: document.getElementById('tipoChamado').value,
        defeitoApresentado: document.getElementById('defeitoApresentado').value,
        // Relatório Técnico
        servicoExecutado: document.getElementById('servicoExecutado').value,
        pecasAplicadas: document.getElementById('pecasAplicadas').value,
        obsGerais: document.getElementById('obsGerais').value,
        // Estados do App
        tempoSegundos: tempoSegundos,
        statusCronometro: statusCronometro,
        historicoPausas: historicoPausas
    };
    localStorage.setItem('marlift_os_dados', JSON.stringify(dadosOS));
}

function carregarDadosLocalStorage() {
    const dadosSalvos = localStorage.getItem('marlift_os_dados');
    if (!dadosSalvos) return;

    const dados = JSON.parse(dadosSalvos);

    // Preencher campos de texto e selects
    Object.keys(dados).forEach(key => {
        const elemento = document.getElementById(key);
        if (elemento && key !== 'tempoSegundos' && key !== 'statusCronometro' && key !== 'historicoPausas') {
            elemento.value = dados[key];
        }
    });

    // Recuperar estado do cronômetro
    tempoSegundos = dados.tempoSegundos || 0;
    historicoPausas = dados.historicoPausas || [];
    statusCronometro = dados.statusCronometro || 'parado';

    atualizarDisplayCronometro();
    renderizarHistoricoPausas();

    if (statusCronometro === 'rodando') {
        // Se fechou rodando, reinicia o timer automaticamente
        statusCronometro = 'parado'; 
        iniciarCronometro();
    } else if (statusCronometro === 'pausado') {
        document.getElementById('btnIniciar').disabled = false;
        document.getElementById('btnIniciar').innerHTML = '<i class="fa-solid fa-play"></i> Retomar';
        document.getElementById('btnPausar').disabled = true;
    }
    
    // Recuperar Fotos e Assinatura se existirem no cache
    const fotosCache = localStorage.getItem('marlift_os_fotos');
    if (fotosCache) {
        fotosArray = JSON.parse(fotosCache);
        atualizarGaleriaFotos();
    }
    
    const assinaturaCache = localStorage.getItem('marlift_os_assinatura');
    if (assinaturaCache) {
        assinaturaDataUrl = assinaturaCache;
        exibirAssinaturaSalva();
    }
    
    verificarLiberacaoBotoesFinais();
}

function limparLocalStorageFinalizado() {
    localStorage.removeItem('marlift_os_dados');
    localStorage.removeItem('marlift_os_fotos');
    localStorage.removeItem('marlift_os_assinatura');
}

// ==========================================
// 2. CRONÔMETRO DE ATENDIMENTO
// ==========================================
function configurarEventosCronometro() {
    document.getElementById('btnIniciar').addEventListener('click', iniciarCronometro);
    document.getElementById('btnPausar').addEventListener('click', abrirModalPausa);
    
    // Evento do botão de GPS integrado para ajudar na rota do técnico
    document.getElementById('btnGps').addEventListener('click', () => {
        const endereco = document.getElementById('cliEndereco').value;
        if(endereco) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`, '_blank');
        } else {
            alert('Por favor, digite o endereço primeiro.');
        }
    });
}

function iniciarCronometro() {
    if (statusCronometro === 'rodando') return;

    statusCronometro = 'rodando';
    document.getElementById('btnIniciar').disabled = true;
    document.getElementById('btnPausar').disabled = false;
    document.getElementById('btnFinalizarOS').disabled = false;

    cronometroInterval = setInterval(() => {
        tempoSegundos++;
        atualizarDisplayCronometro();
        salvarDadosLocalStorage();
    }, 1000);
}

function pausarCronometro(motivo) {
    if (statusCronometro !== 'rodando') return;

    clearInterval(cronometroInterval);
    statusCronometro = 'pausado';

    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    historicoPausas.push({ motivo: motivo, hora: agora, tempoAtual: formatarTempo(tempoSegundos) });

    document.getElementById('btnIniciar').disabled = false;
    document.getElementById('btnIniciar').innerHTML = '<i class="fa-solid fa-play"></i> Retomar';
    document.getElementById('btnPausar').disabled = true;

    renderizarHistoricoPausas();
    salvarDadosLocalStorage();
}

function atualizarDisplayCronometro() {
    document.getElementById('cronometroTempo').innerText = formatarTempo(tempoSegundos);
}

function formatarTempo(segundosTotais) {
    const hrs = Math.floor(segundosTotais / 3600).toString().padStart(2, '0');
    const mins = Math.floor((segundosTotais % 3600) / 60).toString().padStart(2, '0');
    const segs = Math.floor(segundosTotais % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${segs}`;
}

function renderizarHistoricoPausas() {
    const container = document.getElementById('historicoTempos');
    container.innerHTML = '';
    historicoPausas.forEach(pausa => {
        const item = document.createElement('div');
        item.className = 'historico-item';
        item.innerHTML = `<small>⏸️ Pausa às ${pausa.hora} - Motivo: <strong>${pausa.motivo}</strong> (Tempo total acumulado: ${pausa.tempoAtual})</small>`;
        container.appendChild(item);
    });
}

// ==========================================
// 3. EVIDÊNCIAS FOTOGRÁFICAS (CÂMERA NO MOBILE)
// ==========================================
function configurarEventosFotos() {
    const inputFotos = document.getElementById('inputFotos');
    inputFotos.addEventListener('change', (e) => {
        const arquivos = Array.from(e.target.files);
        
        arquivos.forEach(arquivo => {
            if (fotosArray.length >= 15) {
                alert('Limite máximo de 15 fotos atingido.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                // Comprimir levemente a imagem ou salvar o base64 direto
                fotosArray.push(event.target.result);
                localStorage.setItem('marlift_os_fotos', JSON.stringify(fotosArray));
                atualizarGaleriaFotos();
            };
            reader.readAsDataURL(arquivo);
        });
    });
}

function atualizarGaleriaFotos() {
    const galeria = document.getElementById('galeriaFotos');
    document.getElementById('fotoContador').innerText = fotosArray.length;
    galeria.innerHTML = '';

    fotosArray.forEach((fotoBase64, index) => {
        const item = document.createElement('div');
        item.className = 'foto-item';
        item.style.position = 'relative';
        item.innerHTML = `
            <img src="${fotoBase64}" alt="Evidência ${index + 1}">
            <button type="button" class="btn-remove-foto" onclick="removerFoto(${index})" style="position:absolute; top:2px; right:2px; background:rgba(255,0,0,0.8); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;">X</button>
        `;
        galeria.appendChild(item);
    });
}

window.removerFoto = function(index) {
    fotosArray.splice(index, 1);
    localStorage.setItem('marlift_os_fotos', JSON.stringify(fotosArray));
    atualizarGaleriaFotos();
};

// ==========================================
// 4. PAINEL DE ASSINATURA DIGITAL (TELA TOUCH CORRIGIDA)
// ==========================================
function configurarCanvas() {
    if (!canvas) return;

    // Ajusta o tamanho real do desenho conforme o tamanho visual do container mobile
    function redimensionarCanvas() {
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width || 300;
        canvas.height = 150;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
    }
    
    window.addEventListener('resize', redimensionarCanvas);
    setTimeout(redimensionarCanvas, 300); // Aguarda renderizar o layout

    // --- Eventos de Mouse (Computador) ---
    canvas.addEventListener('mousedown', (e) => {
        desenhando = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!desenhando) return;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    });
    canvas.addEventListener('mouseup', () => desenhando = false);
    canvas.addEventListener('mouseleave', () => desenhando = false);

    // --- Eventos de Toque (Celular/Tablet) - CRÍTICO PARA FUNCIONAR NO MOBILE ---
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const toque = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        desenhando = true;
        ctx.beginPath();
        ctx.moveTo(toque.clientX - rect.left, toque.clientY - rect.top);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!desenhando) return;
        const toque = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(toque.clientX - rect.left, toque.clientY - rect.top);
        ctx.stroke();
    }, { passive: false });

    canvas.addEventListener('touchend', () => desenhando = false);

    // Botões do Modal da Assinatura
    document.getElementById('btnLimparAssinatura').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    document.getElementById('btnSalvarAssinatura').addEventListener('click', () => {
        // Verifica se o canvas não está em branco salvando em string base64
        assinaturaDataUrl = canvas.toDataURL();
        localStorage.setItem('marlift_os_assinatura', assinaturaDataUrl);
        exibirAssinaturaSalva();
        fecharModais();
        verificarLiberacaoBotoesFinais();
    });
}

function exibirAssinaturaSalva() {
    const box = document.getElementById('areaAssinaturaSalva');
    box.innerHTML = `<img src="${assinaturaDataUrl}" alt="Assinatura do Cliente" style="max-height:100%; max-width:100%;">`;
}

// ==========================================
// 5. CONTROLE DE MODAIS (POP-UPS)
// ==========================================
function configurarEventosModais() {
    const modalAssinatura = document.getElementById('modalAssinatura');
    const modalPausa = document.getElementById('modalPausa');
    const motivoSelect = document.getElementById('motivoPausaSelect');
    const campoOutro = document.getElementById('campoMotivoOutro');

    document.getElementById('btnAbrirAssinatura').addEventListener('click', () => {
        modalAssinatura.style.display = 'flex';
        setTimeout(configurarCanvas, 100); // Força o ajuste do tamanho ao abrir
    });

    motivoSelect.addEventListener('change', (e) => {
        campoOutro.style.display = e.target.value === 'Outro' ? 'block' : 'none';
    });

    document.getElementById('btnConfirmarPausa').addEventListener('click', () => {
        let motivo = motivoSelect.value;
        if (motivo === 'Outro') {
            motivo = document.getElementById('motivoPausaOutroInput').value || 'Outro motivo não especificado';
        }
        pausarCronometro(motivo);
        fecharModais();
    });

    // Fechar modais ao clicar fora deles
    window.addEventListener('click', (e) => {
        if (e.target === modalAssinatura || e.target === modalPausa) {
            fecharModais();
        }
    });
}

function abrirModalPausa() {
    document.getElementById('modalPausa').style.display = 'flex';
}

function fecharModais() {
    document.getElementById('modalAssinatura').style.display = 'none';
    document.getElementById('modalPausa').style.display = 'none';
}

// ==========================================
// 6. ENCERRAMENTO E VALIDAÇÕES FINAIS
// ==========================================
function verificarLiberacaoBotoesFinais() {
    if (statusCronometro === 'rodando' || statusCronometro === 'pausado') {
        document.getElementById('btnFinalizarOS').disabled = false;
    }
    
    // Libera o botão de gerar PDF se houver uma assinatura salva e a OS finalizada
    if (assinaturaDataUrl) {
        document.getElementById('btnGerarPdf').disabled = false;
    }
}

document.getElementById('btnFinalizarOS').addEventListener('click', () => {
    if (statusCronometro === 'rodando') {
        clearInterval(cronometroInterval);
        statusCronometro = 'finalizado';
    }
    
    document.getElementById('btnIniciar').disabled = true;
    document.getElementById('btnPausar').disabled = true;
    document.getElementById('btnFinalizarOS').innerHTML = '<i class="fa-solid fa-lock"></i> OS Finalizada';
    document.getElementById('btnFinalizarOS').style.backgroundColor = '#28a745';
    
    salvarDadosLocalStorage();
    verificarLiberacaoBotoesFinais();
    alert('Ordem de Serviço congelada com sucesso. Preencha a assinatura para exportar o relatório PDF!');
});

// Geração de Relatório PDF usando html2pdf.js
document.getElementById('btnGerarPdf').addEventListener('click', () => {
    const template = document.getElementById('pdfTemplate');
    
    // Captura os dados atuais do formulário para o layout do documento impresso
    const nomeCli = document.getElementById('cliNome').value || '---';
    const cnpjCli = document.getElementById('cliCnpj').value || '---';
    const endCli = document.getElementById('cliEndereco').value || '---';
    const equipamento = `${document.getElementById('eqMarca').value} ${document.getElementById('eqModelo').value} (${document.getElementById('eqCombustivel').value})`;
    const serie = document.getElementById('eqSerie').value || '---';
    const laudo = document.getElementById('servicoExecutado').value || 'Nenhum serviço registrado.';
    const pecas = document.getElementById('pecasAplicadas').value || 'Nenhuma peça aplicada.';
    
    // Constrói uma tabela e visualização limpa e corporativa para o PDF da Marlift
    template.innerHTML = `
        <div style="padding: 30px; font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
            <div style="border-bottom: 3px solid #ff6600; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="margin: 0; color: #ff6600; font-size: 28px; letter-spacing: 1px;">MARLIFT</h1>
                    <span style="font-size: 12px; color: #555;">Manutenção de Empilhadeiras</span>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0; color: #333;">RELATÓRIO TÉCNICO DE OS</h3>
                    <small>Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}</small>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background-color: #f2f2f2;"><td colspan="2" style="padding: 8px; font-weight: bold; border: 1px solid #ddd; color:#ff6600;">1. DADOS DO CLIENTE</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd; width: 30%;"><strong>Razão Social:</strong></td><td style="padding: 6px; border: 1px solid #ddd;">${nomeCli}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>CNPJ:</strong></td><td style="padding: 6px; border: 1px solid #ddd;">${cnpjCli}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Endereço:</strong></td><td style="padding: 6px; border: 1px solid #ddd;">${endCli}</td></tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background-color: #f2f2f2;"><td colspan="2" style="padding: 8px; font-weight: bold; border: 1px solid #ddd; color:#ff6600;">2. CONFIGURAÇÃO DO EQUIPAMENTO</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd; width: 30%;"><strong>Máquina / Modelo:</strong></td><td style="padding: 6px; border: 1px solid #ddd;">${equipamento}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Nº de Série:</strong></td><td style="padding: 6px; border: 1px solid #ddd;">${serie}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Tempo Operacional:</strong></td><td style="padding: 6px; border: 1px solid #ddd;">${formatarTempo(tempoSegundos)}</td></tr>
            </table>

            <div style="margin-bottom: 20px;">
                <h4 style="border-bottom: 1px solid #ddd; padding-bottom: 5px; color:#ff6600; margin-bottom:5px;">6. LAUDO E DESCRITIVO TÉCNICO DOS SERVIÇOS</h4>
                <p style="background: #fafafa; padding: 10px; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; margin:0;">${laudo}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="border-bottom: 1px solid #ddd; padding-bottom: 5px; color:#ff6600; margin-bottom:5px;">8. PEÇAS E COMPONENTES APLICADOS</h4>
                <p style="background: #fafafa; padding: 10px; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; margin:0;">${pecas}</p>
            </div>

            <div style="margin-top: 50px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <p style="margin-bottom: 5px;">De acordo com os serviços prestados acima:</p>
                <img src="${assinaturaDataUrl}" alt="Assinatura do Cliente" style="max-height: 80px; border-bottom: 1px solid #333; margin-bottom: 5px;">
                <br>
                <small>Assinatura Digital do Responsável do Cliente</small>
            </div>
        </div>
    `;

    // Opções de configuração para o gerador de arquivos PDF
    const opcoes = {
        margin:       10,
        filename:     `OS_${nomeCli.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Gera e faz download automático do relatório limpo
    html2pdf().set(opcoes).from(template).save().then(() => {
        // Limpar o storage após fechar o fluxo de entrega com segurança
        if (confirm("Deseja limpar o formulário para iniciar uma nova Ordem de Serviço?")) {
            limparLocalStorageFinalizado();
            window.location.reload();
        }
    });
});
