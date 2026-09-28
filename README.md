# ANZUBA

Universal AI Toolbox — extensão de navegador com um sistema operacional virtual dedicado à IA.

## Etapas concluídas

### Etapa 1/275 — Base da extensão
Manifest V3, service worker, content script, popup, badge e estrutura inicial.

### Etapa 2/275 — Detecção de IA
Detecção de ChatGPT, Gemini, DeepSeek, Claude e Manus.

### Etapa 3/275 — Adaptação de tema
Detecção de tema, tipografia, fundo, texto e variáveis visuais do site hospedeiro.

### Etapa 4/275 — Gerenciador de projetos
Criação, menu e persistência de projetos.

### Etapa 5/275 — Projeto ativo
Persistência, seleção e eventos do projeto ativo.

### Etapa 6/275 — Isolamento de dados
Dados persistentes separados por projeto.

### Etapa 7/275 — Filesystem virtual
Filesystem virtual persistente com diretórios ANZUBA.

### Etapa 8/275 — Materiais
Gerenciamento de materiais e propriedades de materiais.

### Etapa 9/275 — Recursos
Registro persistente de ferramentas, compiladores, SDKs, bibliotecas, runtimes, engines e pacotes.

### Etapa 10/275 — Ambiente
Variáveis de ambiente, HOME, USER, SHELL, PWD e PATH virtuais.

### Etapa 11/275 — AI Bridge
Bridge de comandos, contexto, eventos e requisições entre IA e ANZUBA.

### Etapa 12/275 — Base de integração
Preparação da camada de integração das IAs com o ambiente ANZUBA.

### Etapa 13/275 — Adaptadores de IA
Adaptadores para ChatGPT, Gemini, DeepSeek, Claude e Manus.

### Etapa 14/275 — Mensagens
Preenchimento e envio de mensagens pela IA hospedeira.

### Etapa 15/275 — Leitura de mensagens
Leitura e observação das mensagens da conversa.

### Etapa 16/275 — Contexto da conversa
Exposição estruturada do contexto atual da conversa.

### Etapa 17/275 — Snapshot da conversa
IDs estáveis, snapshots e observação de mudanças.

### Etapa 18/275 — Estado da página
Estado da página, navegação e observação de mudanças de rota/título.

### Etapa 19/275 — Capabilities
Consulta das capacidades disponíveis no adaptador atual.

### Etapa 20/275 — Status da integração
Status consolidado da integração, página, conversa e capacidades.

### Etapa 21/275 — Resumo do projeto
Resumo estruturado e consulta por ID.

### Etapa 22/275 — Chat vinculado ao projeto
Persistência do estado da conversa dentro do projeto.

### Etapa 23/275 — Sincronização de chat
Infraestrutura de sincronização do chat com o projeto.

### Etapa 24/275 — Histórico incremental
Normalização, IDs e atualização sem persistências desnecessárias.

### Etapa 25/275 — Sessões de chat
Múltiplas sessões de conversa persistentes por projeto.

### Etapa 26/275 — Identidade estável
IDs determinísticos para conversas e mensagens.

### Etapa 27/275 — Sessão ativa
Seleção e persistência da sessão ativa do projeto.

### Etapa 28/275 — Seletor visual de conversas
Menu visual para listar e selecionar sessões do projeto.

### Etapa 29/275 — Importação de projetos
Importação de arquivos JSON no formato ANZUBA Project.

### Etapa 30/275 — Exportação de projetos
Exportação de projetos para arquivos .anzuba.json.

### Etapa 31/275 — Núcleo do ANZUBA OS
Estado persistente do OS, CPU, memória, disco, usuários, boot e shutdown.

### Etapa 32/275 — Gerenciador de processos
Processos virtuais, PID, estados, execução, parada e terminação.

### Etapa 33/275 — Usuários, grupos e permissões
Usuários/grupos persistentes, contas bloqueadas e verificação de permissões.

### Etapa 34/275 — Shell virtual
Shell virtual com filesystem, processos, ambiente e comandos básicos.

### Etapa 35/275 — Variáveis de ambiente no Shell
Expansão de variáveis e comando export.

### Etapa 36/275 — PATH virtual
Descoberta de executáveis pelo PATH com verificação de execução.

### Etapa 37/275 — Runtime de comandos
Registro e execução de comandos virtuais com processos.

### Etapa 38/275 — Permissões do filesystem
Metadados de proprietário/grupo/modo e controles de acesso.

### Etapa 39/275 — Administração do filesystem
stat, chmod, chown e administração de permissões.

### Etapa 40/275 — Auditoria e diagnóstico do bloco 31–40
Auditoria completa, correções de integração/isolamento e diagnóstico integrado via getHealth/os.health.

### Etapa 41/275 — CPU virtual

Adicionado o gerenciador de CPU virtual do ANZUBA OS. Cada projeto possui seu próprio estado de CPU, com arquitetura, modelo, quantidade de núcleos, frequência, scheduler, quantum e utilização. A IA pode consultar o estado com `cpu.status`, alterar a quantidade de núcleos com `cpu.cores.set` e recalcular a utilização virtual com `cpu.tick`. O recurso é persistente e isolado por projeto.

### Etapa 42/275 — Memória virtual

Gerenciador de RAM virtual persistente e isolado por projeto, com total, uso, memória livre e alocações vinculadas a processos. Inclui os comandos `memory.status`, `memory.allocate`, `memory.free`, `memory.freeProcess`, `memory.total.set` e `memory.sync`. A memória vinculada a processos encerrados é liberada automaticamente.

### Etapa 43/275 — Disco virtual

Adicionado o gerenciador de disco virtual persistente e isolado por projeto, com capacidade total, espaço usado/livre, filesystem virtual, verificação de espaço e cálculo de utilização. A IA pode consultar com `disk.status`, sincronizar com `disk.sync`, alterar a capacidade com `disk.total.set`, verificar espaço com `disk.space.check` e consultar uso com `disk.usage`.

### Etapa 44/275 — Rede virtual

Adicionado o gerenciador de rede virtual persistente e isolado por projeto, com hostname, interfaces virtuais, endereçamento, rotas, DNS, estado online/offline e controle de acesso de rede. A IA pode consultar com `network.status`, alterar o estado com `network.online.set`, controlar o acesso com `network.access.set`, adicionar/remover interfaces e resolver hosts com `network.resolve`.

### Etapa 45/275 — Integração do kernel

Adicionado o gerenciador de kernel do ANZUBA OS, integrando boot e shutdown do sistema e consolidando o estado de CPU, memória, disco, rede e processos em um único status. A IA pode usar `kernel.boot`, `kernel.shutdown`, `kernel.status` e `kernel.health` para controlar e diagnosticar o núcleo virtual.

### Etapa 46/275 — Armazenamento virtual

Adicionada a camada de armazenamento virtual persistente e isolada por projeto. Ela oferece armazenamento de valores estruturados por chave, listagem por prefixo, remoção, limpeza, quota configurável e relatório de uso. A IA pode usar `storage.get`, `storage.set`, `storage.remove`, `storage.list`, `storage.clear`, `storage.quota.set` e `storage.status`.

### Etapa 47/275 — Volumes de armazenamento virtual

Adicionada a camada de volumes virtuais do armazenamento do ANZUBA OS. Cada projeto pode criar volumes nomeados com ponto de montagem, quota própria e estado montado/desmontado. Os dados de cada volume ficam separados do armazenamento de chaves global e possuem operações próprias de leitura, escrita, listagem e diagnóstico. A IA pode usar `storage.volumes.list`, `storage.volume.create`, `storage.volume.remove`, `storage.volume.mount`, `storage.volume.status`, `storage.volume.set`, `storage.volume.get` e `storage.volume.list`.

### Etapa 48/275 — Snapshots de armazenamento

Adicionado sistema de snapshots persistentes por projeto. O ANZUBA pode criar uma cópia do estado dos dados e volumes, listar snapshots disponíveis, restaurar um snapshot e removê-lo. A restauração substitui o estado atual dos dados e volumes pelo estado salvo no snapshot. A IA pode usar `storage.snapshots.list`, `storage.snapshot.create`, `storage.snapshot.restore` e `storage.snapshot.remove`.

### Etapa 49/275 — Integridade do armazenamento

Adicionada verificação de integridade do armazenamento virtual. O ANZUBA identifica estruturas inválidas de entradas, volumes e snapshots e pode reparar automaticamente estruturas corrompidas ou ausentes, preservando o isolamento do projeto. A IA pode usar `storage.integrity` com `repair: false` para diagnóstico ou `repair: true` para correção.

### Etapa 50/275 — Backup e restauração do armazenamento

Adicionado backup lógico do armazenamento virtual por projeto. A IA pode exportar o estado completo de armazenamento com `storage.export` e importar um backup validado com `storage.import`. A importação pode substituir o estado atual ou fazer merge de entradas, volumes e snapshots.

### Etapa 51/275 — Cache virtual

Adicionado cache virtual persistente e isolado por projeto, separado do armazenamento principal. O cache suporta chaves, quota própria, TTL opcional, estatísticas de acesso, listagem, limpeza e expurgo de entradas expiradas.

### Etapa 52/275 — Reconciliação do armazenamento

Adicionada manutenção e reconciliação do armazenamento virtual. O ANZUBA recalcula tamanhos, identifica inconsistências e pode reparar metadados sem misturar dados entre projetos.

### Etapa 53/275 — Gerenciador de ferramentas

Criado o núcleo do Tool Manager virtual por projeto, com catálogo, tipos, versões, fontes, caminhos, dependências, estados, instalação e remoção.

### Etapa 54/275 — Metadados e fontes de ferramentas

Adicionados tipo de fonte, página oficial, licença e versões disponíveis, com atualização e consulta pela AI Bridge.

### Etapa 55/275 — Gerenciamento de versões

O Tool Manager mantém múltiplas versões, permite adicionar/remover versões do catálogo e selecionar a versão ativa.

### Etapa 56/275 — Dependências de ferramentas

Adicionado gerenciamento de dependências, dependentes e validação de referências.

### Etapa 57/275 — Resolução automática de dependências

Adicionada resolução recursiva da árvore de dependências, detecção de referências ausentes e ciclos, ordem de instalação e instalação encadeada.

### Etapa 58/275 — Compatibilidade entre ferramentas e versões

Adicionadas regras de compatibilidade, comparação de versões, requisitos por faixa e conflitos entre ferramentas.

### Etapa 59/275 — Catálogo inteligente de ferramentas

Adicionadas busca e recomendação local com filtros, pontuação de relevância, prioridade por nome e limite controlado de resultados.

### Etapa 60/275 — Diagnóstico do Tool Manager

Adicionado diagnóstico de integridade do catálogo, detectando IDs inválidos/duplicados, tipos ou estados inválidos, dependências ausentes e referências de compatibilidade quebradas. A IA pode consultar o diagnóstico com `tools.health`.

### Etapa 61/275 — Registro de executáveis de ferramentas

O Tool Manager mantém os executáveis associados a cada ferramenta, com nome, caminho opcional e argumentos padrão. A IA pode registrar/atualizar executáveis com `tools.executables.set` e consultar o estado com `tools.executables.get`. Os dados permanecem persistentes e isolados por projeto.

### Etapa 62/275 — Resolução de executáveis

O Tool Manager consegue localizar um executável pelo nome entre as ferramentas instaladas do projeto. A resolução retorna a ferramenta, versão, caminho e argumentos registrados, e está disponível pela API `ANZUBA_TOOLS.resolveExecutable` e pelo comando `tools.executable.resolve`. Ferramentas não instaladas não são consideradas.

### Etapa 63/275 — Integração dos executáveis com o PATH virtual

Os executáveis de ferramentas instaladas agora são sincronizados com o filesystem e o PATH virtual do projeto. O ANZUBA prepara `/tools/bin`, cria entradas executáveis virtuais com permissões de execução, adiciona esse diretório ao PATH e remove automaticamente os stubs pertencentes a uma ferramenta quando ela é desinstalada. A sincronização manual também está disponível com `ANZUBA_TOOLS.syncExecutables` e `tools.executables.sync`.

### Etapa 64/275 — Validação de executáveis

Adicionada validação completa dos executáveis virtuais antes da execução. O Tool Manager verifica se a ferramenta está instalada, se o executável possui entrada válida no filesystem virtual, se possui permissão de execução e se seu diretório está presente no PATH do projeto. A IA pode consultar com `ANZUBA_TOOLS.validateExecutable` ou `tools.executable.validate`.

### Etapa 65/275 — Execução virtual de ferramentas

Adicionada a execução virtual de executáveis instalados. A IA pode usar `ANZUBA_TOOLS.executeExecutable` ou `tools.executable.run` para resolver a ferramenta, validar instalação e compatibilidade e criar um processo virtual com argumentos, usuário e diretório de trabalho. A execução não finge executar binários do computador hospedeiro: o processo passa pelo runtime virtual do ANZUBA OS.

## Próximas etapas
41–45: expansão do núcleo do ANZUBA OS
46–52: armazenamento
53–65: gerenciador de ferramentas
66–80: linguagens e desenvolvimento
81–90: build system
91–100: programador de IA
101–115: game engine
116–130: Asset Toolbox
131–145: Connections
146–160: Animation Toolbox
161–170: Rigging
171–185: 3D
186–195: IA visual
196–210: Exportação
211–220: publicação
221–230: cloud
231–245: segurança
246–260: automação
261–275: UX final


### Etapa 66/275 — Registro de runtimes de linguagens

Adicionado o primeiro suporte da camada de linguagens e desenvolvimento. O Tool Manager agora consegue registrar runtimes de linguagem instalados no projeto, associando versão, comando executável, origem e metadados. A IA pode usar `ANZUBA_TOOLS.registerLanguageRuntime` e `ANZUBA_TOOLS.listLanguageRuntimes`, ou os comandos `tools.runtime.register` e `tools.runtime.list`. Os runtimes registrados são sincronizados com o PATH virtual do projeto.



### Etapa 67/275 — Configuração de runtimes

Os runtimes de linguagem agora possuem configuração persistente por projeto. A IA pode consultar um runtime específico e definir variáveis de ambiente e diretório de trabalho padrão através de `ANZUBA_TOOLS.getLanguageRuntime` e `ANZUBA_TOOLS.setLanguageRuntimeConfig`, ou pelos comandos `tools.runtime.get` e `tools.runtime.config.set`.



### Etapa 68/275 — Registro de linguagens e detecção por extensão

Adicionada a camada de identificação de linguagens do projeto. O ANZUBA pode registrar uma linguagem com ID, extensões e metadados e detectar a linguagem associada a um arquivo pelo caminho/extensão. A IA pode usar `ANZUBA_TOOLS.registerLanguage` e `ANZUBA_TOOLS.findLanguageByFile`, ou os comandos `language.register` e `language.detectFile`.



### Etapa 69/275 — Detecção inteligente de linguagem

A detecção de linguagem foi ampliada além da extensão do arquivo. O ANZUBA agora pode analisar shebangs como `#!/usr/bin/env python` e pistas básicas do conteúdo para identificar a linguagem registrada no projeto. A IA pode usar `ANZUBA_TOOLS.detectLanguage` ou o comando `language.detect`, recebendo também o método usado na identificação.



### Etapa 70/275 — Registro de compiladores e mapeamento por linguagem

### Etapa 71/275 — Validação de compiladores


### Etapa 72/275 — Execução virtual de compiladores


### Etapa 73/275 — Jobs de compilação


### Etapa 74/275 — Artefatos de compilação


### Etapa 75/275 — Validação de artefatos de compilação


### Etapa 76/275 — Perfis de build


### Etapa 77/275 — Execução por perfil de build


### Etapa 78/275 — Validação de arquivos de build


### Etapa 79/275 — Preparação de build


### Etapa 80/275 — Pipeline de build virtual

Adicionado o pipeline de build virtual do ANZUBA. A IA pode validar a origem e o compilador, preparar a configuração, criar o job de compilação e registrar o artefato de saída como pendente até que a execução virtual produza o arquivo. O pipeline usa `ANZUBA_TOOLS.runBuildPipeline` e o comando Bridge `build.run`.

### Auditoria 71–80/275

Após a implementação da etapa 80, foi realizada a varredura de bugs e a auditoria das etapas 71–80. Foram corrigidos dois problemas encontrados: o pipeline reutilizava argumentos já montados e poderia duplicar argumentos do compilador, e o cálculo da extensão de saída do compilador usava uma expressão regular incorreta. Artefatos criados pelo pipeline também ficam marcados como pendentes (`missing`) enquanto a execução ainda está enfileirada, evitando declarar um arquivo como disponível antes de existir.

Adicionada a preparação de builds virtuais. O ANZUBA valida a origem e o compilador, combina argumentos padrão e personalizados, define saída, diretório, usuário e ambiente e retorna um plano de build pronto para execução. API: `ANZUBA_TOOLS.prepareBuild`. Bridge: `build.prepare`.

Adicionada a validação dos arquivos de origem antes de um build. O ANZUBA verifica caminho, existência no filesystem virtual, tipo de arquivo, compilador associado, validade do compilador e compatibilidade da extensão com as extensões de entrada declaradas pelo compilador. API: `ANZUBA_TOOLS.validateBuildSource`. Bridge: `build.source.validate`.

Adicionada a execução virtual de builds usando perfis persistentes. A IA pode selecionar um perfil, validar sua configuração, combinar argumentos/opções específicas e criar automaticamente um job de compilação associado ao compilador configurado. API: `ANZUBA_TOOLS.buildWithProfile`. Bridge: `build.profile.run`.

Adicionados perfis de build persistentes por projeto. Cada perfil pode definir compilador, argumentos, saída, diretório de trabalho, usuário, variáveis de ambiente e nível de otimização. O ANZUBA também valida o perfil e o compilador associado antes do uso. APIs: `ANZUBA_TOOLS.getBuildProfiles`, `getBuildProfile`, `setBuildProfile`, `removeBuildProfile` e `validateBuildProfile`. Bridge: `build.profiles.list`, `build.profile.get`, `build.profile.set`, `build.profile.remove` e `build.profile.validate`.

Adicionada a validação dos artefatos de compilação. O ANZUBA verifica existência do artefato registrado, caminho, tamanho, estado, vínculo com o job de compilação e isolamento do projeto, retornando os problemas encontrados sem executar nada no computador hospedeiro. A IA pode consultar com `ANZUBA_TOOLS.validateBuildArtifact` ou pelo comando `compiler.artifact.validate`.

Adicionado o registro persistente dos artefatos produzidos pelos jobs de compilação. Cada artefato mantém vínculo com o job, caminho, tipo, tamanho, checksum e estado. A IA pode registrar, consultar, listar e remover artefatos através de `ANZUBA_TOOLS.registerBuildArtifact`, `getBuildArtifact`, `listBuildArtifacts` e `removeBuildArtifact`, ou pelos comandos `compiler.artifact.register`, `compiler.artifact.get`, `compiler.artifacts.list` e `compiler.artifact.remove`.

Adicionado o gerenciamento persistente de jobs de compilação por projeto. Cada job registra compilador, arquivo de origem, saída, argumentos, processo virtual, usuário, diretório de trabalho, estado, código de saída e erro. A IA pode criar, consultar, listar e atualizar jobs através de `ANZUBA_TOOLS.createCompileJob`, `getCompileJob`, `listCompileJobs` e `updateCompileJob`, ou pelos comandos `compiler.job.create`, `compiler.job.get`, `compiler.jobs.list` e `compiler.job.update`.

Adicionada a preparação de compilação virtual por projeto. A IA pode usar `ANZUBA_TOOLS.compileSource` ou `compiler.compile` para validar o compilador, montar os argumentos, definir arquivo de saída, diretório de trabalho e usuário e criar o processo virtual de compilação. A operação permanece dentro do runtime virtual do ANZUBA OS e não executa binários do computador hospedeiro.

Adicionada a validação dos compiladores registrados. O ANZUBA verifica se o compilador existe, está associado a uma linguagem registrada, possui extensões de entrada válidas, tem executável configurado, está instalado e permanece compatível com as dependências/regras do projeto. A IA pode consultar o resultado pela API `ANZUBA_TOOLS.validateCompiler` ou pelo comando `compiler.validate`.

Adicionado o registro de compiladores ao Tool Manager. Um compilador pode ser associado a uma linguagem, comando, versão, extensões de entrada, extensão de saída e argumentos padrão. A IA pode registrar, listar e localizar o compilador adequado através das APIs do Tool Manager e dos comandos Bridge correspondentes.


### Etapa 59/275 — Catálogo inteligente de ferramentas

O Tool Manager agora possui busca e recomendação local de ferramentas, com filtros por tipo/status, pontuação por relevância, prioridade para correspondência de nome e limite controlado de resultados. Tudo permanece isolado por projeto.

### Etapa 81/275 — Registro de alvos de build

Adicionado o registro persistente de alvos de build por projeto. Cada alvo pode definir plataforma, arquitetura, formato, perfil, compilador, arquivo de origem, saída, argumentos e variáveis de ambiente. A IA pode criar, consultar, listar, remover e validar alvos através de `ANZUBA_TOOLS.getBuildTargets`, `getBuildTarget`, `setBuildTarget`, `removeBuildTarget` e `validateBuildTarget`, ou pelos comandos Bridge `build.targets.list`, `build.target.get`, `build.target.set`, `build.target.remove` e `build.target.validate`. Os alvos permanecem isolados por projeto e podem ser usados como configuração persistente para as próximas etapas do Build System.

### Etapa 82/275 — Resolução de alvos de build

Adicionada a resolução de alvos de build por projeto. O ANZUBA agora consegue transformar um alvo persistente em um plano resolvido, relacionando perfil, compilador, arquivo de origem, saída, argumentos, plataforma, arquitetura e formato. A IA pode usar `ANZUBA_TOOLS.resolveBuildTarget` ou o comando Bridge `build.target.resolve`. A resolução valida o alvo antes de retornar a configuração e permanece isolada no projeto selecionado.

### Etapa 83/275 — Plano de build por alvo

Adicionada a geração de um plano de build a partir de um alvo resolvido. A IA pode usar `ANZUBA_TOOLS.prepareBuildTarget` para validar o alvo, resolver o compilador/perfil, validar o arquivo de origem quando informado e montar uma configuração final de execução com argumentos, ambiente, diretório de trabalho e saída. O comando Bridge `build.target.prepare` expõe a mesma operação.

### Etapa 84/275 — Validação do plano de build

Adicionada a validação dos planos de build gerados pelos alvos. O ANZUBA verifica alvo, compilador, arquivo de origem, saída, diretório de trabalho, plataforma, arquitetura e formato antes de permitir que o plano avance. A IA pode usar `ANZUBA_TOOLS.validateBuildPlan` ou o comando Bridge `build.plan.validate`. A validação permanece isolada por projeto e retorna uma lista consolidada de problemas encontrados.

### Etapa 85/275 — Manifesto de build

Adicionada a geração de um manifesto estruturado para builds. O manifesto registra projeto, alvo, plataforma, arquitetura, formato, compilador, perfil, origem, saída e parâmetros de execução, incluindo argumentos e ambiente. A operação `ANZUBA_TOOLS.createBuildManifest` valida o plano antes de gerar o manifesto, e a AI Bridge expõe `build.manifest.create`.

### Etapa 86/275 — Persistência de manifestos de build

Implementado o registro persistente dos manifestos de build por projeto. O ANZUBA agora pode registrar, consultar, listar e remover manifestos, mantendo isolamento entre projetos e limitando o histórico a 100 manifestos por projeto. A AI Bridge expõe `build.manifest.register`, `build.manifest.get`, `build.manifests.list` e `build.manifest.remove`.

### Etapa 87/275 — Validação de manifestos de build

Adicionada a validação estrutural dos manifestos de build. O ANZUBA verifica formato, versão, projeto, alvo, compilador, origem, saída e parâmetros de execução, removendo problemas duplicados da lista de diagnóstico. A AI Bridge expõe `build.manifest.validate`.
### Etapa 88/275 — Execução de manifestos de build

Adicionada a execução controlada de manifestos de build. O ANZUBA valida o manifesto, confirma o compilador e o arquivo de origem no projeto, cria o job de compilação no runtime virtual e registra o artefato como pendente quando há uma saída definida. A operação está disponível pela API `ANZUBA_TOOLS.executeBuildManifest` e pelo comando Bridge `build.manifest.execute`. A execução continua restrita ao ambiente virtual do ANZUBA OS.
### Etapa 89/275 — Atualização do estado de builds

Adicionada a atualização dos jobs de build a partir do processo virtual do ANZUBA OS. A operação `refreshBuildJob` sincroniza estado, código de saída e erro do job, verifica os artefatos no filesystem virtual e atualiza cada artefato para `available`, `missing` ou `invalid`. A AI Bridge expõe `compiler.job.refresh`.
### Etapa 90/275 — Diagnóstico e auditoria do Build System

Adicionado o diagnóstico integrado do Build System através de `ANZUBA_TOOLS.getBuildSystemDiagnostics` e `build.system.diagnostics`. A etapa verifica alvos, perfis, manifestos, jobs, processos associados e artefatos, preservando o isolamento por projeto. Após a implementação, foi realizada a varredura de bugs e a auditoria do bloco 81–90. Foram corrigidos o repasse do ambiente de execução dos manifestos para o processo virtual e a cobertura dos diagnósticos de perfis e problemas estruturais dos artefatos.
### Etapa 91/275 — Núcleo do AI Programmer

Adicionado o núcleo inicial do AI Programmer. A IA agora pode transformar uma solicitação em um plano persistente de desenvolvimento por projeto, identificando o tipo de tarefa, linguagem e alvo inicial, criando etapas de análise, preparação, implementação, build, teste, correção e finalização. O plano pode ser consultado, listado e atualizado pela API `ANZUBA_AI_PROGRAMMER` e pelos comandos Bridge `ai.program.plan.create`, `ai.program.plan.get`, `ai.program.plan.update` e `ai.program.plans.list`.
### Etapa 92/275 — Análise de requisitos do AI Programmer

O AI Programmer agora analisa a solicitação antes de criar o plano, detectando características do projeto, termos explícitos, restrições de alvo/linguagem e possíveis requisitos ausentes. A análise fica persistida junto ao plano e também pode ser solicitada diretamente pelo comando Bridge `ai.program.requirements.analyze`.
### Etapa 93/275 — Preparação automática do workspace

O AI Programmer agora pode preparar o workspace virtual de um plano de projeto. Ele cria uma raiz isolada em `/workspace/` com diretórios para código-fonte, assets, builds e testes, reutiliza diretórios já existentes e registra o workspace no plano. O comando Bridge `ai.program.workspace.prepare` executa essa preparação por projeto.
### Etapa 94/275 — Scaffold inicial do projeto

O AI Programmer agora consegue criar a estrutura inicial de código dentro do workspace do plano. O scaffold escolhe um arquivo de entrada conforme a linguagem detectada, aceita arquivos adicionais fornecidos pela IA, limita o tamanho/quantidade dos arquivos e impede escrita fora do workspace do projeto. O comando Bridge `ai.program.scaffold` executa essa etapa.

### Etapa 95/275 — Geração da implementação do projeto

O AI Programmer agora consegue transformar o plano e a linguagem detectada em arquivos iniciais de implementação e testes dentro do workspace virtual. A geração permanece isolada por projeto, aceita arquivos fornecidos pela IA, protege o workspace contra escrita fora da raiz e pode atualizar o estado da etapa de implementação. A operação está disponível pela API `ANZUBA_AI_PROGRAMMER.generateProgramFiles` e pelo comando Bridge `ai.program.generate`.

### Etapa 96/275 — Escrita da implementação gerada

O AI Programmer agora possui uma operação dedicada para gravar a implementação fornecida pela IA dentro do workspace do plano. A operação aceita até 100 arquivos, aplica limite de conteúdo, impede caminhos fora do workspace e respeita isolamento por projeto. Arquivos existentes são preservados por padrão e podem ser substituídos explicitamente. API: `ANZUBA_AI_PROGRAMMER.generateImplementation`. Bridge: `ai.program.implementation.write`.

### Etapa 97/275 — Validação da implementação

O AI Programmer agora consegue validar os arquivos de implementação gerados dentro do workspace. A operação verifica caminhos, existência, leitura e conteúdo dos arquivos, identifica arquivos ausentes ou vazios e retorna um diagnóstico consolidado sem executar o projeto. API: `ANZUBA_AI_PROGRAMMER.validateProgramImplementation`. Bridge: `ai.program.implementation.validate`.

### Etapa 98/275 — Preparação automática do build

O AI Programmer agora consegue encaminhar uma implementação validada para o Build System. A operação resolve o compilador instalado pela linguagem quando necessário, valida a origem e monta a preparação de build com saída, argumentos, ambiente, usuário e diretório de trabalho. O plano passa para a etapa de build em execução quando a preparação é aceita. API: `ANZUBA_AI_PROGRAMMER.prepareProgramBuild`. Bridge: `ai.program.build.prepare`.

### Etapa 99/275 — Execução automática do build

O AI Programmer agora consegue executar o pipeline de build preparado para um projeto. Ele resolve o compilador quando necessário, envia a implementação ao Build System, acompanha o resultado inicial e atualiza o plano para build concluído ou falho. API: `ANZUBA_AI_PROGRAMMER.runProgramBuild`. Bridge: `ai.program.build.run`.

### Etapa 100/275 — Diagnóstico do AI Programmer + auditoria da década

O AI Programmer recebeu `getProgrammerDiagnostics` e o comando Bridge `ai.program.diagnostics`, verificando planos persistidos, isolamento por projeto, etapas, workspaces e estados em execução. Após a implementação, foi realizada a varredura estrutural e a auditoria das etapas 91–100, cobrindo planejamento, requisitos, workspace, scaffolding, geração, escrita, validação, preparação e execução de build. A década 91–100 foi fechada com as correções necessárias encontradas na revisão.

### Etapa 101/275 — Núcleo inicial da Game Engine

Iniciada a Game Engine do ANZUBA com um núcleo persistente de cenas e entidades. Cada projeto possui suas próprias cenas, com configurações básicas de gravidade/câmera, entidades e componentes. A engine oferece criação, consulta, listagem, adição, atualização e remoção de entidades, com limites de segurança e isolamento por projeto. API: `ANZUBA_GAME_ENGINE`. Bridge: `game.scene.*` e `game.entity.*`.

### Etapa 101/275 — Núcleo da Game Engine

Iniciada a Fase 10 com o núcleo da Game Engine. O módulo agora mantém configuração persistente por projeto, suporta modo 2D/3D, cenas e entidades, fornece status agregado do engine e expõe comandos pelo AI Bridge. A ordem do manifesto também foi corrigida para carregar Project Manager e Virtual FS antes da Game Engine, garantindo que suas dependências estejam disponíveis.

### Etapa 102/275 — Transformações de entidades

A Game Engine agora possui posição, rotação e escala 3D normalizadas para entidades. Foram adicionadas operações para definir e consultar esses dados, com persistência por projeto e acesso pelo AI Bridge. Valores inválidos recebem valores padrão seguros.

### Etapa 103/275 — Cena ativa

A Game Engine agora permite selecionar e desativar a cena ativa do projeto. A seleção é persistente na configuração da engine, validada contra as cenas existentes e exposta pelo AI Bridge com `game.scene.activate` e `game.scene.deactivate`.

### Etapa 104/275 — Componentes de entidades

A Game Engine agora permite substituir e consultar o conjunto de componentes de uma entidade. Os dados são normalizados, persistidos por projeto e expostos pelo AI Bridge através de `game.entity.components.set` e `game.entity.components.get`.

### Etapa 105/275 — Hierarquia de entidades

A Game Engine agora suporta relações pai/filho entre entidades. A IA pode definir ou remover o pai de uma entidade e consultar seus filhos, com validação contra auto-parentesco, pais inexistentes e ciclos hierárquicos. A hierarquia permanece persistente e isolada por projeto e está disponível pelo AI Bridge.
