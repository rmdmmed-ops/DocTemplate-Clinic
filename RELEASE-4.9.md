# DocTemplate Clínico 4.9

Publicação 49. Site de uso no navegador, com 13 módulos e 245 modelos.

- Buscas internas com contagem, limpeza e filtragem durante a digitação.
- Edições e contexto anatômico salvos automaticamente neste navegador.
- Regiões múltiplas nos modelos genéricos; modelo de poliqueixas com avaliação por região.
- Botões de cópia identificam a caixa; copiar tudo reúne apenas os textos.
- Importação atualiza IDs existentes e permite desfazer a última importação.
- Janelas internas para criar, renomear, excluir e restaurar.

O armazenamento continua local. Domínio próprio, contas individuais, banco central e sincronização entre computadores ainda exigem a etapa de infraestrutura. A cópia publicada no GitHub é pública; o acesso do ChatGPT Sites permanece privado.

## Verificação

Os testes de núcleo e DOM cobrem busca, variáveis, persistência, importação, migração e múltiplas regiões. Testes DOM usam ambiente simulado e não substituem testes em navegador real.

Para executar os testes DOM: `npm install --prefix tests`, depois `node tests/functional-49.cjs dist` (Sites) ou `node tests/functional-49.cjs .` (GitHub).
