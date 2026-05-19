// VARIÁVEIS DE CONTROLE GLOBAL
let cronometroInterval = null;
let tempoSegundos = 0;
let statusCronometro = 'parado'; // parado, rodando, pausado
let historicoTempos = [];
let fotosArray = []; // Guarda as fotos carimbadas em Base64
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

// CAPTURA DE GPS PARA O CARIMBO DAS FOTOS
function capturarCoordenadasGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            geolocalizacaoAtual = `Lat: ${position.coords.latitude.toFixed(5)}, Long: ${position.coords.longitude.toFixed(5)}`;
        }, () => {
            geolocalizacaoAtual = "GPS Indisponível/Negado";
        }, { enableHighAccuracy: true });
    }
}

// GERENCIAMENTO DE FOTOS COM CARIMBO
document.getElementById('inputFotos').addEventListener('change', function(e) {
    const arquivos = Array.from(e.target.files);
    
    arquivos.forEach(arquivo => {
        if (fotosArray.length >= 15) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const imgObj = new Image();
            imgObj.onload = function() {
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
    this.value = ''; 
});

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

// CONTROLE DO PAINEL DE ASSINATURA
const btnAbrirAssinatura = document.getElementById('btnAbrirAssinatura');
btnAbrirAssinatura.addEventListener('click', () => {
    modalAssinatura.style.display = 'flex';
    redimensionarCanvasAssinatura();
});

function redimensionarCanvasAssinatura() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 180;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2c3e50';
}

function configurarCanvasTouch() {
    const obtenerPosicaoMouseTouch = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clienteX = e.touches ? e.touches[0].clientX : e.clientX;
        const clienteY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clienteX - rect.left, y: clienteY - rect.top };
    };

    const iniciarDesenho = (e) => {
        desenhando = true;
        const pos = obtenerPosicaoMouseTouch(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    };

    const desenhar = (e) => {
        if (!desenhando) return;
        const pos = obtenerPosicaoMouseTouch(e);
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
    const canvasVazio = document.createElement('canvas');
    canvasVazio.width = canvas.width; canvasVazio.height = canvas.height;
    if(canvas.toDataURL() === canvasVazio.toDataURL()) {
        alert("Por favor, colete a assinatura antes de salvar.");
        return;
    }

    assinaturaDataUrl = canvas.toDataURL();
    document.getElementById('areaAssinaturaSalva').innerHTML = `<img src="${assinaturaDataUrl}">`;
    modalAssinatura.style.display = 'none';
    
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
    
    document.getElementById('btnGerarPdf').disabled = false;
});

// MONTAGEM E GERAÇÃO DO ATCHIVO PDF
document.getElementById('btnGerarPdf').addEventListener('click', () => {
    const template = document.getElementById('pdfTemplate');
    
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
        logTemposHtml += `<p>• <strong>[${t.hora}]</strong> ${t.tipo} - Parcial: ${formatarTempo(t.tempoRef)}</p>`;
    });

    let fotosHtml = '';
    fotosArray.forEach(fotoBase64 => {
        fotosHtml += `<div class="pdf-foto-moldura"><img src="${fotoBase64}"></div>`;
    });
    if(fotosArray.length === 0) fotosHtml = '<p style="font-style:italic; font-size:11px;">Nenhuma evidência fotográfica registrada.</p>';

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
                <div class="pdf-block pdf-full">
                    <h3>1. Dados do Cliente</h3>
                    <p><strong>Razão Social:</strong> ${cliNome} | <strong>CNPJ:</strong> ${cliCnpj}</p>
                    <p><strong>Endereço:</strong> ${cliEndereco}</p>
                    <p><strong>Contato:</strong> ${cliContato} | <strong>Tel:</strong> ${cliTelefone} | <strong>E-mail:</strong> ${cliEmail}</p>
                </div>

                <div class="pdf-block">
                    <h3>2. Dados da Empilhadeira</h3>
                    <p><strong>Marca / Modelo:</strong> ${eqMarca} ${eqModelo}</p>
                    <p><strong>Combustível:</strong> ${eqCombustivel}</p>
                    <p><strong>Nº de Série:</strong> ${eqSerie}</p>
                </div>

                <div class="pdf-block">
                    <h3>3 & 4. Informações do Chamado</h3>
                    <p><strong>Tipo de Atendimento:</strong> ${tipoChamado}</p>
                    <p><strong>Defeito Relatado:</strong> ${defeito}</p>
                </div>

                <div class="pdf-block pdf-full">
                    <h3>5. Histórico Detalhado dos Tempos (Mapeamento de Horas)</h3>
                    ${logTemposHtml}
                    <p style="margin-top:5px; font-weight:bold; border-top:1px dashed #ddd; padding-top:4px;">Tempo de Mão de Obra Faturável: ${formatarTempo(tempoSegundos)}</p>
                </div>

                <div class="pdf-block pdf-full">
                    <h3>6. Descrição do Serviço Executado</h3>
                    <div class="pdf-textarea">${servico}</div>
                </div>

                <div class="pdf-block pdf-full">
                    <h3>8. Peças Aplicadas</h3>
                    <div class="pdf-textarea">${pecas}</div>
                </div>

                <div class="pdf-block pdf-full">
                    <h3>9. Observações Gerais</h3>
                    <div class="pdf-textarea">${obs}</div>
                </div>

                <div class="pdf-block pdf-full">
                    <h3>7. Evidências Fotográficas Carimbadas (Geolocalização / Data / Hora)</h3>
                    <div class="pdf-fotos-container">
                        ${fotosHtml}
                    </div>
                </div>
            </div>

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

    const opt = {
        margin: 0,
        filename: `OS_Marlift_${cliNome.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(template.innerHTML).save();
});const URL_API = "https://script.google.com/macros/s/AKfycbyMEXY3mmLayq2arquaT5QLHvMaDUQrNNc1X8UqtO4xR4GJJYNVSUuXoPbOEqOwBKBEOg/exec";

// 1. CARREGAR CLIENTES DA PLANILHA AO ABRIR O APP
window.onload = function() {
    fetch(URL_API)
        .then(res => res.json())
        .then(clientes => {
            const datalist = document.getElementById('listaClientes');
            clientes.forEach(c => {
                let option = document.createElement('option');
                option.value = c.nome;
                datalist.appendChild(option);
            });
            // Guardar dados para auto-preencher depois
            window.dadosClientes = clientes;
        });
};

// 2. AUTO-PREENCHER CAMPOS AO SELECIONAR CLIENTE
document.getElementById('cliNome').addEventListener('input', function() {
    const clienteEncontrado = window.dadosClientes.find(c => c.nome === this.value);
    if (clienteEncontrado) {
        document.getElementById('cliCnpj').value = clienteEncontrado.cnpj;
        document.getElementById('cliEndereco').value = clienteEncontrado.endereco;
        document.getElementById('cliContato').value = clienteEncontrado.contato;
        document.getElementById('cliEmail').value = clienteEncontrado.email;
        document.getElementById('cliTelefone').value = clienteEncontrado.telefone;
    }
});

// 3. SALVAR NOVO CLIENTE NA PLANILHA
document.getElementById('btnSalvarCliente').addEventListener('click', function() {
    const btn = this;
    const dados = {
        nome: document.getElementById('cliNome').value,
        cnpj: document.getElementById('cliCnpj').value,
        endereco: document.getElementById('cliEndereco').value,
        contato: document.getElementById('cliContato').value,
        email: document.getElementById('cliEmail').value,
        telefone: document.getElementById('cliTelefone').value
    };

    if (!dados.nome) return alert("Preencha o nome!");

    btn.disabled = true;
    btn.innerText = "ENVIANDO...";

    fetch(URL_API, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(dados)
    }).then(() => {
        alert("Cliente salvo na planilha OS-MARLIFT!");
        btn.disabled = false;
        btn.innerText = "SALVAR CLIENTE";
    });
});
