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
