# ANZUBA

ANZUBA é uma extensão de navegador que evoluirá para um sistema operacional virtual dedicado a IAs, executado dentro do navegador.

## Roadmap

O projeto será desenvolvido em 275 etapas, com cada etapa sendo implementada, testada e aprovada antes da próxima.

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
