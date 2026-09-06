# DocTemplate Ortopedia — 5.0

Reconstrução da interface e do fluxo de documentos, preservando os 244 modelos clínicos da 4.1 e a experiência de biblioteca da 3.2. Mapa vetorial proporcional, busca estável, favoritos, edição de modelos e rascunhos com variáveis preservadas.

Consulte [RECONSTRUCTION.md](RECONSTRUCTION.md) para uso, migração, testes, publicação no GitHub Pages e atribuição das silhuetas.

## Registro histórico — versão 4.1

Banco de modelos clínicos ortopédicos que funciona como roteiro e checklist no
atendimento: escolher o modelo, marcar o segmento no mapa do corpo e copiar o
texto já concordado para o prontuário.

## Novidades da 4.1 (06/09/2026) — o mapa passa a valer para valer

A 4.0 tinha um defeito de origem: só **6 dos 244 modelos** tinham texto em
padrão, então em quase todo modelo o mapa ficava inerte e o texto não mudava.

- **153 modelos ativam o mapa** (eram 5). Em **31** o mapa reescreve o texto;
  nos outros **127**, cujo título já traz o lado (TC — COTOVELO DIREITO), o mapa
  marca a região e explica que aquele modelo é daquele lado.
- **Segmento pré-selecionado.** DOR NO COTOVELO já abre com o cotovelo marcado;
  falta só o lado, e o app diz isso em vez de deixar o texto pela metade.
- **O lado acompanha o paciente.** Escolhido o lado direito, ele permanece ao
  trocar de modelo — é o mesmo paciente.
- **Regra do esqueleto apendicular.** Segmento com lado pede lado; coluna,
  pelve e tórax não perguntam.
- **Dedos.** Mãos e pés ampliados, com polegar e 2º a 5º quirodáctilos, hálux e
  2º a 5º pododáctilos: "FRATURA DO 4º QUIRODÁCTILO DIREITO", "CONTUSÃO DO
  POLEGAR ESQUERDO". Tocar na mão ou no pé no corpo já amplia.
- **Avatar redesenhado.** O corpo virou uma silhueta única em vez de um
  empilhamento de cápsulas, e as articulações recebem o toque em vez de o osso
  longo roubar o clique.

### Correção de migração (a mais importante)

`doUsuario()` comparava o modelo guardado com o seed **novo**. Como qualquer
melhoria de texto cria diferença, os 244 modelos passavam por "editados pelo
usuário" e **nenhum texto novo chegava a quem já usava o app**. Agora a prova de
autoria é o campo `modified`, gravado em toda edição desde a 3.1: quem editou
mantém o texto dele; quem não editou recebe a melhoria.

## Novidades da 4.0 (06/09/2026) — segmento e mecanismo de trauma

- **Três painéis.** Menu (módulos e subabas) · corpo humano · texto.
- **Mapa anatômico.** 17 segmentos, frente e verso, lado direito e esquerdo pela
  convenção anatômica (direito do paciente à esquerda de quem olha). A escolha
  do lado só aparece quando o segmento tem lado — coluna cervical não pergunta.
- **Mecanismo de trauma** como segundo eixo, com lista pronta e campo livre.
- **Textos em padrões.** Onde o texto dizia "SEGMENTO ACOMETIDO" como
  preenchimento, agora há variáveis que concordam em gênero: `{{SEG}}`,
  `{{NO_SEG}}`, `{{DO_SEG}}`, `{{AO_SEG}}`, `{{APOS_MEC}}` — "NO JOELHO
  DIREITO", "NA MÃO DIREITA", "À MÃO ESQUERDA".
- **Botão "+ variável".** Converte qualquer outro modelo no uso diário, sem
  depender de alterar o código.
- **Aba ativa.** O módulo aberto sobe para o topo com busca própria.

Os **244 modelos foram mantidos**. A conversão foi conservadora, um a um:
6 modelos alterados, 10 substituições, 239 intactos. As 92 ocorrências de
"SEGMENTO ACOMETIDO" que são **rótulo de campo** (fisioterapia, acupuntura) não
foram tocadas: convertê-las produziria "COLUNA CERVICAL: COLUNA CERVICAL".

## Seus dados vieram junto

Na primeira abertura, a 4.0 lê a chave da 3.2 (`doctemplate-ortopedia:3.0`) e
mescla: edições, modelos criados, subabas, favoritos e recentes atravessam.
**A chave da 3.2 nunca é apagada** — é a rede de segurança.

Onde você já tinha editado um dos 6 modelos convertidos, a **sua** versão vence
e o padrão novo não entra. É o comportamento correto: a edição é sua.

## Rota de volta

A 3.2 continua publicada em **`/3.2/`**, com link no rodapé da barra lateral, e
fica no cache offline junto com a 4.0. Uma rota de volta que só funciona com
internet não serviria de nada num plantão.

## Como instalar no celular

- **iPhone (Safari):** abrir o site → Compartilhar → "Adicionar à Tela de Início".
- **Android (Chrome):** menu ⋮ → "Instalar app".

Instalado na tela inicial, o app usa um armazenamento próprio, que não é varrido
pela limpeza automática que o Safari faz em sites não visitados há 7 dias.

## Como publicar conteúdo novo

1. Edite o `data.js` (mantenha os `id`s existentes).
2. Aumente `"version"` no topo do `data.js` em 1.
3. Aumente os `?v=N` no `index.html`.
4. No `sw.js`, atualize `ASSETS` com os mesmos `?v=N` **e** mude o nome do cache
   em `CACHE` (ex.: `doctemplate-4.0.0` → `doctemplate-4.0.1`).
5. Faça o commit.

O passo 4 é o que mais se esquece: sem mudar `CACHE`, quem instalou o app
continua vendo a versão antiga para sempre.

Não altere `CHAVE` em `app.js`: mudar a chave foi o que deixou órfãos os dados
da V47.

## Histórico

## Novidades da 3.2 (06/09/2026) — funciona sem internet

- **Aplicativo instalável (PWA).** Pode ser adicionado à tela inicial do celular
  e aberto como app, sem barra de navegador.
- **Funciona offline por completo.** Os 244 modelos, o CSS e o JavaScript ficam
  guardados no aparelho pelo service worker. Wi-fi de hospital caindo ou sem
  rede nenhuma, o app abre e funciona igual — busca, edição, cópia e salvamento.
- **Aviso de atualização.** Quando uma versão nova é publicada, aparece
  "Nova versão disponível. Toque para atualizar." em vez de o app ficar preso
  numa versão antiga.

### Como instalar no celular

- **iPhone (Safari):** abrir o site → botão Compartilhar → "Adicionar à Tela de Início".
- **Android (Chrome):** menu ⋮ → "Instalar app" / "Adicionar à tela inicial".

Instalado na tela inicial, o app usa um armazenamento próprio, que não é varrido
pela limpeza automática de dados que o Safari faz em sites não visitados há 7 dias.

## Novidades da 3.1 (06/09/2026)

- **Salvamento automático.** Tudo que é digitado é gravado no navegador em menos de
  um segundo; o rodapé mostra "Salvo às HH:MM". O botão "Salvar alterações" deixou
  de existir porque não descrevia o comportamento real.
- **Exportar / Importar.** Botões no rodapé da barra lateral. O arquivo `.json`
  leva edições, subabas, favoritos e uso para outro computador ou serve de backup.
- **Migração entre versões sem perda.** Ao subir `seed.version` no `data.js`, o app
  mescla: modelos novos entram, modelos editados pelo usuário permanecem editados,
  subabas criadas sobrevivem e exclusões são respeitadas.
- **Resgate da V47.** Na primeira abertura, se houver dados da versão anterior
  (`doctemplate-clinico:v1`) com edições, o app oferece importá-los.
- **Celular.** Título quebra linha em vez de cortar, caixas de texto crescem com o
  conteúdo, alvos de toque com no mínimo 44 px.
- **Títulos padronizados.** Acentos e travessão único nos 244 modelos (só títulos;
  o conteúdo das caixas não mudou).
- **CSS limpo.** Removidos o `@import "tailwindcss"` (gerava 404) e 107 regras sem uso.

## Versão anterior preservada

A versão que estava publicada anteriormente no GitHub foi preservada integralmente
na branch **`DOC-TEMPLATE-CLINICO-V47`**.

## Privacidade

No GitHub Pages, as alterações permanecem somente no navegador e no dispositivo em
uso. Evite inserir dados identificáveis de pacientes em computadores compartilhados.
Use "Exportar" para manter uma cópia de segurança.
