# DocTemplate — reconstrução 5.0

Evolução da experiência 3.0/3.1/3.2 com os 244 modelos e 13 módulos da versão 4.1, sem revisão ou alteração do conteúdo clínico original.

## Uso

- Busca global e por módulo: aceita palavras em qualquer ordem, ignora acentos e mantém o foco. Não limita silenciosamente os resultados.
- Favoritos e recentes ficam na biblioteca. Módulos e modelos próprios podem ser criados; a personalização permite renomear, adicionar e excluir caixas.
- Região, lado e mecanismo atualizam o documento. A seleção por lista é uma alternativa ao mapa vetorial. Frente e verso usam a lateralidade do paciente.
- Modelos específicos de uma região mantêm sua região, pois seus exames e trechos clínicos não podem ser transferidos automaticamente para outra anatomia.
- Revisar o documento gera um rascunho em memória. As variáveis não tocadas continuam vinculadas às seleções. Editar diretamente o valor de uma variável torna apenas aquela ocorrência literal.
- Personalizar modelo altera permanentemente a estrutura e mostra os marcadores. O salvamento é automático; concluir a personalização descarta o rascunho anterior daquele modelo.
- Copiar uma caixa e copiar tudo usam a versão mais recente do texto. Variáveis não resolvidas bloqueiam a cópia; falhas de clipboard não mostram sucesso.

## Dados e atualização

A chave `doctemplate-ortopedia:4.0` é preservada. Edições antigas já concretizadas pela 4.1 não são convertidas de volta por adivinhação; é possível restaurar o modelo original ou inserir variáveis no modo de personalização. Importações são validadas antes da mesclagem. Módulos próprios, favoritos, recentes, exclusões e modelos personalizados são preservados.

Nenhum campo solicita identificação de paciente. Rascunhos de documentos não são salvos em disco nem enviados a servidor. Os modelos personalizados ficam no armazenamento do navegador; portanto não se deve inserir dados identificáveis nesses modelos. Este aplicativo não diagnostica nem valida os achados escritos nos modelos.

O aplicativo instalado opera offline após a primeira carga completa. Uma atualização só é ativada pelo usuário. O service worker mantém HTML e scripts da mesma versão, sem apagar caches de outros aplicativos.

Ao migrar para domínio próprio, exportar no endereço antigo e importar no novo: os navegadores isolam o armazenamento por domínio. Todos os endereços de assets, manifesto e service worker são relativos e funcionam em subpastas do GitHub Pages.

## Desenvolvimento e verificação

Requer Node.js 22 ou posterior. Sem dependências de execução, CDN ou chamadas de IA. `node scripts/serve.cjs` abre o servidor local na porta 4173. `node scripts/build.cjs` valida JavaScript e o catálogo e prepara `dist/`.

`node --test tests/core.test.cjs` verifica busca, edição com variáveis e importação. `node tests/browser.cjs` usa Playwright disponível no ambiente para testar os fluxos reais; `BROWSER_CHANNEL=msedge` usa o Edge instalado. A suite foi executada com Playwright 1.62.1. Os screenshots locais de verificação são gerados em `qa/` e não fazem parte da publicação.

Publicação atual: arquivos estáticos da raiz no GitHub Pages. A versão clássica permanece em `3.2/`. O commit anterior `74c225a5f56b9c9eef769252964b87de940435fc` permite recuperar integralmente a 4.1.

Silhuetas: MIT, Copyright (c) 2022 ELABBASSI Hicham, projeto react-native-body-highlighter. Ver `anatomy/LICENSE.txt` e `anatomy/ATTRIBUTION.md`.

## Pendências clínicas preservadas

Triagem e fusão dos modelos, CID por região, CID de retirada de material, novos modelos de fratura/luxação/trauma cervical e cobertura de internação seguem dependentes de revisão médica. A reconstrução técnica não é validação clínica nem certificação de produto comercial.
