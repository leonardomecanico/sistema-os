// VARIÁVEIS DE CONTROLE GLOBAL
let cronometroInterval = null;
let tempoSegundos = 0;
let statusCronometro = 'parado';
let historicoTempos = [];
let fotosArray = [];
let assinaturaDataUrl = null;
let geolocalizacaoAtual = "Não capturada";

const canvas = document.getElementById('canvasAssinatura');
const ctx = canvas ? canvas.getContext('2d') : null;
let desenhando = false;

// LISTA DE ID'S QUE O SCRIPT VAI TENTAR SALVAR
const idsCampos = [
    'cliNome', 'cliCnpj', 'cliEndereco', 'cliContato', 'cliEmail', 'cliTelefone',
    'eqMarca', 'eqModelo', 'eqCombustivel', 'eqSerie', 'servicoExecutado', 'pecasAplicadas'
];

// 1. RECUPERAÇÃO DOS DADOS (RODA ASSIM QUE A PÁGINA ABRE)
window.addEventListener('load', () => {
    try {
        console.log("Iniciando recuperação de dados...");
        
        // Recupera os textos digitados
        idsCampos.forEach(id => {
            const el = document.getElementById(id);
            const valorSalvo = localStorage.getItem(`marlift_${id}`);
            if (el && valorSalvo !== null) {
                el.value = valorSalvo;
            }
        });

        // Recupera o Tempo do Cronômetro
        const tempoSalvo = localStorage.getItem('marlift_tempoSegundos');
        if (tempoSalvo) {
            tempoSegundos = parseInt(tempoSalvo, 10);
            const displayTempo = document.getElementById('cronometroTempo');
            if (displayTempo) displayTempo.textContent = formatarTempo(tempoSegundos);
        }

        // Recupera o Status do Cronômetro
        const statusSalvo = localStorage.getItem('marlift_statusCronometro');
        if (statusSalvo) {
            statusCronometro = statusSalvo;
            
            // Se a página atualizou com ele rodando, calcula o tempo perdido e retoma
            if (statusCronometro === 'rodando') {
                const lastTime = localStorage.getItem('marlift_lastTimestamp');
                if (lastTime) {
                    let tempoInterrupcao = Math.floor((Date.now() - parseInt(lastTime, 10)) / 1000);
                    if (!isNaN(tempoInterrupcao) && tempoInterrupcao > 0) {
                        tempoSegundos += tempoInterrupcao;
                    }
                }
                rodarContagemCronometro();
                
                if (document.getElementById('btnIniciar')) document.getElementById('btnIniciar').disabled = true;
                if (document.getElementById('btnPausar')) document.getElementById('btnPausar').disabled = false;
            }
        }

        // Recupera Histórico
        const historicoSalvo = localStorage.getItem('marlift_historicoTempos');
        if (historicoSalvo) {
            historicoTempos = JSON.parse(historicoSalvo);
            atualizarHistoricoDOM();
        }

        // Recupera Fotos
        const fotosSalvas = localStorage.getItem('marlift_fotosArray');
        if (fotosSalvas) {
            fotosArray = JSON.parse(fotosSalvas);
            if (typeof atualizarGaleriaDOM === 'function') atualizarGaleriaDOM();
        }

        // Recupera Assinatura
        const assinaturaSalva = localStorage.getItem('marlift_assinaturaDataUrl');
        if (assinaturaSalva && document.getElementById('areaAssinaturaSalva')) {
            assinaturaDataUrl = assinaturaSalva;
            document.getElementById('areaAssinaturaSalva').innerHTML = `<img src="${assinaturaDataUrl}" style="max-height:80px;">`;
        }

    } catch (erro) {
        alert("Erro ao carregar dados do LocalStorage: " + erro.message);
    }

    if (canvas) configurarCanvasTouch();
});

// 2. SALVAMENTO AUTOMÁTICO (MONITORA O QUE É DIGITADO)
document.addEventListener('input', (e) => {
    if (idsCampos.includes(e.target.id)) {
        localStorage.setItem(`marlift_${e.target.id}`, e.target.value);
    }
});

function salvarEstadoEstrutural() {
    try {
        localStorage.setItem('marlift_tempoSegundos', tempoSegundos);
        localStorage.setItem('marlift_statusCronometro', statusCronometro);
        localStorage.setItem('marlift_historicoTempos', JSON.stringify(historicoTempos));
        localStorage.setItem('marlift_fotosArray', JSON.stringify(fotosArray));
        if (assinaturaDataUrl) localStorage.setItem('marlift_assinaturaDataUrl', assinaturaDataUrl);
    } catch (e) {
        console.error("Erro ao salvar estrutura", e);
    }
}

// 3. LOGICA DO CRONÔMETRO
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
        statusCronometro = 'rodando';
        btnIniciar.disabled = true;
        if (document.getElementById('btnPausar')) document.getElementById('btnPausar').disabled = false;
        
        let horaInicio = new Date().toLocaleTimeString('pt-BR');
        historicoTempos.push({ tipo: 'Início/Retomada', hora: horaInicio, tempoRef: tempoSegundos });
        atualizarHistoricoDOM();
        salvarEstadoEstrutural();
        rodarContagemCronometro();
    });
}

const btnPausar = document.getElementById('btnPausar');
if (btnPausar) {
    btnPausar.addEventListener('click', () => {
        clearInterval(cronometroInterval);
        statusCronometro = 'pausado';
        if (btnIniciar) btnIniciar.disabled = false;
        btnPausar.disabled = true;
        
        let horaPausa = new Date().toLocaleTimeString('pt-BR');
        historicoTempos.push({ tipo: 'Pausa', hora: horaPausa, tempoRef: tempoSegundos });
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
    const divHistorico = document.getElementById('historicoTempos');
    if (!divHistorico) return;
    divHistorico.innerHTML = '';
    historicoTempos.forEach(item => {
        const p = document.createElement('div');
        p.innerHTML = `<strong>[${item.hora}]</strong> ${item.tipo} - Marcando: ${formatarTempo(item.tempoRef)}`;
        divHistorico.appendChild(p);
    });
}

// O restante das suas funções de foto/assinatura/PDF continuam abaixo...
