# ANZUBA

### Etapa 38/275 — Permissões do filesystem virtual

O filesystem do ANZUBA agora possui proprietário, grupo e modo de acesso nos arquivos e diretórios. As operações de leitura, listagem, criação, escrita, navegação e remoção podem consultar o usuário virtual através do gerenciador de permissões. O shell passou a respeitar essas permissões, conectando usuários/grupos do ANZUBA OS ao filesystem sem acessar o sistema de arquivos real do dispositivo.

### Etapa 37/275 — Registro de runtimes de comandos virtuais

O shell agora possui um registro interno de comandos executáveis. Módulos futuros podem registrar um runtime para um comando com `window.ANZUBA_SHELL.registerCommand()`; quando a IA chama esse comando, o shell cria um processo virtual, executa o handler dentro do ambiente do projeto, captura saída/código de retorno e encerra o processo. Também existem APIs para remover e listar comandos registrados. Executáveis encontrados no `PATH` continuam sendo diferenciados de comandos que já possuem runtime registrado.

### Etapa 36/275 — Descoberta de executáveis pelo PATH virtual

O shell agora consulta o `PATH` virtual do projeto quando recebe um comando que não é um built-in. Ele procura o executável dentro dos diretórios virtuais configurados e, quando encontra um arquivo correspondente, identifica corretamente que existe um executável virtual, mas que o runtime de execução ainda será conectado nas próximas etapas. A busca fica disponível em `window.ANZUBA_SHELL.findExecutable`.

### Etapa 35/275 — Variáveis de ambiente no Shell

O shell virtual agora entende variáveis do ambiente do projeto. Comandos podem usar formatos como `$HOME`, `$USER` e `${PATH}`, e o comando `export NOME=valor` grava variáveis no ambiente persistente do projeto. A expansão acontece antes da execução do comando, mantendo o shell conectado ao gerenciador de ambiente do ANZUBA OS.

# ANZUBA

### Etapa 34/275 — Shell virtual do ANZUBA OS

O ANZUBA agora possui uma primeira camada real de terminal virtual, executada exclusivamente sobre o sistema de arquivos e os recursos virtuais do projeto. O shell mantém diretório de trabalho e histórico por projeto, possui tokenização básica com aspas e caminhos relativos/absolutos e oferece comandos iniciais como `pwd`, `cd`, `ls`, `cat`, `mkdir`, `touch`, `echo`, `env`, `whoami`, `ps`, `uname`, `clear` e `help`.

A execução é feita por `window.ANZUBA_SHELL` e pela ponte de IA através de `shell.exec`, `shell.history` e `shell.history.clear`. Nesta etapa, o shell não executa comandos do sistema operacional real do dispositivo: todas as operações ficam dentro do ambiente virtual do ANZUBA.

# ANZUBA

### Etapa 33/275 — Usuários, grupos e permissões

O ANZUBA OS agora possui identidade de usuários e grupos por projeto. Cada ambiente começa com os usuários virtuais `root` e `ai`, grupos correspondentes e dados de home/shell. O núcleo permite criar e remover usuários adicionais, bloquear/desbloquear contas e consultar grupos.

Também foi criada a primeira camada de permissões estilo Unix, com proprietário, grupo e bits `rwx`. O usuário `root` possui acesso administrativo e os demais usuários podem ser avaliados pelas permissões de proprietário, grupo ou outros. As APIs ficam disponíveis em `window.ANZUBA_USERS`, com os comandos `user.list`, `user.get`, `user.create`, `user.remove`, `user.lock` e `permission.check`.

# ANZUBA

### Etapa 32/275 — Gerenciador de processos do ANZUBA OS

O ANZUBA agora possui um registro de processos virtual por projeto. Cada processo recebe PID, nome, comando, argumentos, usuário, diretório de trabalho, estado, horários e código de saída. O núcleo permite listar, consultar, iniciar, parar e finalizar processos sem misturar os estados entre projetos.

Quando o ANZUBA OS inicia, o gerenciador cria o processo virtual `anzuba-init` como PID 1. Quando o OS é desligado, os processos em execução são finalizados de forma controlada. As operações ficam disponíveis em `window.ANZUBA_PROCESSES` e pelos comandos `process.list`, `process.get`, `process.spawn`, `process.stop` e `process.terminate`.

### Etapa 31/275 — Núcleo do ANZUBA OS

O ANZUBA agora possui o primeiro núcleo persistente do sistema operacional virtual. Cada projeto recebe uma instância própria do **ANZUBA OS**, com identidade do sistema, kernel virtual, arquitetura, CPU, memória, disco, usuário `ai`, raiz de arquivos e estado de execução. O núcleo permite inicializar, consultar e desligar o sistema através de `window.ANZUBA_OS` e dos comandos `os.boot`, `os.status` e `os.shutdown`. A instância é isolada por projeto e persistida junto aos dados do ambiente.

# ANZUBA

### Etapa 31/275 — Núcleo do ANZUBA OS

O ANZUBA agora possui o primeiro núcleo persistente do sistema operacional virtual. Cada projeto recebe uma instância própria do **ANZUBA OS**, com identidade do sistema, kernel virtual, arquitetura, CPU, memória, disco, usuário `ai`, raiz de arquivos e estado de execução. O núcleo permite inicializar, consultar e desligar o sistema através de `window.ANZUBA_OS` e dos comandos `os.boot`, `os.status` e `os.shutdown`. A instância é isolada por projeto e persistida junto aos dados do ambiente.


### Etapa 30/275 — Exportação de projetos

O ANZUBA agora consegue exportar o projeto ativo para um arquivo JSON próprio. O menu do projeto ganhou **Exportar projeto**, gerando um arquivo `.anzuba.json` com metadados, IA associada e todos os dados persistidos do projeto. O formato é compatível com a importação da etapa 29 (`anzuba-project`, versão 1), enquanto o ID interno do projeto não é exportado para que a importação continue criando uma nova identidade sem sobrescrever projetos existentes.

A mesma operação também está disponível internamente pelo comando `project.export` e pela API `window.ANZUBA_PROJECTS.exportProject`.

### Etapa 29/275 — Importação de projetos

O ANZUBA agora consegue importar projetos salvos em um arquivo JSON próprio. O menu do projeto ganhou **Importar projeto**, que abre o seletor de arquivos e valida o formato (`anzuba-project`) e a versão antes de aceitar os dados. O projeto importado recebe um novo ID para não sobrescrever projetos existentes, passa a ser o projeto ativo e preserva seus dados, IA associada e ambiente persistido. A mesma operação também fica disponível internamente por `project.import` e pela API `window.ANZUBA_PROJECTS.importProjectFromFile`.

### Etapa 28/275 — Seletor visual de conversas

O menu do projeto agora possui uma área **Conversas do projeto**. Ela lista as sessões persistidas, mostra título e quantidade de mensagens, destaca a sessão ativa e permite trocar a sessão diretamente pela interface. A seleção continua sendo persistida pelo gerenciador de sessões da etapa 27. A interface não tenta controlar a navegação interna do site da IA; ela apenas controla qual sessão persistida do ANZUBA está ativa.

### Etapa 27/275 — Gerenciador de sessão ativa do chat

O projeto agora possui uma sessão de chat ativa explícita. A sessão atual é marcada automaticamente durante a sincronização e pode ser consultada com `chat.session.active` ou selecionada com `chat.session.select`. A seleção é persistida dentro do projeto e dispara `anzuba:chat-session-changed`, permitindo que a futura interface de histórico alterne entre conversas sem misturar os dados. Esta etapa gerencia a sessão persistida internamente; ela não tenta alterar ou navegar a conversa do site da IA.

### Etapa 26/275 — Identidade estável de conversas e mensagens

Os snapshots do chat agora usam IDs determinísticos para conversas e mensagens. O ID da conversa é derivado do host e da rota da página, enquanto cada mensagem recebe um identificador baseado no papel, conteúdo e ocorrência dentro da conversa. Isso reduz a dependência da posição das mensagens no DOM e evita que uma mesma conversa seja tratada como sessões diferentes quando a página é atualizada. A página raiz continua usando `current` para não criar uma sessão falsa sem uma rota de conversa identificável.

### Etapa 25/275 — Sessões de chat por projeto

Cada projeto agora pode manter várias conversas da IA separadamente. Durante a sincronização, o snapshot atual é salvo ou atualizado dentro de `chatSessions`, usando o identificador da conversa para evitar misturar históricos. O comando `chat.sessions` permite consultar todas as sessões persistidas do projeto, enquanto `chat.messages` continua retornando a conversa atual.

### Etapa 24/275 — Histórico incremental e deduplicado do chat

O histórico persistido agora é normalizado antes de ser salvo e consultado. As mensagens vazias são descartadas, cada mensagem recebe um ID estável por conversa/posição quando necessário e atualizações do texto da mesma mensagem substituem o conteúdo existente em vez de criar duplicatas. O ANZUBA também evita gravar novamente o projeto quando o estado do chat não mudou. A API getChatMessages ficou disponível em window.ANZUBA_PROJECTS, enquanto chat.messages continua sendo o comando da ponte para consultar o histórico.

ANZUBA é uma extensão de navegador que evoluirá para um sistema operacional virtual dedicado a IAs, executado dentro do navegador.

## Roadmap

O projeto será desenvolvido em 275 etapas, com cada etapa sendo implementada, testada e aprovada antes da próxima.

### Etapa 23/275 — Persistência do histórico do chat

O projeto agora mantém um snapshot das mensagens da conversa vinculada, incluindo ID, papel (usuário/assistente) e texto. O estado pode ser consultado com `chat.messages`, permitindo que o projeto preserve o contexto do chat mesmo quando a página da IA é atualizada.

### Etapa 22/275 — Chat vinculado ao projeto

O ANZUBA agora vincula o chat atual ao projeto ativo. O projeto pode guardar IA, URL, título, identificador da conversa, quantidade de mensagens e horário da última sincronização. O estado é atualizado quando a conversa ou a página muda e pode ser consultado com `chat.state` ou sincronizado manualmente com `chat.bind`. Isso cria a base para o projeto acompanhar uma conversa específica da IA sem misturar chats de projetos diferentes.

### Etapa 21/275 — Metadados e resumo estruturado de projetos

O sistema de projetos agora consegue gerar um resumo seguro e padronizado de um projeto, incluindo ID, nome, IA associada, datas, existência de dados e quais áreas de dados estão presentes. O comando `project.summary` permite consultar o projeto ativo ou um projeto específico sem expor todo o conteúdo interno.

### Etapa 20/275 — Estado unificado da integração com a IA

O ANZUBA agora possui um estado unificado da integração atual. O comando `ai.integration.status` reúne em uma única resposta a IA detectada, conexão, capacidades disponíveis, estado da página e snapshot da conversa. Isso cria um ponto único para os módulos seguintes consultarem o estado da integração sem precisar conhecer os detalhes dos adaptadores.

### Etapa 19/275 — Descoberta de capacidades da IA

O ANZUBA agora consegue consultar quais recursos de integração estão disponíveis na IA detectada. O comando `ai.capabilities` informa, de forma padronizada, se o adaptador consegue enviar mensagens, ler a conversa, observar mudanças na conversa e acompanhar mudanças da página. Isso permite que os próximos módulos decidam o que podem executar sem depender de verificações específicas de cada site.

### Etapa 18/275 — Estado e navegação da IA

O ANZUBA agora acompanha o estado da página da IA, incluindo URL, título, conversa atual e quantidade de mensagens. O sistema detecta mudanças de rota em aplicações SPA (`pushState`, `replaceState` e `popstate`) e também alterações relevantes da página. Foram adicionados `ai.page.state` e `ai.page.observe`, com o evento `ai:page-changed`, permitindo que o núcleo saiba quando a IA mudou de conversa ou rota sem depender de recarregamento completo.

### Etapa 17/275 — Monitoramento da conversa

O ANZUBA agora consegue acompanhar mudanças estruturais na conversa. Cada adaptador pode obter um identificador da conversa, gerar um snapshot das mensagens e observar alterações no histórico. O comando `ai.conversation.observe` mantém esse monitoramento ativo e emite `ai:conversation-changed` quando o conteúdo muda. O monitoramento pode ser encerrado com o mesmo comando usando `enabled: false`.

### Etapa 16/275 — Contexto da conversa

O ANZUBA agora consegue montar um contexto estruturado da conversa atual. Além das respostas da IA, o sistema identifica mensagens do usuário e da IA, preserva a ordem encontrada e inclui informações básicas da página e da IA ativa. O comando `ai.conversation.context` disponibiliza esse contexto para os próximos módulos, permitindo que o ANZUBA trabalhe com a conversa atual sem depender diretamente da estrutura interna de cada site.

### Etapa 15/275 — Leitura das respostas da IA

Os adaptadores agora conseguem localizar mensagens produzidas pela IA e observar novas respostas na página. A ponte ganhou os comandos `ai.message.list` e `ai.message.observe`; quando uma nova resposta é detectada, o ANZUBA emite o evento `ai:message` com o conteúdo identificado. A observação é feita pelo adaptador do site, mantendo o núcleo independente da estrutura específica de cada IA.

### Etapa 14/275 — Canal de mensagens com a IA

Os adaptadores agora conseguem interagir com o campo de mensagem da IA. O ANZUBA pode preencher o compositor e solicitar o envio de uma mensagem através de comandos da ponte (`ai.message.set` e `ai.message.send`). O sistema usa primeiro o botão de envio quando disponível e possui uma alternativa por Enter. A implementação mantém essa lógica dentro dos adaptadores, evitando acoplamento do núcleo a um site específico.

### Etapa 13/275 — Adaptadores dos sites de IA

O ANZUBA agora possui uma camada de adaptadores para os sites de IA suportados. Cada IA possui uma identidade própria dentro do núcleo e uma interface comum para localizar elementos de interação da página, começando pelo campo de composição da mensagem. A camada expõe `window.ANZUBA_AI_ADAPTERS`, permite inspecionar se o adaptador e o compositor foram encontrados e registra o comando `ai.adapter.inspect` na ponte. Isso separa a lógica específica de cada site do restante do ANZUBA e prepara a comunicação bidirecional das próximas etapas.

### Etapa 12/275 — Protocolo de comandos da IA

A ponte de IA agora possui um protocolo interno de comandos. Módulos do ANZUBA podem registrar comandos com `on()` e executá-los com `request()`, recebendo o contexto atual do projeto e da IA. Cada execução recebe um ID e emite eventos de início, conclusão ou erro. O comando `context.get` já está disponível como primeiro comando nativo. Essa camada prepara a comunicação estruturada entre a IA e os recursos do ANZUBA.

### Etapa 11/275 — Ponte de integração com IA

O ANZUBA agora possui uma camada padronizada de integração com a IA detectada. A ponte fornece identidade da IA, contexto básico da página, projeto ativo e capacidades disponíveis do ANZUBA sem acoplar o núcleo a um provedor específico. Também existe um sistema interno de eventos para as próximas integrações.

A ponte fica disponível em `window.ANZUBA_AI_BRIDGE` e prepara a comunicação entre o site de IA e o ambiente virtual do ANZUBA.

### Etapa 10/275 — Ambiente virtual por projeto

Cada projeto agora possui variáveis de ambiente e um `PATH` próprios, persistidos no armazenamento do projeto. O ambiente inicial inclui `HOME`, `USER`, `SHELL`, `PWD` e caminhos básicos. O núcleo pode definir, remover e consultar variáveis, além de adicionar ou remover caminhos do `PATH`. Essa camada prepara o terminal e a descoberta de ferramentas das próximas etapas.

### Etapa 9/275 — Gerenciador de recursos

Cada projeto agora possui um registro próprio de recursos. O núcleo pode cadastrar e atualizar ferramentas, compiladores, SDKs, bibliotecas, runtimes, engines e pacotes, além de pesquisar recursos pelo nome, tipo ou versão. Essa camada será usada pelo Tool Manager e pelo sistema de instalação nas próximas etapas.

### Etapa 8/275 — Materiais

O ANZUBA agora possui um gerenciador de materiais 3D por projeto. Materiais persistem dentro do projeto e podem ser criados, consultados, atualizados e removidos. A estrutura suporta materiais Standard, Physical e Unlit, além de cor, opacidade, transparência, roughness, metalness, emissive e mapas de textura, preparando a integração com o pipeline 3D.

### Etapa 7/275 — Sistema de arquivos virtual

Cada projeto agora recebe um sistema de arquivos virtual persistente, separado dos demais projetos. A estrutura inicial inclui `/home/ai/`, `/projects/`, `/tools/`, `/usr/`, `/bin/`, `/tmp/`, `/etc/` e `/workspace/`. O núcleo fornece operações para criar diretórios, criar/ler arquivos, listar diretórios, verificar existência e remover itens. A API fica disponível em `window.ANZUBA_FS` para as próximas etapas do ANZUBA OS.

### Etapa 6/275 — Dados isolados por projeto

Cada projeto agora possui um espaço de dados próprio. O núcleo fornece operações para ler, atualizar e limpar os dados somente do projeto selecionado, evitando que configurações e estados de projetos diferentes sejam misturados. Esses dados continuam persistidos no armazenamento local da extensão.

### Etapa 5/275 — Persistência do projeto ativo

O projeto ativo agora é persistido separadamente e restaurado automaticamente após recarregar a página ou a extensão. Cada projeto também possui seu próprio objeto `data`, preparado para armazenar o estado do ambiente nas próximas etapas. A troca de projeto atualiza o estado ativo e dispara o evento interno `anzuba:project-changed`.

### Etapa 4/275 — Sistema inicial de projetos

O ANZUBA agora possui a primeira camada real do sistema de projetos. O botão “Novo projeto Anzuba” abre a criação de um projeto, os projetos são persistidos em `chrome.storage.local` e podem ser reabertos pelo menu de projetos.

Cada projeto recebe ID, nome, IA associada quando detectada e datas de criação/atualização. Esta etapa prepara a base para os ambientes virtuais persistentes das próximas etapas.

### Etapa 3/275 — Adaptação visual automática

O ANZUBA agora analisa automaticamente o tema visual básico da página hospedeira (claro/escuro, fundo, texto, fonte e raio de componentes) e usa essas informações para adaptar sua própria interface. A adaptação é dinâmica e acompanha mudanças de tema da página.

### Etapa 2/275 — Detecção de sites de IA

A extensão agora reconhece ChatGPT, Gemini, DeepSeek, Claude e Manus. A detecção é baseada no domínio da página e fica disponível internamente para as próximas etapas.

## Teste da etapa 2

1. Em chrome://extensions, abra o ANZUBA.
2. Clique em Recarregar depois de atualizar os arquivos.
3. Abra um dos sites suportados.
4. Confirme que aparece ANZUBA e o nome da IA detectada.
5. Teste também uma página que não seja uma IA e confirme que o ANZUBA continua ativo, mas sem marcar uma IA.
6. Navegue entre páginas/rotas do site e confirme que a detecção continua sendo atualizada.

### Sites reconhecidos

| IA | Domínio |
|---|---|
| ChatGPT | chatgpt.com / chat.openai.com |
| Gemini | gemini.google.com |
| DeepSeek | chat.deepseek.com |
| Claude | claude.ai |
| Manus | manus.im |

A etapa 2 só será considerada concluída depois do teste no navegador.
