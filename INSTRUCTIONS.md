# PROTOCOLO DE DESENVOLVIMENTO CRONOPET

Ao iniciar qualquer task, você DEVE abrir sua primeira resposta classificando a tarefa exatamente neste formato: *"Aplicando protocolo. Esta task é [trivial/standard/complex]."*

## 1. CLASSIFICAÇÃO DE TASKS E REGRAS DE EXECUÇÃO
A classificação define o seu fluxo de trabalho. Não existe exceção.
- **trivial:** 1 arquivo, sem tocar no banco/API/estado global. Você pode escrever o código diretamente.
- **standard:** 2-3 arquivos OU toca API/banco/estado global OU cria nova função exportada OU modifica função existente com >1 caller. **Reconhecimento e Pre-flight OBRIGATÓRIOS.**
- **complex:** 4+ arquivos OU altera schema/auth do Supabase. **Reconhecimento e Pre-flight OBRIGATÓRIOS + Divisão em sub-tasks.**

## 2. REGRA ZERO (TRIPWIRES)
Você NÃO PODE executar NENHUMA das ações abaixo sem aprovação explícita (a string "GO" do usuário). Se a task exigir isso, PARE e liste a ação:
- Instalar ou remover pacotes/dependências.
- Criar/alterar tabelas, schemas ou políticas de RLS no Supabase.
- Modificar `app.json`, configurações do EAS, Sentry ou pastas nativas (iOS/Android).
- Alterar fluxos de autenticação.

## 3. RECONHECIMENTO (Gatilho para tasks Standard/Complex)
ANTES de gerar o Pre-flight, você DEVE executar um `grep` ou busca no projeto e declarar:
- Arquivos lidos para entender o contexto: [lista]
- Convenções do projeto mapeadas: [padrões de pastas, hooks, etc.]
- Funções/componentes existentes similares: [caminho completo OU "nenhum, verifiquei em X e Y"]

## 4. PRE-FLIGHT CHECKLIST
Após o Reconhecimento e ANTES de editar qualquer código, gere este bloco e **PARE aguardando a string "GO":**
1. Arquivos a tocar: [lista]
2. Funções/componentes afetados: [path:linha]
3. Estrutura de dados principal: [nome] — Complexidade temporal: O(?)
4. Edge cases que vou tratar: [1. ..., 2. ..., 3. ...]
5. Plano de teste manual: [passos numerados]
6. Fora de escopo (Não farei): [lista]

## 5. REGRA DE INTERRUPÇÃO
Durante a implementação de código, você DEVE PARAR e solicitar revisão se:
- O plano do Pre-flight furar ou o escopo da task crescer.
- Uma dependência não funcionar como esperado.
- Descobrir a necessidade de uma migration não prevista.
Você NÃO PODE improvisar. Descreva o bloqueio e proponha um Pre-flight revisado.

## 6. PUREZA E LIMITES ESTRUTURAIS
- Componentes React Native NÃO PODEM ultrapassar 150 linhas. Extraia componentes menores.
- Hooks customizados NÃO PODEM ultrapassar 80 linhas.
- Funções utilitárias NÃO PODEM ultrapassar 40 linhas.
- As funções na raiz de `/lib/` e `/utils/` DEVEM ser estritamente puras.
- Clientes que causam side effects (Supabase client, fetchers) DEVEM ser isolados em `/lib/clients/` ou `/lib/integrations/`.
- Se a complexidade no Pre-flight for pior que O(n log n) em coleções dinâmicas, você DEVE propor estruturas O(1) (Maps/Sets).

## 7. DEFINITION OF DONE (DoD)
Você só pode declarar a task como "concluída" enviando o seguinte checklist preenchido:
- [ ] TypeScript compila sem novos erros (`tsc --noEmit`).
- [ ] Lint rodou sem warnings novos.
- [ ] Edge cases listados no Pre-flight foram tratados no código.
- [ ] Status de Teste: [Declare: "Testei o caminho feliz e a feature roda" OU "Não testei na interface, preciso que você teste X, Y, Z manualmente"].
- [ ] Débito técnico criado ou TODOs deixados: [Lista detalhada OU "Nenhum débito deixado"].
