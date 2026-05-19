// VARIÁVEIS DE CONTROLE GLOBAL
let cronometroInterval = null;
let tempoSegundos = 0;
let statusCronometro = 'parado'; // parado, rodando, pausado
let historicoTempos = [];
let fotosArray = []; // Guarda as fotos em Base64
let assinaturaDataUrl = null;
let geolocalizacaoAtual = "Não capturada";

// Elementos DOM da Assinatura
const modalAssinatura = document.getElementById('modalAssinatura');
const canvas = document.getElementById('canvasAssinatura');
const ctx = canvas ? canvas.getContext('2d') : null;
let desenhando = false;

// Elementos DOM da Pausa
const modalPausa = document.getElementById('modalPausa');
const motivoPausaSelect = document.getElementById('motivoPausaSelect');

// INICIALIZAÇÃO DO APP E RECUPERAÇÃO DE DADOS
window.addEventListener('load', () => {
    if (canvas) configurarCanvasTouch();
    capturarCoordenadasGPS();
    carregarDadosSalvos(); // Recupera tudo se a página recarregar
});

// FUNÇÃO PARA SALVAR AUTOMATICAMENTE TODOS OS CAMPOS DE TEXTO E SELECTS
function salvarCamposFormulario() {
    const campos = [
        'cliNome', 'cliCnpj', 'cliEndereco', 'cliContato', 'cliEmail', 'cliTelefone',
        'eqMarca', 'eqModelo', 'eqCombustivel', 'eqSerie', 'servicoExecutado', 'pecasAplicadas'
    ];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) localStorage.setItem(`marlift_${id}`, el.value);
    });
}

// FUNÇÃO PARA SALVAR O ESTADO DO CRONÔMETRO E ARRAYS
function salvarEstadoEstrutural() {
    localStorage.setItem('marlift_tempoSegundos', tempoSegundos);
    localStorage.setItem('marlift_statusCronometro', statusCronometro);
    localStorage.setItem('marlift_historicoTempos', JSON.stringify(historicoTempos));
    localStorage.setItem('marlift_fotosArray', JSON.stringify(fotosArray));
    if (assinaturaDataUrl) localStorage.setItem('marlift_assinaturaDataUrl', assinaturaDataUrl);
}

// CONFIGURA OS OUVIDORES NAS INFORMAÇÕES DIGITADAS
const idsParaMonitorar = [
    'cliNome', 'cliCnpj', 'cliEndereco', 'cliContato', 'cliEmail', 'cliTelefone',
    'eqMarca', 'eqModelo', 'eqCombustivel', 'eqSerie', 'servicoExecutado', 'pecasAplicadas'
];
idsParaMonitorar.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', salvarCamposFormulario);
        el.addEventListener('change', salvarCamposFormulario);
    }
});

// FUNÇÃO QUE RESTAURA OS DADOS AO RECARREGAR A PÁGINA
function carregarDadosSalvos() {
    // 1. Restaura campos de texto
    idsParaMonitorar.forEach(id => {
        const el = document.getElementById(id);
        const valorSalvo = localStorage.getItem(`marlift_${id}`);
        if (el && valorSalvo !== null) el.value = valorSalvo;
    });

    // 2. Restaura Histórico e Fotos
    const historicoSalvo = localStorage.getItem('marlift_historicoTempos');
    if (historicoSalvo) {
        historicoTempos = JSON.parse(historicoSalvo);
        atualizarHistoricoDOM();
    }

    const fotosSalvas = localStorage.getItem('marlift_fotosArray');
    if (fotosSalvas) {
        fotosArray = JSON.parse(fotosSalvas);
        atualizarGaleriaDOM();
    }

    const assinaturaSalva = localStorage.getItem('marlift_assinaturaDataUrl');
    if (assinaturaSalva) {
        assinaturaDataUrl = assinaturaSalva;
        const areaAssinaturaSalva = document.getElementById('areaAssinaturaSalva');
        if (areaAssinaturaSalva) areaAssinaturaSalva.innerHTML = `<img src="${assinaturaDataUrl}" style="max-height:80px;">`;
    }

    // 3. Restaura o Cronômetro de onde parou
    const tempoSalvo = localStorage.getItem('marlift_tempoSegundos');
    if (tempoSalvo) {
        tempoSegundos = parseInt(tempoSalvo, 10);
        const displayTempo = document.getElementById('cronometroTempo');
        if (displayTempo) displayTempo.textContent = formatarTempo(tempoSegundos);
    }

    const statusSalvo = localStorage.getItem('marlift_statusCronometro');
    if (statusSalvo) {
        statusCronometro = statusSalvo;
        const btnIniciar = document.getElementById('btnIniciar');
        const btnPausar = document.getElementById('btnPausar');
        const btnFinalizarOS = document.getElementById('btnFinalizarOS');
        const btnGerarPdf = document.getElementById('btnGerarPdf');

        if (statusCronometro === 'rodando') {
            if (btnIniciar) btnIniciar.disabled = true;
            if (btnPausar) btnPausar.disabled = false;
            
            // Calcula o tempo que a página ficou fechada/recarregando e adiciona na contagem
            const lastTime = localStorage.getItem('marlift_lastTimestamp');
            if (lastTime) {
                let tempoInterrupcao = Math.floor((Date.now() - parseInt(lastTime, 10)) / 1000);
                if (!isNaN(tempoInterrupcao) && tempoInterrupcao > 0) {
                    tempoSegundos += tempoInterrupcao;
                }
            }
            rodarContagemCronometro();
        } else if (statusCronometro === 'pausado') {
            if (btnIniciar) btnIniciar.disabled = false;
            if (btnPausar) btnPausar.disabled = true;
        } else if (statusCronometro === 'finalizado') {
            if (btnIniciar) btnIniciar.disabled = true;
            if (btnPausar) btnPausar.disabled = true;
            if (btnFinalizarOS) {
                btnFinalizarOS.innerHTML = `<i class="fa-solid fa-check-double"></i> OS FINALIZADA`;
                btnFinalizarOS.style.backgroundColor = "#6c757d";
                btnFinalizarOS.disabled = true;
            }
            if (btnGerarPdf) {
                btnGerarPdf.disabled = false;
                btnGerarPdf.style.backgroundColor = "#ff6600";
            }
        }
    }
}

// LINK DE GPS PARA O ENDEREÇO DO CLIENTE
const btnGps = document.getElementById('btnGps');
if (btnGps) {
    btnGps.addEventListener('click', () => {
        const endereco = document.getElementById('cliEndereco').value;
        if(!endereco) {
            alert('Por favor, digite o endereço completo do cliente primeiro.');
            return;
        }
        const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(endereco);
        window.open(url, '_blank');
    });
}

// LOGICA DO CRONÔMETRO
function rodarContagemCronometro() {
    const displayTempo = document.getElementById('cronometroTempo');
    if (cronometroInterval) clearInterval(cronometroInterval);
    
    cronometroInterval = setInterval(() => {
        tempoSegundos++;
        if (displayTempo) displayTempo.textContent = formatarTempo(tempoSegundos);
        localStorage.setItem('marlift_tempoSegundos', tempoSegundos);
        localStorage.setItem('marlift_lastTimestamp', Date.now());
    }, 1000);
}

const btnIniciar = document.getElementById('btnIniciar');
if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
        if (statusCronometro === 'parado' || statusCronometro === 'pausado') {
            statusCronometro = 'rodando';
            btnIniciar.disabled = true;
            if (btnPausar) btnPausar.disabled = false;
            
            let horaInicio = new Date().toLocaleTimeString('pt-BR');
            historicoTempos.push({ tipo: 'Início/Retomada', hora: horaInicio, tempoRef: tempoSegundos });
            atualizarHistoricoDOM();
            salvarEstadoEstrutural();

            rodarContagemCronometro();
        }
    });
}

if (btnPausar) {
    btnPausar.addEventListener('click', () => {
        if (statusCronometro === 'rodando' && modalPausa) {
            modalPausa.style.display = 'flex';
        }
    });
}

const btnConfirmarPausa = document.getElementById('btnConfirmarPausa');
if (btnConfirmarPausa) {
    btnConfirmarPausa.addEventListener('click', () => {
        clearInterval(cronometroInterval);
        statusCronometro = 'pausado';
        
        let motivo = motivoPausaSelect ? motivoPausaSelect.value : 'Intervalo';
        let horaPausa = new Date().toLocaleTimeString('pt-BR');
        historicoTempos.push({ tipo: `Pausa (${motivo})`, hora: horaPausa, tempoRef: tempoSegundos });
        
        if (modalPausa) modalPausa.style.display = 'none';
        if (btnIniciar) btnIniciar.disabled = false;
        if (btnPausar) btnPausar.disabled = true;
        atualizarHistoricoDOM();
        salvarEstadoEstrutural();
    });
}

function formatarTempo(totalSegundos) {
    let horas = Math.floor(totalSegundos / 3600);
    let minutos = Math.floor((totalSegundos % 3600) / 60);
    let segundos = totalSegundos % 60;
    return `${String(horas).padStart(2,'0')}:${String(minutos).padStart(2,'0')}:${String(segundos).padStart(2,'0')}`;
}

function atualizarHistoricoDOM() {
    if (!divHistorico) return;
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
        }, () => {
            geolocalizacaoAtual = "GPS Indisponível";
        }, { enableHighAccuracy: true });
    }
}

// GERENCIAMENTO DE FOTOS COM CARIMBO
const inputFotos = document.getElementById('inputFotos');
if (inputFotos) {
    inputFotos.addEventListener('change', function(e) {
        const arquivos = Array.from(e.target.files);
        arquivos.forEach(arquivo => {
            if (fotosArray.length >= 15) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const imgObj = new Image();
                imgObj.onload = function() {
                    processarECarimbarImagem(imgObj);
                };
                imgObj.src = event.target.result;
            };
            reader.readAsDataURL(arquivo);
        });
        this.value = ''; 
    });
}

function processarECarimbarImagem(imgObj) {
    const canvasFoto = document.createElement('canvas');
    const ctxFoto = canvasFoto.getContext('2d');
    const maxDim = 1024;
    let w = imgObj.width;
    let h = imgObj.height;
    if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else { w = Math.round((w * maxDim) / h); h = maxDim; }
    }
    canvasFoto.width = w;
    canvasFoto.height = h;
    ctxFoto.drawImage(imgObj, 0, 0, w, h);
    
    const dataHoraStr = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    const textoCarimbo = `MARLIFT | ${dataHoraStr} | GPS: ${geolocalizacaoAtual}`;
    const alturaFaixa = Math.round(h * 0.05) < 30 ? 30 : Math.round(h * 0.05);
    
    ctxFoto.fillStyle = "rgba(44, 62, 80, 0.75)"; 
    ctxFoto.fillRect(0, h - alturaFaixa, w, alturaFaixa);
    ctxFoto.fillStyle = "#ff6600"; 
    ctxFoto.font = `bold ${Math.round(alturaFaixa * 0.45)}px Arial`;
    ctxFoto.textBaseline = "middle";
    ctxFoto.fillText(textoCarimbo, 15, h - (alturaFaixa / 2));
    
    fotosArray.push(canvasFoto.toDataURL('image/jpeg', 0.8));
    atualizarGaleriaDOM();
    salvarEstadoEstrutural();
}

function atualizarGaleriaDOM() {
    const galeria = document.getElementById('galeriaFotos');
    const fotoContador = document.getElementById('fotoContador');
    if (galeria) galeria.innerHTML = '';
    if (fotoContador) fotoContador.textContent = fotosArray.length;
    
    if (galeria) {
        fotosArray.forEach((foto, index) => {
            const div = document.createElement('div');
            div.className = 'foto-item';
            div.innerHTML = `
                <img src="${foto}" style="width:100px; margin:5px; border-radius:4px;">
                <button type="button" class="btn-remover-foto" onclick="removerFoto(${index})">X</button>
            `;
            galeria.appendChild(div);
        });
    }
}

window.removerFoto = function(index) {
    fotosArray.splice(index, 1);
    atualizarGaleriaDOM();
