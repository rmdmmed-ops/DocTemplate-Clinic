# DocTemplate 4.12.0

Correções aprovadas na auditoria de busca e fluidez.

- Busca continua por título completo, a cada caractere, sem acentos/maiúsculas.
- Removida limpeza no blur que podia mover resultados antes do clique.
- Começar nova escolha limpa as seções dependentes, preservando os alvos do menu.
- Interações externas limpam somente a navegação; não apagam o documento escolhido.
- Avatar completa lado pendente sem duplicar região ou trocar sua identidade.
- Novas seleções abrem o original. Rascunhos são preservados por modelo e recuperados explicitamente em Mais ações, com confirmação do atendimento.
- Personalizar modelo não promove automaticamente um rascunho clínico.
- Salvamento com erro impede reinício silencioso do atendimento.
- Avatar reutilizado por vista e caixas reutilizadas quando a estrutura não muda; preservação de foco/rolagem ao atualizar texto.
- Ações secundárias agrupadas; copiar tudo e copiar cada caixa permanecem disponíveis.
- Versão visual, título, referências e cache alinhados em 4.12.0. Atualização solicitada pelo usuário salva antes de recarregar.

Validação: `node --test tests/core.test.cjs tests/regressions-412.cjs`.
Os testes de regressão executam funções reais com renderização simulada. Não substituem cliques em navegador, inspeção visual, clipboard real nem teste offline.
A suíte DOM legada depende de linkedom, ausente neste ambiente. Não foi executada.
Nenhum modelo clínico foi modificado.
