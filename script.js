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

// MONTAGEM E GERAÇÃO DO ARQUIVO PDF (CORRIGIDO)
document.getElementById('btnGerarPdf').addEventListener('click', () => {
    const template = document.getElementById('pdfTemplate');
    
    // Mostra o template temporariamente para o script conseguir "ler" o conteúdo
    template.style.display = 'block';

    const cliNome = document.getElementById('cliNome').value || '-';
    const cliCnpj = document.getElementById('cliCnpj').value || '-';
    const cliEndereco = document.getElementById('cliEndereco').value || '-';
    const cliContato = document.getElementById('cliContato').value || '-';
    const cliEmail = document.getElementById('cliEmail').value || '-';
    const cliTelefone = document.getElementById('cliTelefone').value || '-';
    
    const eqMarca = document.getElementById('eqMarca').value || '-';
    const eqModelo = document.getElementById('eqModelo').value || '-';
    const eqCombustivel = document.getElementById('eqCombustivel').value || '-';
    const eqSerie = document.getElementById('eqSerie').value || '-';
    
    const tipoChamado = document.getElementById('tipoChamado').value || '-';
    const defeito = document.getElementById('defeitoApresentado').value || '-';
    const servico = document.getElementById('servicoExecutado').value || 'Nenhum laudo preenchido.';
    const pecas = document.getElementById('pecasAplicadas').value || 'Nenhuma peça aplicada.';
    const obs = document.getElementById('obsGerais').value || 'Sem observações.';
    
    let logTemposHtml = '';
    historicoTempos.forEach(t => {
        logTemposHtml += `<p style="font-size:11px; margin:2px 0;">• <strong>[${t.hora}]</strong> ${t.tipo} - Parcial: ${formatarTempo(t.tempoRef)}</p>`;
    });

    let fotosHtml = '';
    fotosArray.forEach(fotoBase64 => {
        fotosHtml += `<div style="display:inline-block; width:30%; margin:5px;"><img src="${fotoBase64}" style="width:100%; border:1px solid #ddd;"></div>`;
    });
    if(fotosArray.length === 0) fotosHtml = '<p style="font-style:italic; font-size:11px;">Nenhuma evidência fotográfica registrada.</p>';

    // Preenche o conteúdo do template
    template.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif; color: #333;">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #ff6600; padding-bottom: 10px;">
                <div>
                    <h1 style="margin: 0; color: #ff6600; font-size: 22px;">MARLIFT EMPILHADEIRAS</h1>
                    <p style="margin: 0; font-size: 12px; font-weight: bold;">RELATÓRIO DE ATENDIMENTO TÉCNICO</p>
                </div>
                <div style="text-align: right; font-size: 11px;">
                    <p><strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    <p><strong>Duração Total:</strong> ${formatarTempo(tempoSegundos)}</p>
                </div>
            </div>

            <div style="margin-top: 15px; border: 1px solid #ddd; padding: 10px; background: #f9f9f9;">
                <h3 style="font-size: 14px; margin-top: 0; color: #444;">1. Dados do Cliente</h3>
                <p style="font-size: 12px; margin: 3px 0;"><strong>Razão Social:</strong> ${cliNome} | <strong>CNPJ:</strong> ${cliCnpj}</p>
                <p style="font-size: 12px; margin: 3px 0;"><strong>Endereço:</strong> ${cliEndereco}</p>
                <p style="font-size: 12px; margin: 3px 0;"><strong>Contato:</strong> ${cliContato} | <strong>Tel:</strong> ${cliTelefone}</p>
            </div>

            <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                <h3 style="font-size: 14px; margin-top: 0; color: #444;">2. Dados da Máquina</h3>
                <p style="font-size: 12px; margin: 3px 0;"><strong>Equipamento:</strong> ${eqMarca} ${eqModelo} | <strong>Série:</strong> ${eqSerie}</p>
                <p style="font-size: 12px; margin: 3px 0;"><strong>Combustível:</strong> ${eqCombustivel}</p>
            </div>

            <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                <h3 style="font-size: 14px; margin-top: 0; color: #444;">3. Histórico de Tempos</h3>
                ${logTemposHtml}
                <p style="font-size: 12px; font-weight: bold; margin-top: 5px;">Total Faturável: ${formatarTempo(tempoSegundos)}</p>
            </div>

            <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                <h3 style="font-size: 14px; margin-top: 0; color: #444;">4. Laudo Técnico / Serviço</h3>
                <p style="font-size: 12px; white-space: pre-wrap;">${servico}</p>
            </div>

            <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                <h3 style="font-size: 14px; margin-top: 0; color: #444;">5. Peças e Observações</h3>
                <p style="font-size: 12px;"><strong>Peças:</strong> ${pecas}</p>
                <p style="font-size: 12px;"><strong>Obs:</strong> ${obs}</p>
            </div>

            <div style="margin-top: 10px;">
                <h3 style="font-size: 14px; color: #444;">6. Fotos e Evidências</h3>
                <div style="text-align: center;">${fotosHtml}</div>
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: space-around; text-align: center;">
                <div style="width: 45%; border-top: 1px solid #333; padding-top: 5px;">
                    <p style="font-size: 11px;">Marlift Empilhadeiras</p>
                </div>
                <div style="width: 45%; border-top: 1px solid #333; padding-top: 5px;">
                    <img src="${assinaturaDataUrl}" style="max-height: 60px; display: block; margin: 0 auto;">
                    <p style="font-size: 11px;">Assinatura do Cliente: ${cliNome}</p>
                </div>
            </div>
        </div>
    `;

    const opt = {
        margin: 5,
        filename: `OS_Marlift_${cliNome.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Gera o PDF e depois esconde o template novamente
    html2pdf().set(opt).from(template).save().then(() => {
        template.style.display = 'none';
    });
});
