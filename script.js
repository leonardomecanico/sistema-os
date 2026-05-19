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

// FINALIZAÇÃO E PDF
document.getElementById('btnFinalizarOS').addEventListener('click', function() {
    clearInterval(cronometroInterval);
    this.disabled = true;
    document.getElementById('btnGerarPdf').disabled = false;
    alert("OS Finalizada! Agora você pode gerar o PDF.");
});

document.getElementById('btnGerarPdf').addEventListener('click', () => {
    const cliNome = document.getElementById('cliNome').value || 'Cliente_Nao_Informado';
    // O código aqui gera o template HTML do PDF conforme as seções da Marlift
    // (Omitido por brevidade, mas segue a estrutura de blocos que você já possui)
    alert("Gerando PDF...");
    // Comando html2pdf().from(template).save();
});
