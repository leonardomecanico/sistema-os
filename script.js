// ==========================================
// 1. BANCO DE CLIENTES OFFLINE - VERSÃO BLINDADA
// ==========================================
function inicializarGerenciadorClientes() {
    console.log("Marlift: Inicializando gerenciador de clientes...");
    
    // 1. Carrega dados antigos salvos com segurança
    try {
        const clientesSalvos = localStorage.getItem('marlift_banco_clientes');
        bancoClientes = clientesSalvos ? JSON.parse(clientesSalvos) : [];
    } catch (e) {
        console.error("Erro ao ler banco de clientes, resetando...", e);
        bancoClientes = [];
    }

    // Alimenta o menu suspenso de busca na tela principal
    atualizarSelectClientes();

    // 2. Evento de seleção do cliente no menu suspenso
    const buscaSelect = document.getElementById('buscaCliente');
    if (buscaSelect) {
        buscaSelect.addEventListener('change', (e) => {
            const idSelected = e.target.value;
            if (!idSelected) return;
            
            const cli = bancoClientes.find(c => c.id === idSelected);
            if (cli) {
                // Preenche os dados da OS na tela principal
                if(document.getElementById('cliNome')) document.getElementById('cliNome').value = cli.nome || '';
                if(document.getElementById('cliCnpj')) document.getElementById('cliCnpj').value = cli.cnpj || '';
                if(document.getElementById('cliEndereco')) document.getElementById('cliEndereco').value = cli.endereco || '';
                if(document.getElementById('cliContato')) document.getElementById('cliContato').value = cli.contato || '';
                if(document.getElementById('cliEmail')) document.getElementById('cliEmail').value = cli.email || '';
                if(document.getElementById('cliTelefone')) document.getElementById('cliTelefone').value = cli.telefone || '';
                if(document.getElementById('eqMarca')) document.getElementById('eqMarca').value = cli.marca || '';
                if(document.getElementById('eqModelo')) document.getElementById('eqModelo').value = cli.modelo || '';
                if(document.getElementById('eqCombustivel')) document.getElementById('eqCombustivel').value = cli.combustivel || '';
                if(document.getElementById('eqSerie')) document.getElementById('eqSerie').value = cli.serie || '';
                
                salvarDadosLocalStorage();
                alert(`Marlift: Dados de ${cli.nome} carregados na OS!`);
            }
        });
    }

    // 3. FUNÇÃO INTERNA QUE PEGA OS DADOS E SALVA DE VERDADE
    const executarSalvamentoCliente = () => {
        console.log("Marlift: Tentando processar dados do formulário...");
        
        // Captura os elementos de forma segura (se algum ID falhar, o script usa vazio e não quebra)
        const elNome = document.getElementById('cadCliNome') || document.getElementById('cliNomeCad');
        const elCnpj = document.getElementById('cadCliCnpj') || document.getElementById('cliCnpjCad');
        const elEndereco = document.getElementById('cadCliEndereco') || document.getElementById('cliEnderecoCad');
        const elContato = document.getElementById('cadCliContato') || document.getElementById('cliContatoCad');
        const elEmail = document.getElementById('cadCliEmail') || document.getElementById('cliEmailCad');
        const elTelefone = document.getElementById('cadCliTelefone') || document.getElementById('cliTelefoneCad');
        
        const elMarca = document.getElementById('cadEqMarca') || document.getElementById('eqMarcaCad');
        const elModelo = document.getElementById('cadEqModelo') || document.getElementById('eqModeloCad');
        const elCombustivel = document.getElementById('cadEqCombustivel') || document.getElementById('eqCombustivelCad');
        const elSerie = document.getElementById('cadEqSerie') || document.getElementById('eqSerieCad');

        // Extrai os textos limpando espaços em branco
        const nome = elNome ? elNome.value.trim() : "";
        const endereco = elEndereco ? elEndereco.value.trim() : "";
        const marca = elMarca ? elMarca.value.trim() : "";
        const modelo = elModelo ? elModelo.value.trim() : "";
        const serie = elSerie ? elSerie.value.trim() : "";

        // Validação básica para não salvar poeira no banco de dados
        if (!nome) {
            alert("Por favor, digite pelo menos o Nome do Cliente para cadastrar.");
            return false;
        }

        // Monta a ficha técnica do cliente e da empilhadeira
        const novoCliente = {
            id: Date.now().toString(), // Gera um número de registro único baseado no relógio
            nome: nome,
            cnpj: elCnpj ? elCnpj.value.trim() : "",
            endereco: endereco,
            contato: elContato ? elContato.value.trim() : "",
            email: elEmail ? elEmail.value.trim() : "",
            telefone: elTelefone ? elTelefone.value.trim() : "",
            marca: marca,
            modelo: modelo,
            combustivel: elCombustivel ? elCombustivel.value : "GLP",
            serie: serie
        };

        // Salva na memória ativa do sistema
        bancoClientes.push(novoCliente);
        
        // Grava fisicamente no armazenamento offline do navegador
        localStorage.setItem('marlift_banco_clientes', JSON.stringify(bancoClientes));
        console.log("Marlift: Cliente gravado com sucesso no LocalStorage!", novoCliente);
        
        // Atualiza a lista suspensa na tela de fundo imediatamente
        atualizarSelectClientes();
        
        // Tenta limpar os campos digitados para o próximo cadastro
        const formCad = document.getElementById('cadClienteForm');
        if (formCad) formCad.reset();
        
        // Fecha as janelas modais abertas
        fecharModais();
        
        alert(`Sucesso: ${nome} foi cadastrado e já está disponível na busca rápida!`);
        return true;
    };

    // 4. Bloqueia o formulário HTML de recarregar a tela (comportamento padrão de formulários)
    const formCadastro = document.getElementById('cadClienteForm');
    if (formCadastro) {
        formCadastro.onsubmit = function(evento) {
            evento.preventDefault(); // Impede a página de piscar/recarregar
            executarSalvamentoCliente();
            return false;
        };
    }

    // 5. Garante o clique direto no botão físico de Salvar por segurança extra
    const btnSalvar = document.getElementById('btnSalvarNovoCliente');
    if (btnSalvar) {
        btnSalvar.onclick = function(evento) {
            if(evento) evento.preventDefault();
            executarSalvamentoCliente();
        };
    }
}
