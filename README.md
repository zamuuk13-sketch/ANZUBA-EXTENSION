# ANZUBA

ANZUBA é uma extensão de navegador que evoluirá para um sistema operacional virtual dedicado a IAs, executado dentro do navegador.

## Roadmap

O projeto será desenvolvido em 275 etapas, com cada etapa sendo implementada, testada e aprovada antes da próxima.

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
