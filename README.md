# DOC TEMPLATE ORTOPEDIA – 3.1 (VERSÃO ATUAL)

Versão do **DocTemplate Clínico V47**, publicada originalmente no site da OpenAI em
19/08/2026 e adaptada para funcionar no GitHub Pages.

Inclui busca global, favoritos, recentes, modelos editáveis, criação de subabas,
caixas de texto, cópia e armazenamento local no navegador.

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

## Como publicar conteúdo novo

1. Edite o `data.js` (adicione ou altere modelos, mantendo os `id`s existentes).
2. Aumente `"version"` no topo do `data.js` em 1.
3. Faça o commit. Quem já usa o app recebe os modelos novos sem perder as edições.

Não altere `STORAGE_KEY` em `app.js`: mudar a chave foi o que deixou órfãos os dados
da V47.

## Versão anterior preservada

A versão que estava publicada anteriormente no GitHub foi preservada integralmente
na branch **`DOC-TEMPLATE-CLINICO-V47`**.

## Privacidade

No GitHub Pages, as alterações permanecem somente no navegador e no dispositivo em
uso. Evite inserir dados identificáveis de pacientes em computadores compartilhados.
Use "Exportar" para manter uma cópia de segurança.
