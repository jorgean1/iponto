# Iponto

Aplicação web instalável para Windows e Android que agenda os botões **Iniciar** e **Parar** no Controle de Projetos e envia o resultado por e-mail.

## Arquitetura importante

A interface funciona no Windows e no Android como PWA. A automação precisa continuar rodando em um computador Windows ou servidor com Node.js; navegadores Android suspendem tarefas em segundo plano e não oferecem a confiabilidade necessária para horários exatos.

O agendador possui tolerância de 15 minutos para retomada após reinício ou suspensão. Depois desse período, registra o ponto como perdido no histórico em vez de realizar uma batida muito atrasada.

## Instalação no Windows

1. Abra PowerShell como usuário normal na pasta `D:\iponto`.
2. Execute `npm install`.
3. Execute `npm run install-browser`.
4. Inicie com `npm start`.
5. Abra `http://localhost:3077`.

Depois da primeira instalação, você também pode dar duplo clique em `iniciar-iponto.cmd`.

Para acessar pelo Android na mesma rede, abra `http://IP-DO-COMPUTADOR:3077` no Chrome e escolha **Adicionar à tela inicial**. O Firewall do Windows pode precisar liberar a porta 3077 para rede privada.

## Configuração

- Informe os quatro horários, credenciais do site e e-mail de alerta.
- Preencha SMTP. Microsoft 365 costuma usar `smtp.office365.com`, porta `587`, SSL direto desmarcado. Gmail costuma exigir senha de app.
- Use **Testar e-mail**.
- Use **Testar acesso à página** para validar URL, login e presença dos botões sem registrar ponto.
- Salve e ative **Automação ativa**.
- Os códigos de atividade são opcionais. Informe um ou vários separados por vírgula; o Iponto alterna a lista a cada **Entrada** e **Retorno** bem-sucedidos.
- Quando a página exibe várias atividades **Iniciar**, o Iponto escolhe aleatoriamente um dos links de atividade `a.btnIniciar`. O botão genérico ao lado do código e o controle **Parar** nunca participam desse sorteio.
- Um clique só é considerado bem-sucedido após confirmação do estado no site: **Parar** deve aparecer depois de iniciar e desaparecer depois de parar.

As senhas são criptografadas com AES-256-GCM. A chave fica em `data/iponto.key`; proteja e faça backup desse arquivo. Opcionalmente defina `IPONTO_MASTER_KEY` no ambiente.

## Inicialização automática

Execute `powershell -ExecutionPolicy Bypass -File .\install-windows-task.ps1` dentro de `D:\iponto`. Isso cria uma tarefa do Windows para iniciar o Iponto no logon do usuário atual.

## Diagnóstico

- Estado do serviço: `http://localhost:3077/api/health`
- Histórico: tela principal e `data/iponto.json`
- Para observar o navegador durante ajustes: defina `IPONTO_HEADLESS=false` antes de iniciar.
- A URL padrão de lançamentos é `https://controledeprojetos.crptecnologia.com.br/Lancamentos` e permanece editável na interface.

Antes de usar em produção, confirme que a automação de ponto é permitida pela política da sua empresa e faça testes manuais supervisionados.
