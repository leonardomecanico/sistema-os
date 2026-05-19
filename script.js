// VARIÁVEIS DE CONTROLE GLOBAL
let cronometroInterval = null;
let tempoSegundos = 0;
let statusCronometro = 'parado'; // parado, rodando, pausado
let historicoTempos = [];
let fotosArray = []; 
let assinaturaDataUrl = null;
let geolocalizacaoAtual = "Não capturada";

// Elementos DOM da Assinatura
const modalAssinatura = document.getElementById('modalAssinatura');
const canvas = document.getElementById('canvasAssinatura');
const ctx = canvas.getContext('2d');
let desenhando = false;

// Elementos DOM da Pausa
const modalPausa = document.getElementById('modalPausa');
const motivoPausaSelect = document.getElementById('motivoPausaSelect');
const campoMotivoOutro = document.getElementById('campoMotivoOutro');
const motivoPausaOutroInput = document.getElementById('motivoPausaOutroInput');

// INICIALIZAÇÃO
window.addEventListener('load', () => {
    configurarCanvasTouch();
    capturarCoordenadasGPS();
});

// LINK DE GPS PARA O ENDEREÇO DO CLIENTE
document.getElementById('btnGps').addEventListener('click', () => {
    const endereco = document.getElementById('cliEndereco').value;
    if(!endereco) {
        alert('Por favor, digite o endereço completo do cliente primeiro.');
        return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
});

// LOGICA DO CRONÔMETRO
const displayTempo = document.getElementById('cronometroTempo');
const btnIniciar = document.getElementById('btnIniciar');
const btnPausar = document.getElementById('btnPausar');
const divHistorico = document.getElementById('historicoTempos');

btnIniciar.addEventListener('click', () => {
    if (statusCronometro === 'parado' || statusCronometro === 'pausado') {
        statusCronometro = 'rodando';
        btnIniciar.disabled = true;
        btnPausar.disabled = false;
        
        let horaInicio = new Date().toLocaleTimeString('pt-BR');
        historicoTempos.push({ tipo: 'Início/Retomada', hora: horaInicio, tempoRef: tempoSegundos });
        atualizarHistoricoDOM();

        cronometroInterval = setInterval(() => {
            tempoSegundos++;
            displayTempo.textContent = formatarTempo(tempoSegundos);
        }, 1000);
    }
});

btnPausar.addEventListener('click', () => {
    if (statusCronometro === 'rodando') {
        modalPausa.style.display = 'flex';
    }
});

motivoPausaSelect.addEventListener('change', () => {
    campoMotivoOutro.style.display = (motivoPausaSelect.value === 'Outro') ? 'block' : 'none';
});

document.getElementById('btnConfirmarPausa').addEventListener('click', () => {
    clearInterval(cronometroInterval);
    statusCronometro = 'pausado';
    
    let motivo = motivoPausaSelect.value;
    if (motivo === 'Outro') {
        motivo = motivoPausaOutroInput.value || 'Outro motivo não especificado';
    }

    let horaPausa = new Date().toLocaleTimeString('pt-BR');
    historicoTempos.push({ tipo: `Pausa (${motivo})`, hora: horaPausa, tempoRef: tempoSegundos });
    
    modalPausa.style.display = 'none';
    campoMotivoOutro.style.display = 'none';
    motivoPausaOutroInput.value = '';
    
    btnIniciar.disabled = false;
    btnPausar.disabled = true;
    atualizarHistoricoDOM();
});

function formatarTempo(totalSegundos) {
    let horas = Math.floor(totalSegundos / 3600);
    let minutos = Math.floor((totalSegundos % 3600) / 60);
    let segundos = totalSegundos % 60;
    return `${String(horas).padStart(2,'0')}:${String(minutos).padStart(2,'0')}:${String(segundos).padStart(2,'0')}`;
}

function atualizarHistoricoDOM() {
    divHistorico.innerHTML = '';
    historicoTempos.forEach(item => {
        const p = document.createElement('div');
        p.className = 'tempo-linha';
        p.innerHTML = `<strong>[${item.hora}]</strong> ${item.tipo} - Marcando: ${formatarTempo(item.tempoRef)}`;
        divHistorico.appendChild(p);
    });
}

// CAPTURA DE GPS
function capturarCoordenadasGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            geolocalizacaoAtual = `Lat: ${position.coords.latitude.toFixed(5)}, Long: ${position.coords.longitude.toFixed(5)}`;
        }, null, { enableHighAccuracy: true });
    }
}

// GESTÃO DE FOTOS COM CARIMBO
document.getElementById('inputFotos').addEventListener('change', function(e) {
    const arquivos = Array.from(e.target.files);
    arquivos.forEach(arquivo => {
        if (fotosArray.length >= 15) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const imgObj = new Image();
            imgObj.onload = () => processarECarimbarImagem(imgObj);
            imgObj.src = event.target.result;
        };
        reader.readAsDataURL(arquivo);
    });
    this.value = ''; 
});

function processarECarimbarImagem(imgObj) {
    const canvasFoto = document.createElement('canvas');
    const ctxFoto = canvasFoto.getContext('2d');
    const maxDim = 1024;
    let w = imgObj.width, h = imgObj.height;
    if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else { w = Math.round((w * maxDim) / h); h = maxDim; }
    }
    canvasFoto.width = w; canvasFoto.height = h;
    ctxFoto.drawImage(imgObj, 0, 0, w, h);
    
    const textoCarimbo = `MARLIFT | ${new Date().toLocaleString('pt-BR')} | GPS: ${geolocalizacaoAtual}`;
    const alturaFaixa = Math.max(30, Math.round(h * 0.05));
    ctxFoto.fillStyle = "rgba(44, 62, 80, 0.75)";
    ctxFoto.fillRect(0, h - alturaFaixa, w, alturaFaixa);
    ctxFoto.fillStyle = "#ff6600";
    ctxFoto.font = `bold ${Math.round(alturaFaixa * 0.45)}px Arial`;
    ctxFoto.fillText(textoCarimbo, 15, h - (alturaFaixa / 2.2));
    
    fotosArray.push(canvasFoto.toDataURL('image/jpeg', 0.8));
    atualizarGaleriaDOM();
}

function atualizarGaleriaDOM() {
    const galeria = document.getElementById('galeriaFotos');
    galeria.innerHTML = '';
    document.getElementById('fotoContador').textContent = fotosArray.length;
    fotosArray.forEach((foto, index) => {
        const div = document.createElement('div');
        div.className = 'foto-item';
        div.innerHTML = `<img src="${foto}"><button type="button" class="btn-remover-foto" onclick="removerFoto(${index})">X</button>`;
        galeria.appendChild(div);
    });
}

window.removerFoto = (index) => { fotosArray.splice(index, 1); atualizarGaleriaDOM(); };

// ASSINATURA
function configurarCanvasTouch() {
    const rect = canvas.getBoundingClientRect();
    const getPos = (e) => ({
        x: (e.touches ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left,
        y: (e.touches ? e.touches[0].clientY : e.clientY) - canvas.getBoundingClientRect().top
    });
    const start = (e) => { desenhando = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    const move = (e) => { if(!desenhando) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
    const stop = () => desenhando = false;

    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move); canvas.addEventListener('touchend', stop);
}

document.getElementById('btnAbrirAssinatura').addEventListener('click', () => {
    modalAssinatura.style.display = 'flex';
    canvas.width = canvas.parentElement.clientWidth; canvas.height = 180;
    ctx.lineWidth = 3; ctx.strokeStyle = '#2c3e50'; ctx.lineCap = 'round';
});

document.getElementById('btnLimparAssinatura').addEventListener('click', () => ctx.clearRect(0,0,canvas.width,canvas.height));

document.getElementById('btnSalvarAssinatura').addEventListener('click', () => {
    assinaturaDataUrl = canvas.toDataURL();
    document.getElementById('areaAssinaturaSalva').innerHTML = `<img src="${assinaturaDataUrl}" style="max-height:100px;">`;
    modalAssinatura.style.display = 'none';
    document.getElementById('btnFinalizarOS').disabled = false;
});

// --- BOTÃO: FINALIZAR OS ---
document.getElementById('btnFinalizarOS').addEventListener('click', function() {
    // 1. Encerra a contagem do cronômetro imediatamente
    clearInterval(cronometroInterval);
    statusCronometro = 'finalizado';
    
    // 2. Registra o horário do fim no histórico do relatório
    let horaFim = new Date().toLocaleTimeString('pt-BR');
    historicoTempos.push({ tipo: 'Finalização Autorizada', hora: horaFim, tempoRef: tempoSegundos });
    atualizarHistoricoDOM();
    
    // 3. Muda o texto e a cor do próprio botão (Feedback visual no celular)
    this.innerHTML = `<i class="fa-solid fa-check-double"></i> OS FINALIZADA`;
    this.style.backgroundColor = "#6c757d"; // Fica cinza (indica que já foi clicado)
    this.disabled = true; // Trava para não clicar de novo por erro
    
   // --- FUNÇÃO BLINDADA PARA GERAR O PDF ---
document.getElementById('btnGerarPdf').addEventListener('click', function() {
    const temp = document.getElementById('pdfTemplate');
    if (!temp) {
        alert("Erro técnico: O elemento 'pdfTemplate' não foi encontrado no seu HTML.");
        return;
    }

    // Força a exibição temporária para o celular conseguir renderizar as imagens e textos
    temp.style.display = 'block';

    // Coleta dos dados preenchidos na tela
    const dados = {
        cliente: document.getElementById('cliNome').value || 'Cliente Não Informado',
        cnpj: document.getElementById('cliCnpj').value || '-',
        end: document.getElementById('cliEndereco').value || '-',
        contato: document.getElementById('cliContato').value || '-',
        marca: document.getElementById('eqMarca').value || '-',
        modelo: document.getElementById('eqModelo').value || '-',
        serie: document.getElementById('eqSerie').value || '-',
        comb: document.getElementById('eqCombustivel').value || '-',
        servico: document.getElementById('servicoExecutado')?.value || 'Não informado.',
        pecas: document.getElementById('pecasAplicadas')?.value || 'Nenhuma peça aplicada.'
    };

    // Montagem do documento com a identidade visual da Marlift
    temp.innerHTML = `
        <div style="padding:20px; font-family:Arial, sans-serif; color:#333; background:#fff;">
            <div style="border-bottom:3px solid #ff6600; padding-bottom:10px; margin-bottom:20px;">
                <h1 style="margin:0; color:#ff6600; font-size:24px;">MARLIFT EMPILHADEIRAS</h1>
                <span style="font-size:12px; font-weight:bold; color:#555;">RELATÓRIO DE ATENDIMENTO TÉCNICO</span>
            </div>
            
            <p style="font-size:12px;"><strong>Cliente:</strong> ${dados.cliente} | <strong>CNPJ:</strong> ${dados.cnpj}</p>
            <p style="font-size:12px;"><strong>Endereço:</strong> ${dados.end}</p>
            <p style="font-size:12px;"><strong>Contato:</strong> ${dados.contato}</p>
            <hr style="border:0; border-top:1px solid #ccc; margin:15px 0;">
            
            <p style="font-size:12px;"><strong>Máquina:</strong> ${dados.marca} ${dados.modelo} (${dados.comb}) | <strong>Série:</strong> ${dados.serie}</p>
            <p style="font-size:12px;"><strong>Tempo Total de Mão de Obra:</strong> ${formatarTempo(tempoSegundos)}</p>
            
            <hr style="border:0; border-top:1px solid #ccc; margin:15px 0;">
            <h4 style="color:#ff6600; margin-bottom:5px;">SERVIÇOS EXECUTADOS</h4>
            <p style="font-size:12px; white-space:pre-wrap; background:#f9f9f9; padding:10px; border:1px solid #eee;">${dados.servico}</p>
            
            <h4 style="color:#ff6600; margin-bottom:5px;">PEÇAS APLICADAS</h4>
            <p style="font-size:12px; white-space:pre-wrap; background:#f9f9f9; padding:10px; border:1px solid #eee;">${dados.pecas}</p>
            
            <hr style="border:0; border-top:1px solid #ccc; margin:15px 0;">
            <h4 style="color:#ff6600; margin-bottom:5px;">EVIDÊNCIAS FOTOGRÁFICAS</h4>
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;">
                ${fotosArray.map(f => `<img src="${f}" style="width:100%; border:1px solid #ddd; border-radius:4px;">`).join('')}
            </div>
            
            <div style="margin-top:40px; display:flex; justify-content:space-around; text-align:center;">
                <div style="width:45%; border-top:1px solid #999; padding-top:5px; font-size:12px;">
                    <strong>MARLIFT EMPILHADEIRAS</strong><br>Técnico Responsável
                </div>
                <div style="width:45%; border-top:1px solid #999; padding-top:5px; font-size:12px;">
                    ${assinaturaDataUrl ? `<img src="${assinaturaDataUrl}" style="max-height:60px; display:block; margin:0 auto 5px auto;">` : '<div style="height:60px;"></div>'}
                    <strong>${dados.cliente}</strong><br>Assinatura do Cliente
                </div>
            </div>
        </div>
    `;

    // Configuração de salvamento do arquivo
    const nomeArquivo = `OS_Marlift_${dados.cliente.replace(/\s+/g, '_')}.pdf`;
    
    const configuracao = {
        margin: 0,
        filename: nomeArquivo,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Executa a geração, baixa o arquivo e depois esconde a div novamente
    html2pdf().set(configuracao).from(temp).save().then(() => {
        temp.style.display = 'none';
    }).catch(erro => {
        alert("Erro ao gerar PDF: " + erro);
        temp.style.display = 'none';
    });
});
