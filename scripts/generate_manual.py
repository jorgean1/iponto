from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf' / 'Manual-do-Iponto.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)

BLUE = colors.HexColor('#0756A3'); CYAN = colors.HexColor('#08A4CB'); INK = colors.HexColor('#17253B')
MUTED = colors.HexColor('#667085'); PALE = colors.HexColor('#EEF5FA'); GREEN = colors.HexColor('#138A58')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=32, leading=38, textColor=colors.white, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name='CoverSub', parent=styles['Normal'], fontSize=13, leading=19, textColor=colors.white, alignment=TA_CENTER))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontSize=22, leading=27, textColor=BLUE, spaceBefore=4, spaceAfter=12))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontSize=15, leading=19, textColor=INK, spaceBefore=12, spaceAfter=7))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontSize=10.5, leading=16, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name='Smallx', parent=styles['BodyText'], fontSize=8.5, leading=12, textColor=MUTED))
styles.add(ParagraphStyle(name='Callout', parent=styles['BodyText'], fontSize=10, leading=15, textColor=INK, backColor=PALE, borderColor=CYAN, borderWidth=0.8, borderPadding=9, spaceBefore=7, spaceAfter=10))

def footer(canvas, doc):
    canvas.saveState(); canvas.setStrokeColor(colors.HexColor('#DCE5EE')); canvas.line(18*mm, 15*mm, 192*mm, 15*mm)
    canvas.setFont('Helvetica', 8); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 10*mm, 'Iponto - Manual do usuário')
    canvas.drawRightString(192*mm, 10*mm, f'Página {doc.page}'); canvas.restoreState()

def step(n, title, text):
    badge = Table([[Paragraph(f'<b>{n}</b>', styles['Bodyx'])]], colWidths=[10*mm], rowHeights=[10*mm])
    badge.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('TEXTCOLOR',(0,0),(-1,-1),BLUE),('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('BOX',(0,0),(-1,-1),0.5,CYAN)]))
    content = [Paragraph(f'<b>{title}</b>', styles['Bodyx']), Paragraph(text, styles['Smallx'])]
    table = Table([[badge, content]], colWidths=[14*mm, 155*mm], hAlign='LEFT')
    table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    return table

story=[]
cover = Table([[Paragraph('Iponto', styles['CoverTitle'])],[Paragraph('Instalação, configuração e operação segura', styles['CoverSub'])],[Spacer(1,18*mm)],[Paragraph('Automação de jornada para Windows e Android', styles['CoverSub'])]], colWidths=[174*mm], rowHeights=[35*mm,22*mm,25*mm,30*mm])
cover.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),BLUE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('BOX',(0,0),(-1,-1),0,BLUE)]))
story += [Spacer(1,28*mm), cover, Spacer(1,20*mm), Paragraph('Versão 1.4 - Setembro de 2026', ParagraphStyle('v',parent=styles['Smallx'],alignment=TA_CENTER)), PageBreak()]

story += [Paragraph('1. O que é o Iponto', styles['H1x']), Paragraph('O Iponto mantém um serviço no Windows que abre o Controle de Projetos nos horários configurados, autentica quando necessário, inicia ou para uma atividade e envia o resultado por e-mail.', styles['Bodyx']), Paragraph('<b>Importante:</b> a interface pode ser aberta no Android, mas a automação roda no computador Windows. O computador precisa estar ligado e com o usuário conectado.', styles['Callout'])]
data=[[Paragraph('<b>Horário</b>',styles['Bodyx']),Paragraph('<b>Ação</b>',styles['Bodyx'])],['Entrada','Usa o código da 1ª entrada; se vazio, sorteia uma atividade recente'],['Saída para almoço','Clica no controle Parar e confirma que a atividade terminou'],['Retorno do almoço','Usa o código da 2ª entrada; se vazio, sorteia uma atividade recente'],['Saída','Clica no controle Parar e confirma que a atividade terminou']]
t=Table(data,colWidths=[48*mm,121*mm]); t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#DCE5EE')),('VALIGN',(0,0),(-1,-1),'TOP'),('FONTNAME',(0,1),(-1,-1),'Helvetica'),('FONTSIZE',(0,1),(-1,-1),9.5),('LEADING',(0,1),(-1,-1),14),('PADDING',(0,0),(-1,-1),7)])); story += [t, Spacer(1,8*mm)]

story += [Paragraph('2. Instalação no Windows', styles['H1x']), step(1,'Execute o instalador','Dê duplo clique em Iponto-Setup.exe e aceite a solicitação de administrador.'), step(2,'Aguarde a preparação','O instalador configura Node.js, dependências, Chromium, Firewall, tarefa automática e atalhos.'), step(3,'Abra o Iponto','Ao concluir, o navegador abre http://localhost:3077. Um atalho também fica na Área de Trabalho.'), Paragraph('A instalação padrão fica em <b>C:\\Iponto</b>. Configurações e histórico ficam na pasta <b>data</b>.', styles['Callout'])]

story += [PageBreak(), Paragraph('3. Configuração inicial', styles['H1x']), step(1,'Horários e dias','Informe os quatro horários e marque os dias da semana de funcionamento.'), step(2,'Feriados e férias','Informe datas individuais como 2026-09-07 ou períodos como 2026-12-21 a 2027-01-05, um por linha. O Iponto não executa nessas datas.'), step(3,'Acesso','Informe usuário e senha do Controle de Projetos. Confirme a URL /Lancamentos.'), step(4,'Atividades','Há um código opcional para a 1ª entrada e outro para a 2ª entrada (retorno). Se preenchido, ele será usado sem sorteio; se vazio, uma atividade recente será sorteada.'), step(5,'E-mail e ativação','Informe os dados SMTP, marque Automação ativa e salve a configuração.'), Paragraph('<b>VPN:</b> se a página de registro do ponto exigir VPN, a VPN deverá estar conectada no computador Windows no horário em que cada ponto for batido. Sem a conexão, o Iponto poderá não conseguir acessar a página nem registrar o ponto.', styles['Callout'])]
story += [Paragraph('Gmail', styles['H2x']), Paragraph('Servidor: <b>smtp.gmail.com</b>; porta <b>587</b>; SSL direto desmarcado. Use seu Gmail completo como usuário e remetente. No campo de senha, use uma Senha de app do Google, não a senha normal da conta.', styles['Callout'])]

story += [Paragraph('4. Testes antes do primeiro uso', styles['H1x']), step(1,'Testar e-mail','Clique em Testar e-mail e confirme o recebimento.'), step(2,'Testar acesso','Valida URL, login e controles Iniciar/Parar sem registrar ponto.'), step(3,'Teste manual','Os quatro botões manuais podem registrar um ponto real. Use somente quando desejar efetuar a ação imediatamente.'), Paragraph('Um acesso válido mostra HTTP 200, login realizado ou sessão autenticada e a quantidade de controles encontrados.', styles['Callout'])]

story += [PageBreak(), Paragraph('5. Histórico e alertas', styles['H1x']), Paragraph('Cada execução gera um registro com data, horário, ação, sucesso ou motivo da falha. O botão Limpar histórico remove apenas essa lista e preserva as configurações.', styles['Bodyx']), Paragraph('Falhas reconhecidas: sem internet, página não respondeu, serviço parado e outro motivo. O agendador aceita até 15 minutos de atraso após uma suspensão ou reinício.', styles['Callout']), Paragraph('6. Uso no Android', styles['H1x']), step(1,'Descubra o IP do computador','No Windows, execute ipconfig e procure o Endereço IPv4 da rede local.'), step(2,'Abra no celular','Com os dois dispositivos na mesma rede, abra http://IP-DO-COMPUTADOR:3077 no Chrome.'), step(3,'Instale como aplicativo','No menu do Chrome, escolha Adicionar à tela inicial ou Instalar aplicativo.'), Paragraph('O Android é apenas a interface remota. Não desligue o Windows esperando que o celular execute a automação.', styles['Callout']), Paragraph('7. Navegação e Ajuda', styles['H1x']), Paragraph('Clique no título de cada seção para expandir ou recolher seu conteúdo. Horários sempre inicia expandido. Antes da primeira configuração, as demais seções iniciam abertas; depois de configurado, Acesso e atividade, Alertas por e-mail, Teste manual e Histórico iniciam recolhidos.', styles['Bodyx']), Paragraph('No menu <b>Ajuda</b>, escolha <b>Abrir manual de instruções</b> para abrir este documento ou <b>Sobre o Iponto</b> para consultar versão, desenvolvimento, tecnologias e plataformas.', styles['Callout'])]

story += [PageBreak(), Paragraph('8. Extensão de atualização automática', styles['H1x']), Paragraph('A extensão opcional para Chrome ou Edge permite que o Iponto atualize também a aba aberta do Controle de Projetos depois de cada ponto confirmado, mesmo quando essa aba não está em foco.', styles['Bodyx']), step(1,'Extraia o pacote','Extraia Iponto-Extensao-Chrome.zip para uma pasta permanente. Não apague essa pasta depois da instalação.'), step(2,'Abra as extensões','No Chrome, abra chrome://extensions. No Edge, abra edge://extensions.'), step(3,'Ative o modo de desenvolvedor','Habilite Modo do desenvolvedor e clique em Carregar sem compactação (Chrome) ou Carregar sem pacote (Edge).'), step(4,'Selecione a pasta','Escolha a pasta extraída que contém manifest.json. Fixe o ícone Iponto na barra do navegador.'), step(5,'Confirme a conexão','Deixe o Iponto rodando em http://localhost:3077. Clique no ícone da extensão e confirme a mensagem Conectado ao Iponto.'), Paragraph('Após um novo sucesso confirmado, a extensão recarrega as abas de /Lancamentos e do Iponto. O botão Atualizar páginas agora permite testar o recurso a qualquer momento.', styles['Callout']), Paragraph('<b>Android:</b> o Chrome para Android não permite instalar essa extensão sem compactação. A extensão atua no Chrome ou Edge do computador Windows onde o Iponto está rodando.', styles['Callout'])]

story += [Paragraph('9. Solução de problemas', styles['H1x'])]
trouble=[['Sintoma','O que verificar'],['Iponto não abriu','Abra o atalho. No Agendador de Tarefas, confirme que Iponto está Em execução.'],['Ponto não executado','Confira horário, fuso, Windows ligado e VPN, quando exigida.'],['Página inacessível','Se o Controle de Projetos exigir VPN, conecte-a antes dos horários agendados.'],['HTTP 404','A URL correta termina em /Lancamentos, no plural.'],['Parar não encontrado','Execute novamente Testar acesso e confirme que há atividade em andamento.'],['E-mail não chegou','Revise SMTP, spam e Senha de app. Use Testar e-mail.'],['Android não conecta','Use a mesma rede Wi-Fi e confirme que a rede do Windows está como Privada.']]
tt=Table(trouble,colWidths=[48*mm,121*mm],repeatRows=1); tt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),BLUE),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#DCE5EE')),('VALIGN',(0,0),(-1,-1),'TOP'),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTNAME',(0,1),(-1,-1),'Helvetica'),('FONTSIZE',(0,0),(-1,-1),9),('LEADING',(0,0),(-1,-1),13),('PADDING',(0,0),(-1,-1),7)])); story += [tt, Spacer(1,8*mm), Paragraph('<b>Segurança:</b> as senhas são criptografadas localmente. Proteja o computador e faça backup de C:\\Iponto\\data. Confirme também que o uso de automação de ponto é permitido pela sua empresa.', styles['Callout'])]

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=18*mm,bottomMargin=20*mm,title='Manual do Iponto',author='Iponto')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
