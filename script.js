// VARIÁVEIS DE CONTROLE GLOBAL
let cronometroInterval = null;
let tempoSegundos = 0;
let statusCronometro = 'parado'; // parado, rodando, pausado
let historicoTempos = [];
let fotosArray = []; // Guarda objetos { original: base64, carimbada: base64 }
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

// LOGICA DO CRONÔMETRO (ITEM 5)
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
    if (statusCronmetro === 'rodando') {
        // Abre pop-up para selecionar motivo da pausa
        modalPausa.style.display = 'flex';
    }
});

motivoPausaSelect.addEventListener('change', () => {
    if (motivoPausaSelect.value === 'Outro') {
        campoMotivoOutro.style.display = 'block';
    } else {
        campoMotivoOutro.style.display = 'none';
    }
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
    
    // Reseta campos do modal de pausa e fecha
    modalPausa.style.display = 'none';
    campoMotivoOutro.style.display = 'none';
    motivoPausaOutroInput.value = '';
    motivoPausaSelect.value = 'Intervalo de almoço';

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

// CAPTURA DE GPS DE RECOVERY DE COORDENADAS PARA O CARIMBO
function capturarCoordenadasGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            geolocalizacaoAtual = `Lat: ${position.coords.latitude.toFixed(5)}, Long: ${position.coords.longitude.toFixed(5)}`;
        }, () => {
            geolocalizacaoAtual = "GPS Indisponível/Negado";
        }, { enableHighAccuracy: true });
    }
}

// GERENCIAMENTO DE EVIDÊNCIAS FOTOGRÁFICAS COM CARIMBO AUTOMÁTICO (ITEM 7)
document.getElementById('inputFotos').addEventListener('change', function(e) {
    const arquivos = Array.from(e.target.files);
    
    arquivos.forEach(arquivo => {
        if (fotosArray.length >= 15) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const imgObj = new Image();
            imgObj.onload = function() {
                // Força captura de coordenadas atualizada no momento do upload
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                        geolocalizacaoAtual = `Lat: ${position.coords.latitude.toFixed(5)}, Long: ${position.coords.longitude.toFixed(5)}`;
                        processarECarimbarImagem(imgObj);
                    }, () => {
                        processarECarimbarImagem(imgObj);
                    });
                } else {
                    processarECarimbarImagem(imgObj);
                }
            };
            imgObj.src = event.target.result;
        };
        reader.readAsDataURL(arquivo);
    });
    this.value = ''; // Libera input para re-upload se necessário
});

function processarECarimbarImagem(imgObj) {
    const canvasFoto = document.createElement('canvas');
    const ctxFoto = canvasFoto.getContext('2d');
    
    // Define tamanho máximo para evitar lentidão e estourar armazenamento
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
    
    // Configuração do carimbo no rodapé
    const dataHoraStr = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    const textoCarimbo = `MARLIFT | ${dataHoraStr} | GPS: ${geolocalizacaoAtual}`;
    
    const alturaFaixa = Math.round(h * 0.05) < 30 ? 30 : Math.round(h * 0.05);
    ctxFoto.fillStyle = "rgba(44, 62, 80, 0.75)"; // Cinza escuro semi-transparente
    ctxFoto.fillRect(0, h - alturaFaixa, w, alturaFaixa);
    
    ctxFoto.fillStyle = "#ff6600"; // Texto Laranja Marlift
    ctxFoto.font = `bold ${Math.round(alturaFaixa * 0.45)}px Arial`;
    ctxFoto.textBaseline = "middle";
    ctxFoto.fillText(textoCarimbo, 15, h - (alturaFaixa / 2));
    
    const fotoCarimbadaBase64 = canvasFoto.toDataURL('image/jpeg', 0.8);
    fotosArray.push(fotoCarimbadaBase64);
    
    atualizarGaleriaDOM();
}

function atualizarGaleriaDOM() {
    const galeria = document.getElementById('galeriaFotos');
    galeria.innerHTML = '';
    document.getElementById('fotoContador').textContent = fotosArray.length;
    
    fotosArray.forEach((foto, index) => {
        const div = document.createElement('div');
        div.className = 'foto-item';
        div.innerHTML = `
            <img src="${foto}">
            <button type="button" class="btn-remover-foto" onclick="removerFoto(${index})">X</button>
        `;
        galeria.appendChild(div);
    });
}

window.removerFoto = function(index) {
    fotosArray.splice(index, 1);
    atualizarGaleriaDOM();
};

// CONTROLE DO PAINEL DE ASSINATURA (ITEM 10)
const btnAbrirAssinatura = document.getElementById('btnAbrirAssinatura');
btnAbrirAssinatura.addEventListener('click', () => {
    modalAssinatura.style.display = 'flex';
    redimensionarCanvasAssinatura();
});

function redimensionarCanvasAssinatura() {
    // Sincroniza tamanho interno do canvas com elemento CSS real
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 180;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2c3e50';
}

function configurarCanvasTouch() {
    const obterPosicaoMouseTouch = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clienteX = e.touches ? e.touches[0].clientX : e.clientX;
        const clienteY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clienteX - rect.left, y: clienteY - rect.top };
    };

    const iniciarDesenho = (e) => {
        desenhando = true;
        const pos = obterPosicaoMouseTouch(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    };

    const desenhar = (e) => {
        if (!desenhando) return;
        const pos = obterPosicaoMouseTouch(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        e.preventDefault();
    };

    const pararDesenho = () => { desenhando = false; };

    canvas.addEventListener('mousedown', iniciarDesenho);
    canvas.addEventListener('mousemove', desenhar);
    canvas.addEventListener('mouseup', pararDesenho);

    canvas.addEventListener('touchstart', iniciarDesenho, {passive: false});
    canvas.addEventListener('touchmove', desenhar, {passive: false});
    canvas.addEventListener('touchend', pararDesenho);
}

document.getElementById('btnLimparAssinatura').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('btnSalvarAssinatura').addEventListener('click', () => {
    // Valida se o canvas não está em branco
    const canvasVazio = document.createElement('canvas');
    canvasVazio.width = canvas.width; canvasVazio.height = canvas.height;
    if(canvas.toDataURL() === canvasVazio.toDataURL()) {
        alert("Por favor, colete a assinatura antes de salvar.");
        return;
    }

    assinaturaDataUrl = canvas.toDataURL();
    document.getElementById('areaAssinaturaSalva').innerHTML = `<img src="${assinaturaDataUrl}">`;
    modalAssinatura.style.display = 'none';
    
    // Habilita liberação da trava de encerramento do cronômetro
    document.getElementById('btnFinalizarOS').disabled = false;
    document.getElementById('btnFinalizarOS').innerHTML = `<i class="fa-solid fa-stop"></i> Finalizar Contagem e Fechar OS`;
});

// FINALIZAÇÃO COMPLETA DA ORDEM DE SERVIÇO
document.getElementById('btnFinalizarOS').addEventListener('click', function() {
    clearInterval(cronometroInterval);
    statusCronometro = 'finalizado';
    
    let horaFim = new Date().toLocaleTimeString('pt-BR');
    historicoTempos.push({ tipo: 'Finalização Autorizada', hora: horaFim, tempoRef: tempoSegundos });
    atualizarHistoricoDOM();
    
    this.disabled = true;
    btnIniciar.disabled = true;
    btnPausar.disabled = true;
    this.innerHTML = `<i class="fa-solid fa-check-double"></i> OS Finalizada com Sucesso`;
    
    // Libera botão do PDF
    document.getElementById('btnGerarPdf').disabled = false;
});

// MONTAGEM DO LAYOUT DO PDF (ITEM 11)
document.getElementById('btnGerarPdf').addEventListener('click', () => {
    const template = document.getElementById('pdfTemplate');
    
    // Captura valores dos inputs
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
    
    // Gera linhas do histórico de tempo para o relatório
    let logTemposHtml = '';
    historicoTempos.forEach(t => {
        logTemposHtml += `<p>• <strong>[${t.hour || t.hora}]</strong> ${t.tipo} - Parcial: ${formatarTempo(t.tempoRef)}</p>`;
    });

    // Estrutura fotos no PDF
    let fotosHtml = '';
    fotosArray.forEach(fotoBase64 => {
        fotosHtml += `<div class="pdf-foto-moldura"><img src="${fotoBase64}"></div>`;
    });
    if(fotosArray.length === 0) fotosHtml = '<p style="font-style:italic; font-size:11px;">Nenhuma evidência fotográfica registrada.</p>';

    // Injeta o HTML completo formatado dentro do container oculto
    template.innerHTML = `
        <div class="pdf-page">
            <div class="pdf-header">
                <div class="pdf-title">
                    <h1>MARLIFT EMPILHADEIRAS</h1>
                    <span>RELATÓRIO DE ATENDIMENTO TÉCNICO</span>
                </div>
                <div style="text-align: right; font-size: 11px;">
                    <p><strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    <p><strong>Duração Total:</strong> ${formatarTempo(tempoSegundos)}</p>
                </div>
            </div>

            <div class="pdf-grid">
                <!-- CLIENTE -->
                <div class="pdf-block pdf-full">
                    <h3>1. Dados do Cliente</h3>
                    <p><strong>Razão Social:</strong> ${cliNome} | <strong>CNPJ:</strong> ${cliCnpj}</p>
                    <p><strong>Endereço:</strong> ${cliEndereco}</p>
                    <p><strong>Contato:</strong> ${cliContato} | <strong>Tel:</strong> ${cliTelefone} | <strong>E-mail:</strong> ${cliEmail}</p>
                </div>

                <!-- EQUIPAMENTO -->
                <div class="pdf-block">
                    <h3>2. Dados da Empilhadeira</h3>
                    <p><strong>Marca / Modelo:</strong> ${eqMarca} ${eqModelo}</p>
                    <p><strong>Combustível:</strong> ${eqCombustivel}</p>
                    <p><strong>Nº de Série:</strong> ${eqSerie}</p>
                </div>

                <!-- TRIAGEM -->
                <div class="pdf-block">
                    <h3>3 & 4. Informações do Chamado</h3>
                    <p><strong>Tipo de Atendimento:</strong> ${tipoChamado}</p>
                    <p><strong>Defeito Relatado:</strong> ${defeito}</p>
                </div>

                <!-- CRONOMETRO -->
                <div class="pdf-block pdf-full">
                    <h3>5. Histórico Detalhado dos Tempos (Mapeamento de Horas)</h3>
                    ${logTemposHtml}
                    <p style="margin-top:5px; font-weight:bold; border-top:1px dashed #ddd; padding-top:4px;">Tempo de Mão de Obra Faturável: ${formatarTempo(tempoSegundos)}</p>
                </div>

                <!-- LAUDO -->
                <div class="pdf-block pdf-full">
                    <h3>6. Descrição do Serviço Executado</h3>
                    <div class="pdf-textarea">${servico}</div>
                </div>

                <!-- PEÇAS -->
                <div class="pdf-block pdf-full">
                    <h3>8. Peças Aplicadas</h3>
                    <div class="pdf-textarea">${pecas}</div>
                </div>

                <!-- OBS -->
                <div class="pdf-block pdf-full">
                    <h3>9. Observações Gerais</h3>
                    <div class="pdf-textarea">${obs}</div>
                </div>

                <!-- FOTOS -->
                <div class="pdf-block pdf-full">
                    <h3>7. Evidências Fotográficas Carimbadas (Geolocalização / Data / Hora)</h3>
                    <div class="pdf-images-container pdf-fotos-container">
                        ${fotosHtml}
                    </div>
                </div>
            </div>

            <!-- ASSINATURAS -->
            <div class="pdf-footer-signatures">
                <div class="pdf-sig-box">
                    <p>Técnico Responsável</p>
                    <p style="margin-top:15px; font-weight:bold;">MARLIFT EMPILHADEIRAS</p>
                </div>
                <div class="pdf-sig-box">
                    <img src="${assinaturaDataUrl}">
                    <p>Carimbo / Assinatura do Cliente</p>
                    <p style="font-weight:bold;">${cliNome}</p>
                </div>
            </div>
        </div>
    `;

    // Configuração do html2pdf para gerar folha A4 perfeita sem quebras erradas
    const opt = {
        margin: 0,
        filename: `OS_Marlift_${cliNome.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Executa e faz o download direto no dispositivo
    html2pdf().set(opt).from(template.innerHTML).save();
});
