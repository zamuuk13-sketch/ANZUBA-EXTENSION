# ANZUBA

ANZUBA é uma extensão de navegador que evoluirá para um sistema operacional virtual dedicado a IAs, executado dentro do navegador.

## Roadmap

O projeto será desenvolvido em 275 etapas, com cada etapa sendo implementada, testada e aprovada antes da próxima.

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
