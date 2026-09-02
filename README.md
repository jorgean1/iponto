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
- Selecione os dias da semana em que a automação pode funcionar. O padrão é segunda a sexta-feira.
- Em **Feriados e férias**, informe uma data por linha (`2026-09-07`) ou um período (`2026-12-21 a 2027-01-05`). Nessas datas nenhuma ação ou e-mail é executado.
- Preencha SMTP. Microsoft 365 costuma usar `smtp.office365.com`, porta `587`, SSL direto desmarcado. Gmail costuma exigir senha de app.
- Use **Testar e-mail**.
- Use **Testar acesso à página** para validar URL, login e presença dos botões sem registrar ponto.
- Salve e ative **Automação ativa**.
- Há um código de atividade opcional para a **1ª entrada** e outro para a **2ª entrada** (retorno do almoço).
- Quando o código da respectiva entrada está preenchido, o Iponto digita o código e usa o botão genérico **Iniciar**, sem sorteio.
- Quando o código está vazio, o Iponto escolhe aleatoriamente um dos links de atividade `a.btnIniciar`. O botão genérico e o controle **Parar** não participam desse sorteio.
- Um clique só é considerado bem-sucedido após confirmação do estado no site: **Parar** deve aparecer depois de iniciar e desaparecer depois de parar.
- Sem código, são usados exclusivamente os links cujo `onclick` chama `IniciarAtividade(...)`. Se uma tentativa não for confirmada, o Iponto volta a `/Lancamentos`, reconcilia o estado e tenta outra atividade, até três vezes sem repetir a opção enquanto houver alternativas.
- Os e-mails usam os assuntos **SUCESSO CONFIRMADO** ou **FALHA AO REGISTRAR** e incluem o identificador do mesmo evento salvo no histórico.
- Após cada batida, o navegador automatizado atualiza a página de lançamentos e confirma novamente o estado. As telas abertas do Iponto detectam o novo sucesso e se atualizam automaticamente.

As senhas são criptografadas com AES-256-GCM. A chave fica em `data/iponto.key`; proteja e faça backup desse arquivo. Opcionalmente defina `IPONTO_MASTER_KEY` no ambiente.

## Inicialização automática

Execute `powershell -ExecutionPolicy Bypass -File .\install-windows-task.ps1` dentro de `D:\iponto`. Isso cria uma tarefa do Windows para iniciar o Iponto no logon do usuário atual.

## Diagnóstico

- Estado do serviço: `http://localhost:3077/api/health`
- Histórico: tela principal e `data/iponto.json`
- Para observar o navegador durante ajustes: defina `IPONTO_HEADLESS=false` antes de iniciar.
- A URL padrão de lançamentos é `https://controledeprojetos.crptecnologia.com.br/Lancamentos` e permanece editável na interface.

Antes de usar em produção, confirme que a automação de ponto é permitida pela política da sua empresa e faça testes manuais supervisionados.
