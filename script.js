/* =============================================================
   MARLIFT SERVICE - CÓDIGO COMPLETO (Versão Final)
   ============================================================= */

// 1. INICIALIZAÇÃO: Remove login e carrega a tela
document.addEventListener('DOMContentLoaded', () => {
    const login = document.getElementById('loginScreen');
    if (login) login.style.display = 'none';
    
    // Inicia a navegação e renderiza o histórico
    switchTab('tab-dash');
    if (typeof renderHist === 'function') renderHist();
});

// 2. NAVEGAÇÃO ENTRE ABAS
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(nav => {
        nav.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
    }
    
    const navBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (navBtn) navBtn.classList.add('active');
}

// 3. SALVAMENTO AUTOMÁTICO (Captura Horários Manuais)
function autoSave() {
    // Captura campos do formulário
    const dados = {
        cliNome: document.getElementById('cNome')?.value,
        timeInicio: document.getElementById('timeInicio')?.value,
        timePausa: document.getElementById('timePausa')?.value,
        timeFim: document.getElementById('timeFim')?.value,
        data: new Date().toISOString()
    };
    
    // Salva no LocalStorage
    localStorage.setItem('os_em_andamento', JSON.stringify(dados));
}

// 4. CORREÇÃO: Geração de PDF com Fotos
async function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Cabeçalho básico
    doc.setFontSize(16);
    doc.text("Ordem de Servico: " + (document.getElementById('osNum')?.innerText || '---'), 10, 15);
    doc.setFontSize(12);
    doc.text("Cliente: " + (document.getElementById('cNome')?.value || '---'), 10, 25);
    doc.text("Inicio: " + (document.getElementById('timeInicio')?.value || '--:--') + 
             " | Pausa: " + (document.getElementById('timePausa')?.value || '--:--') + 
             " | Fim: " + (document.getElementById('timeFim')?.value || '--:--'), 10, 35);

    // Captura todas as imagens no grid
    const fotos = document.querySelectorAll('.photos-grid img');
    let y = 50;

    for (let i = 0; i < fotos.length; i++) {
        // Se a página encher, cria uma nova
        if (y > 220) {
            doc.addPage();
            y = 10;
        }
        try {
            doc.addImage(fotos[i].src, 'JPEG', 10, y, 60, 60);
            y += 70;
        } catch (e) {
            console.error("Erro ao adicionar imagem no PDF", e);
        }
    }
    
    doc.save('OS_Marlift.pdf');
}

// 5. NOVA OS (Limpa os campos para um novo atendimento)
function novaOS() {
    document.getElementById('cNome').value = '';
    document.getElementById('timeInicio').value = '';
    document.getElementById('timePausa').value = '';
    document.getElementById('timeFim').value = '';
    // Limpa fotos também se tiver um container
    const grid = document.querySelector('.photos-grid');
    if (grid) grid.innerHTML = '';
    
    switchTab('tab-os');
}

// Nota: Mantenha suas funções auxiliares originais (fmtNum, esc, etc) abaixo aqui se existirem.
