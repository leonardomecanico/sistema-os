/* DIAGNÓSTICO DE BOTÃO - COPIE ISSO NO SEU ARQUIVO JS */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema carregado. Testando botões...");

    const todosOsBotoes = document.querySelectorAll('button');
    todosOsBotoes.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log("Botão clicado! ID do botão:", e.target.id || "Sem ID", "Texto:", e.target.innerText);
            
            // Se o botão for de salvar, vamos forçar uma ação simples
            if (e.target.innerText.includes("Salvar") || e.target.id.includes("Salvar")) {
                alert("O sistema detectou o clique no botão de salvar. ID: " + e.target.id);
            }
        });
    });
});
