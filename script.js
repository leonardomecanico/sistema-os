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

// OUVIDORES PARA SALVAR EM TEMPO REAL CONFORME DIGITA
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
        if (el && valorSalvo) el.value = valorSalvo;
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
            // Se fechou rodando, retoma a contagem automaticamente
            if (btnIniciar) btnIniciar.disabled = true;
            if (btnPausar) btnPausar.disabled = false;
            let tempoInterrupcao = Math.floor((Date.now() - localStorage.getItem('marlift_lastTimestamp')) / 1000);
            if (!isNaN(tempoInterrupcao) && tempoInterrupcao > 0) {
                tempoSegundos += tempoInterrupcao; // Soma o tempo que a página ficou fechada
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
const btnIniciar = document.getElementById('btnIniciar');
const btnPausar = document.getElementById('btnPausar');
const divHistorico = document.getElementById('historicoTempos');

function rodarContagemCronometro() {
    const displayTempo = document.getElementById('cronometroTempo');
    cronometroInterval = setInterval(() => {
        tempoSegundos++;
        if (displayTempo) displayTempo.textContent = formatarTempo(tempoSegundos);
        localStorage.setItem('marlift_tempoSegundos', tempoSegundos);
        localStorage.setItem('marlift_lastTimestamp', Date.now());
    }, 1000);
}

if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
        if (statusCronometro === 'parado' || statusCronouter === 'pausado' || statusCronometro === 'pausado') {
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
    salvarEstadoEstrutural();
};

// CONTROLE DO PAINEL DE ASSINATURA
const btnAbrirAssinatura = document.getElementById('btnAbrirAssinatura');
if (btnAbrirAssinatura) {
    btnAbrirAssinatura.addEventListener('click', () => {
        if (modalAssinatura) {
            modalAssinatura.style.display = 'flex';
            redimensionarCanvasAssinatura();
        }
    });
}

function redimensionarCanvasAssinatura() {
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth || 300;
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
        if(e.touches) e.preventDefault();
    };

    const desenhar = (e) => {
        if (!desenhando) return;
        const pos = obtenerPosicaoMouseTouch(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if(e.touches) e.preventDefault();
    };

    const pararDesenho = () => { desenhando = false; };

    canvas.addEventListener('mousedown', iniciarDesenho);
    canvas.addEventListener('mousemove', desenhar);
    canvas.addEventListener('mouseup', pararDesenho);

    canvas.addEventListener('touchstart', iniciarDesenho, {passive: false});
    canvas.addEventListener('touchmove', desenhar, {passive: false});
    canvas.addEventListener('touchend', pararDesenho);
}

const btnLimparAssinatura = document.getElementById('btnLimparAssinatura');
if (btnLimparAssinatura) {
    btnLimparAssinatura.addEventListener('click', () => {
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}

const btnSalvarAssinatura = document.getElementById('btnSalvarAssinatura');
if (btnSalvarAssinatura) {
    btnSalvarAssinatura.addEventListener('click', () => {
        if (!canvas) return;
        assinaturaDataUrl = canvas.toDataURL();
        const areaAssinaturaSalva = document.getElementById('areaAssinaturaSalva');
        if (areaAssinaturaSalva) areaAssinaturaSalva.innerHTML = `<img src="${assinaturaDataUrl}" style="max-height:80px;">`;
        if (modalAssinatura) modalAssinatura.style.display = 'none';
        
        const btnFinalizarOS = document.getElementById('btnFinalizarOS');
        if (btnFinalizarOS) btnFinalizarOS.disabled = false;
        salvarEstadoEstrutural();
    });
}

// FINALIZAÇÃO COMPLETA DA ORDEM DE SERVIÇO (LIMPA O CACHE APÓS CONCLUIR)
const btnFinalizarOS = document.getElementById('btnFinalizarOS');
if (btnFinalizarOS) {
    btnFinalizarOS.addEventListener('click', function() {
        clearInterval(cronometroInterval);
        statusCronometro = 'finalizado';
        
        let horaFim = new Date().toLocaleTimeString('pt-BR');
        historicoTempos.push({ tipo: 'Finalização Autorizada', hora: horaFim, tempoRef: tempoSegundos });
        atualizarHistoricoDOM();
        
        this.innerHTML = `<i class="fa-solid fa-check-double"></i> OS FINALIZADA`;
        this.style.backgroundColor = "#6c757d";
        this.disabled = true;
        
        const btnGerarPdf = document.getElementById('btnGerarPdf');
        if (btnGerarPdf) {
            btnGerarPdf.disabled = false;
            btnGerarPdf.style.backgroundColor = "#ff6600";
        }
        salvarEstadoEstrutural();
        alert("Ordem de Serviço finalizada com sucesso! O relatório PDF foi liberado.");
    });
}

// FUNÇÃO PARA LIMPAR O BANCO DE DADOS LOCAL APÓS GERAR O PDF (PARA A PRÓXIMA OS VIR EM BRANCO)
function limparCacheOS() {
    const chaves = [
        'marlift_tempoSegundos', 'marlift_statusCronometro', 'marlift_historicoTempos', 
        'marlift_fotosArray', 'marlift_assinaturaDataUrl', 'marlift_lastTimestamp',
        'marlift_cliNome', 'marlift_cliCnpj', 'marlift_cliEndereco', 'marlift_cliContato', 
        'marlift_cliEmail', 'marlift_cliTelefone', 'marlift_eqMarca', 'marlift_eqModelo', 
        'marlift_eqCombustivel', 'marlift_eqSerie', 'marlift_servicoExecutado', 'marlift_pecasAplicadas'
    ];
    chaves.forEach(chave => localStorage.removeItem(chave));
}

// MONTAGEM E GERAÇÃO DO ARQUIVO PDF
const btnGerarPdf = document.getElementById('btnGerarPdf');
if (btnGerarPdf) {
    btnGerarPdf.addEventListener('click', () => {
        const template = document.getElementById('pdfTemplate');
        if (!template) {
            alert("Erro: O local de montagem do PDF (pdfTemplate) não existe no HTML.");
            return;
        }
        
        template.style.display = 'block';

        const pegarValor = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '-';
        };

        const dados = {
            cliente: pegarValor('cliNome'),
            cnpj: pegarValor('cliCnpj'),
            end: pegarValor('cliEndereco'),
            contato: pegarValor('cliContato'),
            email: pegarValor('cliEmail'),
            tel: pegarValor('cliTelefone'),
            marca: pegarValor('eqMarca'),
            modelo: pegarValor('eqModelo'),
            comb: pegarValor('eqCombustivel'),
            serie: pegarValor('eqSerie'),
            servico: pegarValor('servicoExecutado') !== '' ? pegarValor('servicoExecutado') : 'Laudo técnico não preenchido.',
            pecas: pegarValor('pecasAplicadas') !== '' ? pegarValor('pecasAplicadas') : 'Nenhuma peça aplicada.'
        };

        let logTemposHtml = historicoTempos.map(t => 
            `<p style="font-size:11px; margin:2px 0;">• <strong>[${t.hora}]</strong> ${t.tipo} - Parcial: ${formatarTempo(t.tempoRef)}</p>`
        ).join('');

        let fotosHtml = fotosArray.map(foto => 
            `<div style="display:inline-block; width:30%; margin:5px;"><img src="${foto}" style="width:100%; border:1px solid #ddd; border-radius:4px;"></div>`
        ).join('');
        if(fotosArray.length === 0) fotosHtml = '<p style="font-style:italic; font-size:11px;">Nenhuma evidência fotográfica registrada.</p>';

        template.innerHTML = `
            <div style="padding: 20px; font-family: Arial, sans-serif; color: #333; background: #fff;">
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
                    <h3 style="font-size: 14px; margin-top: 0; color: #ff6600;">1. Dados do Cliente</h3>
                    <p style="font-size: 12px; margin: 3px 0;"><strong>Razão Social:</strong> ${dados.cliente} | <strong>CNPJ:</strong> ${dados.cnpj}</p>
                    <p style="font-size: 12px; margin: 3px 0;"><strong>Endereço:</strong> ${dados.end}</p>
                    <p style="font-size: 12px; margin: 3px 0;"><strong>Contato:</strong> ${dados.contato} | <strong>Tel:</strong> ${dados.tel}</p>
                </div>

                <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                    <h3 style="font-size: 14px; margin-top: 0; color: #ff6600;">2. Dados do Equipamento</h3>
                    <p style="font-size: 12px; margin: 3px 0;"><strong>Equipamento:</strong> ${dados.marca} ${dados.modelo} (${dados.comb}) | <strong>Série:</strong> ${dados.serie}</p>
                </div>

                <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                    <h3 style="font-size: 14px; margin-top: 0; color: #ff6600;">3. Histórico de Horas Mão de Obra</h3>
                    ${logTemposHtml}
                    <p style="font-size: 12px; font-weight: bold; margin-top: 5px; border-top: 1px dashed #ddd; padding-top:4px;">Tempo Faturável: ${formatarTempo(tempoSegundos)}</p>
                </div>

                <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                    <h3 style="font-size: 14px; margin-top: 0; color: #ff6600;">4. Laudo Técnico / Serviço Executado</h3>
                    <p style="font-size: 12px; white-space: pre-wrap;">${dados.servico}</p>
                </div>

                <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                    <h3 style="font-size: 14px; margin-top: 0; color: #ff6600;">5. Peças Aplicadas</h3>
                    <p style="font-size: 12px; white-space: pre-wrap;">${dados.pecas}</p>
                </div>

                <div style="margin-top: 10px; border: 1px solid #ddd; padding: 10px;">
                    <h3 style="font-size: 14px; margin-top: 0; color: #ff6600;">6. Evidências Fotográficas</h3>
                    <div style="text-align: center;">${fotosHtml}</div>
                </div>

                <div style="margin-top: 40px; display: flex; justify-content: space-around; text-align: center;">
                    <div style="width: 45%; border-top: 1px solid #333; padding-top: 5px;">
                        <p style="font-size: 11px; font-weight:bold;">MARLIFT EMPILHADEIRAS</p>
                        <p style="font-size: 10px; color:#555;">Técnico Responsável</p>
                    </div>
                    <div style="width: 45%; border-top: 1px solid #333; padding-top: 5px;">
                        ${assinaturaDataUrl ? `<img src="${assinaturaDataUrl}" style="max-height: 50px; display: block; margin: 0 auto;">` : '<div style="height:50px;"></div>'}
                        <p style="font-size: 11px; font-weight:bold;">${dados.cliente}</p>
                        <p style="font-size: 10px; color:#555;">Assinatura do Cliente</p>
                    </div>
                </div>
            </div>
        `;

        const opt = {
            margin: 5,
            filename: `OS_Marlift_${dados.cliente.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(template).save().then(() => {
                template.style.display = 'none';
                limparCacheOS(); // Limpa a memória para a próxima OS vir em branco
                setTimeout(() => { location.reload(); }, 1500); // Dá um refresh automático
            }).catch(err => {
                alert("Erro ao processar PDF: " + err);
                template.style.display = 'none';
            });
        } else {
            alert("Biblioteca de PDF não carregada no HTML.");
            template.style.display = 'none';
        }
    });
}
