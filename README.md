# Ondas

Sintetizador polifónico para usar diretamente no navegador de telemóveis, tablets e computadores. Não requer aplicação nativa; a instalação como PWA é opcional. React, TypeScript, Vite e Web Audio API, sem biblioteca de síntese.

Inclui também instrumentos reais leves carregados apenas quando selecionados: piano de cauda, guitarra acústica e guitarra elétrica. As amostras ficam na cache do navegador após a primeira utilização. A coleção deriva de `nbrosowsky/tonejs-instruments`; código MIT e amostras CC BY 3.0. A reprodução por amostras requer Internet na primeira utilização de cada instrumento.

As duas guitarras abrem uma interface própria com corpo ilustrado, braço de 13 casas e seis cordas animadas. Cada corda mostra o número e a nota aberta (Mi2, Lá2, Ré3, Sol3, Si3 e Mi4), e a casa selecionada apresenta o nome da nota resultante. O utilizador escolhe Palheta, Dedilhado ou Rasgueado; clicar numa casa seleciona e toca imediatamente a nota com o picking ativo. As teclas 1–6 repetem as cordas já escolhidas e as setas para cima/baixo palhetam o acorde selecionado, sem exigir duas ações simultâneas. Estão incluídas as formas Em, G, C, D, Am, E e A.

Na guitarra acústica, Dedilhado usa ataque mais suave, menor brilho e pequenas diferenças determinísticas de intensidade entre cordas; Palheta usa ataque mais curto e brilhante. O rasgueado permite controlar intensidade e duração total do gesto. A direção muda a ordem das cordas, a articulação e a distribuição da velocity ao longo do movimento — não é apenas um atraso igual aplicado ao acorde. No piano roll, Dedilhado, Palhetada e rasgueados para cima/baixo podem ser atribuídos às notas selecionadas e são preservados no projeto e na exportação WAV.

O piano roll dispõe também de gestos de rasgueado persistentes e não destrutivos. Um gesto liga entre duas e seis notas com o mesmo início musical e guarda os respetivos IDs, direção, duração em milissegundos e intensidade. Alterar a duração recalcula os ataques sem mover os passos das notas, evitando aplicar o atraso duas vezes. As notas continuam editáveis; se deixarem de formar um grupo válido, o gesto é removido em segurança. Os gestos acompanham Guardar/Abrir, duplicação de blocos, clips musicais, Undo/Redo, reprodução e exportação WAV.

Na guitarra elétrica, a intensidade controla em conjunto ganho e brilho. Palhetadas para baixo e para cima usam ataques e acentos direcionais distintos; os gestos persistentes da guitarra acústica são reutilizados sem alterar as posições das notas. **Palm mute** aplica ataque controlado, forte redução de brilho e release curto para aproximar cordas abafadas. A palhetada elétrica normal conserva uma libertação mais longa que a acústica. Bends e vibrato permanecem fora desta etapa: a intenção expressiva continua centralizada para que parâmetros contínuos de pitch possam ser acrescentados posteriormente sem criar outro sistema de reprodução. Pedais e efeitos de guitarra adicionais ficam reservados para a Fase 5.

O baixo elétrico usa amostras próprias e uma interface de quatro cordas animadas afinadas em Mi1, Lá1, Ré2 e Sol2. Permite Dedos, Palheta, Slap e Palm mute, com dinâmica, envelopes e resposta visual distintos. As teclas 1–4 repetem as cordas selecionadas e o visor mostra sempre a última nota tocada. No piano roll, cada nota pode escolher individualmente uma das quatro técnicas; a escolha é preservada em projetos, clips, reprodução e exportação WAV. Notas antigas continuam a usar o som legado.

As amostras disponíveis para o baixo têm apenas quatro raízes, em Mi1, Mi2, Mi3 e Mi4. O Ondas mostra um aviso quando uma nota fica a mais de sete semitons da raiz mais próxima, mas não impede a composição nem tenta esconder a transposição excessiva com filtros. O Slap é uma aproximação por ataque, brilho e envelope: sem uma amostra própria, não reproduz integralmente a corda a bater nos trastes.

Os sintetizadores da biblioteca suportam agora articulações **Normal**, **Suave** e **Acentuada** por nota. No modo expressivo, velocity controla amplitude, cutoff, intensidade do envelope do filtro e a velocidade relativa do attack. O attack é escalado a partir do valor do preset, em vez de o substituir por um tempo fixo, preservando a identidade de pads, leads, teclas e baixos. Notas antigas sem articulação continuam no caminho histórico; escolher explicitamente uma articulação ativa a resposta expressiva na reprodução, clips e WAV. A intenção musical permanece centralizada e pode futuramente receber LFO, aftertouch e automação sem duplicar o motor, mas essas modulações ainda não estão implementadas.

## HTML autónomo

Abrir o ficheiro Ondas.html diretamente no navegador, sem Node.js ou servidor. Inclui o código, estilos e ícone; não requer ligação à Internet. Clicar em Ativar áudio para começar. A instalação PWA aplica-se apenas à versão servida por HTTPS. A persistência de presets em ficheiros locais depende do navegador.

Para regenerar após alterações: executar npm run build e depois node scripts/export-html.mjs.

## Executar

Requer Node.js 22 ou superior e npm.

```sh
npm ci
npm run dev
```

Abrir o endereço indicado pelo Vite (normalmente http://localhost:5173). Clicar **Ativar áudio** ou tocar numa tecla. Começar com volume moderado.

```sh
npm run build
npm run preview
```

A build está em `dist/`. Servir essa pasta através de HTTP/HTTPS; não abrir o HTML por `file://`. O servidor de desenvolvimento escuta na rede local. Num Android na mesma rede, abrir `http://IP-DO-PC:5173` e permitir a porta na firewall se necessário. Para instalação PWA e service worker, usar HTTPS ou localhost.

## Tocar

- 49 teclas (quatro oitavas completas e o Dó final), deslocação horizontal e botões de navegação.
- Cada dedo é independente. O teclado usa Pointer Events, captura e cancelamento.
- Teclado físico: A W S E D F T G Y H U J K O L P ; (códigos físicos, disposição pode variar).
- Espaço mantém o pedal; o botão Sustain permite fixá-lo.
- Oitava altera a extensão e liberta as notas anteriores.
- Pânico limpa notas e sustain. Os efeitos podem conservar breves caudas.
- Perder foco, esconder a página ou suspender o contexto limpa as notas.
- O botão Ativar áudio permite retomar após interrupções.
- Guardar presets usa apenas localStorage deste navegador. Eliminar remove o preset selecionado.

## Implementação

- Até 16 vozes geridas, dois OscillatorNode independentes por voz, ondas sinusoidal, triangular, quadrada e dente de serra.
- Afinação de referência, oitava, detune, volumes e mistura.
- ADSR de amplitude e filtro por voz. Sustain contínuo até libertar; release independente.
- BiquadFilter passa-baixo, cutoff e ressonância.
- Chorus por delay modulado, delay com feedback, reverb por convolução estéreo, compressor ajustável e master.
- 20 presets: os oito originais, mais Piano elétrico, Cravo, Flauta, Clarinete, Oboé, Trompete, Trompa, Violino, Violoncelo, Guitarra dedilhada, Harpa e Marimba. São aproximações sintetizadas, sem samples acústicos.
- Osciloscópio com AnalyserNode e Canvas, limitado a aproximadamente 30 fps.
- Manifest e service worker apenas na build de produção, com cache dos recursos visitados para uso offline.
- Priorização de vozes em release, depois notas retidas pelo pedal, depois a voz ativa mais antiga.

O motor funciona sem React. A síntese usa os nós nativos e não precisa de AudioWorklet. As formas de onda nativas delegam a geração de osciladores ao navegador. Controlos de frequência, mistura, filtro e efeitos são suavizados. Attack/Decay alterados durante uma nota aplicam-se às notas seguintes; Sustain e parâmetros de som atualizam as notas ativas, Release é usado ao libertar.

## Organização

- `src/audio/`: parâmetros, osciladores, envelopes, Voice, VoiceManager, efeitos e Engine.
- `src/music/`: eventos e estado de interação, independente dos componentes.
- `src/presets/`: biblioteca, validação e armazenamento.
- `src/components/`: teclado, controlos e osciloscópio.
- `tests/audio.test.ts`: testes unitários.
- `tests/browser/`: interação e renderização real de áudio no Chromium.

Componentes de síntese e a interface de eventos podem ser estendidos no futuro. Wavetable, FM, matriz de modulação, arpejador e MIDI não foram implementados.

## Testar

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Playwright corre em dois perfis: desktop e Pixel 7 emulado. Os testes renderizam áudio com OfflineAudioContext e medem frequência, amplitude, release, polifonia e diferenças entre efeitos/presets. Os resultados de áudio são anexados ao relatório HTML em `playwright-report/`.

## Limites da validação

Emulação móvel não substitui um Android real. Latência de ponta a ponta, qualidade auditiva nas colunas/auscultadores, interrupções do sistema Android e multitoque físico exigem validação no dispositivo. O valor `AudioContext.baseLatency` é uma estimativa do navegador, não uma medição de latência física.

Presets são síntese subtrativa: Piano e Strings não usam samples acústicos. O ganho de entrada é conservador para reservar margem à polifonia; não há normalização automática por número de notas. A substituição de vozes usa uma cauda de 8 ms para suavizar a transição, com um máximo adicional de 16 caudas transitórias, libertadas automaticamente. Não há exportação de presets nem sincronização de dados.

A instalação PWA depende do navegador e de HTTPS; a estrutura está preparada, mas instalação real em Android deve ser validada. O cache só garante recursos carregados previamente. Não há backend nem contas.

## Referências técnicas

- [MDN: OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
- [MDN: cancelAndHoldAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime)
- [MDN: estados do contexto](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)

A saída inclui uma curva de proteção que mantém o sinal dentro da amplitude digital, linear em níveis normais e comprimida nos picos altos. Não substitui uma avaliação auditiva.

Para usar o Chrome já instalado nos testes, em PowerShell:
```powershell
$env:PLAYWRIGHT_CHANNEL = "chrome"
npm run test:e2e
```

## Validação da distribuição

Depois de `npm run build`, executar `npm run test:production` para verificar a build, ativação de áudio e recarregamento offline após cache. Usar `PLAYWRIGHT_CHANNEL=chrome` quando se pretende o Chrome instalado.

A limpeza das vozes tem uma salvaguarda temporal no AudioContext em tempo real para dispositivos que não entreguem o evento `ended`. A renderização offline usa exclusivamente os eventos e o relógio de áudio.

Se a ligação ao servidor local estiver bloqueada no ambiente de testes, `npm run test:isolated` executa a mesma suite Playwright com uma compilação de teste entregue por interceção de pedidos. Continua a usar o Chrome/Chromium real, Web Audio e eventos de toque; não valida o transporte HTTP nem o service worker. Estes são verificados separadamente por `npm run test:production`.



## Modo Tocar e gravação

- **Tocar** esconde os painéis de síntese e aumenta o teclado. Mantém presets, sustain, oitava, pânico e volume master. **Explorar** repõe os controlos de edição sem perder o som escolhido.
- **Ecrã inteiro** usa a função do navegador quando disponível. Se não for suportada, o modo Tocar continua a funcionar. Em telemóveis, a orientação horizontal dá mais espaço ao teclado.
- **Gravar** capta apenas o som do Ondas depois dos efeitos e do volume master, em WAV PCM de 16 bits e dois canais, à frequência do contexto de áudio. Não usa o microfone nem envia dados.
- **Parar gravação** cria um ficheiro que pode ser ouvido e descarregado. Deixa terminar as caudas dos efeitos antes de parar se as quiseres incluir.
- Cada gravação tem um limite de **2 minutos**. Mudar de separador ou suspender o áudio termina a gravação e disponibiliza o que já foi captado. A nova gravação substitui a anterior quando termina; descarrega os ficheiros que queres conservar antes de fechar a página.
- A captura usa um ramo ScriptProcessor com saída silenciada para manter compatibilidade com o HTML autónomo. O processamento de gravação depende da thread da interface; carga elevada pode causar falhas na captura. A síntese continua no grafo Web Audio. Não foi validada a qualidade da gravação em hardware móvel físico.


## Piano em ecrã inteiro

O botão **Piano em ecrã inteiro**, junto às setas do teclado, mostra apenas o piano e os seus controlos de navegação. **Sair do piano em ecrã inteiro** ou Escape repõe a interface. Se a API do navegador não estiver disponível, o piano ocupa toda a área da página e mantém um botão de saída. Os outros controlos ficam temporariamente fora da navegação por teclado. O modo Tocar continua disponível separadamente.

## Compor no piano roll

- **Compor** abre uma grelha em 4/4 com quatro compassos iniciais, passos de semicolcheia e notas de Dó1 a Si6. Ao aproximar o scroll horizontal do fim, o piano roll acrescenta automaticamente mais quatro compassos. O processo pode ser repetido continuamente, sem trocar de bloco nem interromper a edição. Cada pista usa o seu instrumento independente.
- O teclado vertical à esquerda distingue teclas brancas e pretas e permanece alinhado com as linhas durante o scroll. Pode ser tocado com rato ou vários dedos; usa o instrumento e volume da pista selecionada, ilumina discretamente a linha correspondente e não cria notas na grelha.
- Tocar numa célula cria uma nota. Selecionar uma nota permite alterar altura, início e duração nos controlos. Arrastar move; a extremidade direita altera a duração. No telemóvel, arrastar uma área vazia desloca a grelha.
- Inserir uma nota ou premir diretamente uma nota existente faz uma pré-escuta imediata no `pointerdown`, preservando a ativação de áudio em rato e toque. A pré-escuta usa o instrumento, altura, velocity, articulação e duração musical da pista, sem iniciar o transporte nem deslocar a régua. Ao arrastar uma nota verticalmente, cada nova altura é ouvida com limitação de frequência; a voz anterior é cancelada para evitar acumulação e notas presas. O comportamento usa o mesmo motor de sequência da reprodução. Durante a reprodução, todos os blocos de notas musicalmente ativos ficam iluminados; acordes e notas sobrepostas são acompanhados em simultâneo pelo relógio do motor de áudio.
- **Nova nota** prepara o próximo início; **Adicionar nota** insere a nota definida pelos controlos. Notas no mesmo passo formam acordes. Um duplo clique esquerdo numa nota duplica-a; a original não é alterada e a cópia fica selecionada.
- Arrastar sobre uma zona vazia desenha uma seleção retangular. Um duplo clique esquerdo dentro dessa área duplica todas as notas abrangidas, preservando alturas relativas, distâncias temporais e durações. Arrastar qualquer nota da cópia move o conjunto com snap de 1/16. Um clique direito simples não elimina nada; dois cliques direitos dentro da seleção eliminam apenas o conjunto selecionado. O menu de contexto nativo é suprimido exclusivamente na grelha de edição, permanecendo disponível no resto da aplicação. Delete/Backspace, os botões de edição e **Desfazer** atuam igualmente sobre a seleção ativa.
- Andamento entre 40 e 240 BPM; o controlo **Loop — Repetir em ciclo** pode ser alterado antes ou durante a reprodução. **Pausar** conserva a posição musical, **Retomar** continua a partir dela e o controlo de posição permite procurar outro ponto antes ou durante a reprodução. O andamento pode mudar durante a reprodução sem alterar a posição em tempos nem a afinação. Sem Loop, o transporte para no fim real do último evento audível — incluindo a duração completa da última nota — e regressa ao início sem reiniciar. As caudas já agendadas podem terminar naturalmente. Com Loop ativo, o bloco selecionado ou a sequência completa reinicia no respetivo limite, usando o agendamento antecipado do relógio de áudio. Alterar Loop durante Play cancela eventos antecipados incompatíveis e conserva a posição musical. A edição fica bloqueada durante a reprodução ou pausa. **Parar** cancela as vozes da sequência e regressa ao início; **Pânico** termina todas as notas e a reprodução. Mudar de modo, perder foco ou esconder o separador também interrompe a sequência e limpa os destaques.
- A composição é guardada automaticamente neste navegador quando o armazenamento está disponível. **Guardar ficheiro** e **Abrir composição** permitem transportar a composição em JSON. Importações inválidas são rejeitadas. Há um limite de segurança de 4096 notas por pista e 30 alterações para desfazer; a polifonia de 16 vozes é partilhada com o teclado.
- **Limpar pista** remove apenas as notas da pista atual. **Limpar todas as notas** remove as notas de todas as pistas e blocos, preservando a bateria e as restantes definições do projeto.
- **Enviar ao arranjador** renderiza diretamente a sequência completa e cria uma pista áudio no Arranjador multipistas, sem ser necessário reproduzir e gravar em tempo real. O clip começa no início, inclui instrumentos, volumes, efeitos e bateria, e fica guardado no projeto multipistas; o master permanece controlável no mixer. Os novos clips guardam também uma cópia estruturada do projeto musical para que as notas e acordes possam ser recuperados ao regressar ao piano roll. Aplica-se o limite atual de dois minutos por pista do arranjador.
- Para gravar a composição, premir **Gravar**, iniciar a reprodução, parar a composição e depois parar a gravação. Os efeitos do preset e o volume master são incluídos no WAV.
- O transporte acompanha o relógio de áudio na thread da interface e recupera notas sustentadas após atrasos. O painel integrado sob a grelha permite editar velocity individual (1–127), incluindo acordes e seleções múltiplas; o valor é guardado no projeto e aplicado à reprodução e ao WAV. A exportação MIDI ainda não está disponível.
- As notas de piano podem guardar **Normal**, **Suave** ou **Acentuada** através de um seletor contextual sob o editor; a escolha atua sobre toda a seleção e participa em Desfazer/Refazer. A velocity continua independente no painel inferior. Notas antigas, sem articulação, usam o caminho sonoro legado sem alterações; articulações explícitas ativam curvas determinísticas para ganho, ataque, brilho e release, partilhadas pela execução ao vivo, sequência e exportação WAV. Estas articulações são aproximações por processamento e não camadas adicionais de amostras.
- Permanecem registadas para uma etapa posterior do piano: pedal de sustain sequenciado, ressonância simpática opcional e medição objetiva da distorção/redução de ganho em acordes densos.

## Bateria e percussão

Em **Compor**, usar **Bateria ↓** para chegar à grelha. São oito pistas sintetizadas localmente: bombo, caixa, chimbal fechado, chimbal aberto, palmas, tom grave, conga e shaker. Não requer ficheiros de áudio externos.

Cada impacto guarda velocity MIDI contínua entre 1 e 127. Clicar num passo percorre Ghost, Normal, Acento e desligado; ao selecionar o impacto, um editor permite escolher qualquer valor exato. **Ghost note** define uma referência suave de 32 e **Acento** usa 127, mas ambos continuam editáveis.

**Swing** atrasa de forma previsível as subdivisões fracas sem mudar o andamento global. **Humanização temporal** e **Humanização de velocity** são controlos separados. As variações usam uma seed guardada no projeto: a mesma composição produz os mesmos desvios na reprodução e na exportação WAV. Projetos antigos com intensidades normalizadas são migrados para MIDI — por exemplo, `0.65` passa para `83/127` — preservando aproximadamente o ganho original.

- Compassos de 16 passos, sincronizados com a duração extensível do bloco e o ciclo do piano roll. Selecionar um compasso permite editá-lo; durante a reprodução a grelha acompanha o compasso atual.
- Cada toque num passo alterna entre desligado, normal e acentuado. **M** silencia uma pista; cada pista tem volume próprio. A edição fica bloqueada durante a reprodução.
- Ritmos de exemplo: Rock, House e Percussão latina. **Repetir este compasso em todos** copia o compasso selecionado para toda a duração atual do bloco. **Limpar bateria** preserva as notas do piano; **Limpar composição** limpa ambos. Desfazer também inclui as alterações da bateria.
- **Reproduzir bateria + piano** e **Reproduzir composição** controlam o mesmo transporte. Também é possível tocar apenas bateria, sem notas no piano. Parar ou carregar em Pânico cancela os impactos ativos; o chimbal fechado corta a cauda do aberto.
- O ficheiro da composição e a gravação automática local incluem os passos, volumes e pistas silenciadas. Os ficheiros antigos sem bateria continuam a abrir com uma grelha vazia.
- A gravação WAV inclui bateria e piano. A percussão passa pelo compressor, volume master e proteção de saída comuns, sem passar pelo chorus/delay/reverb do preset melódico.
- Swing e humanização são calculados pela mesma função pura no transporte e na exportação. A humanização não usa `Math.random`, portanto abrir ou exportar novamente um projeto não cria outra execução.
- Mantêm-se 16 vozes melódicas; a bateria permite até 32 caudas simultâneas, com limpeza automática. A sincronização usa o transporte de 20 ms já descrito; não garante precisão à amostra em caso de bloqueio da interface.

## Gravação multipistas

O **Arranjador multipistas**, abaixo do gravador estéreo, aceita o número de pistas de áudio independentes que o dispositivo conseguir manter, com até dois minutos por pista. A régua temporal mostra formas de onda, permite posicionar o cursor e mover clips por arrasto com grelha opcional de ¼ de segundo.

O arranjador e o piano roll utilizam o mesmo núcleo de relógio musical baseado em `AudioContext.currentTime`. A reprodução das pistas pode ser pausada e retomada sem regressar ao início; durante a pausa, a régua também pode ser reposicionada. O conteúdo renderizado continua em áudio, mas a janela e a posição de cada clip são musicais e guardadas em ticks; clips provenientes do piano roll conservam também o projeto estruturado editável.

O arranjador guarda agora a posição, duração e offset interno dos clips em ticks musicais. Os clips podem ser movidos com snap configurável, duplicados, divididos, encurtados sem destruir o conteúdo oculto e novamente expandidos. Clips da mesma pista podem sobrepor-se e são reproduzidos simultaneamente. As operações dispõem de Desfazer/Refazer, e um clip musical pode ser aberto no piano roll e atualizado mantendo a sua posição, recorte e velocity.

Os clips criados por **Enviar ao arranjador** conservam uma referência à pista e ao bloco que estavam abertos no momento do envio, juntamente com uma cópia validada do projeto musical desse momento. Ao começar a arrastar um desses clips, surge uma cópia flutuante junto ao cursor que pode sair visualmente do arranjador; o piano roll fica realçado quando é um destino válido. Largar aí volta a abrir o bloco de origem para edição. Se o bloco atual já não existir ou tiver ficado sem notas, o Ondas recupera-o a partir dos dados musicais guardados no clip; se a pista referenciada estiver vazia, seleciona automaticamente a primeira pista do bloco que contém notas ou acordes. Largar noutro ponto não abre o editor, e o arrasto horizontal dentro da faixa continua a posicionar normalmente o clip.

Os clips criados por versões anteriores conservam o áudio, mas podem não conter a cópia musical necessária para reconstruir notas. Nesse caso, o Ondas apresenta uma mensagem e mantém intactos o áudio e o projeto; para obter a recuperação completa, é necessário voltar a enviar a composição ao arranjador nesta versão.

1. Escolher o instrumento e premir **Gravar**. Tocar no piano ou iniciar a composição/bateria. Premir **Parar** quando terminar.
2. Escolher outro instrumento e repetir. As pistas anteriores tocam desde o início enquanto a nova tomada é captada. O áudio dessas pistas não é regravado na nova tomada.
3. Ajustar nome, volume, **Mute**, **Solo** e **Início (s)**. O início pode ser deslocado até 120 segundos; é necessário parar para editar esse valor. Volumes, mute e solo podem mudar durante a reprodução.
4. Posicionar o cursor na régua e usar **Reproduzir** para ouvir a partir desse ponto. **Preparar mistura WAV** cria uma descarga estéreo com os controlos das pistas, volume master e proteção de saída aplicados. **WAV** descarrega a tomada original, antes do volume master e dos controlos da pista.

**Importar áudio** aceita ficheiros reconhecidos pelo navegador, até 25 MB e dois minutos. O projeto multipistas é guardado automaticamente em IndexedDB neste navegador: áudio, nomes, posições, volume, panorama, Mute/Solo, zoom e grelha regressam na sessão seguinte. A composição JSON do piano roll continua separada. A quantidade prática de pistas depende da memória e quota de armazenamento disponíveis no dispositivo; exportar os WAV continua recomendado como cópia de segurança.

A gravação inclui os efeitos/compressor do instrumento; a reprodução das pistas não volta a aplicar esses efeitos. A captação usa ScriptProcessor e o agendamento das bases usa o relógio Web Audio. A latência de entrada/captação não tem compensação automática; o campo Início permite alinhar tomadas manualmente. Não se garante alinhamento à amostra, nem captação sem falhas se a interface estiver sobrecarregada. Pânico, mudança de modo, perda de foco e suspensão do áudio interrompem o transporte e conservam a tomada captada quando possível. Não há captação de microfone nesta versão.

## Mixer e exportação

O estúdio inclui panorama estéreo por pista (E/Centro/D), medidores de pico durante a reprodução, master partilhado com o sintetizador e **Repor mixer**. Os ajustes de volume, panorama, Mute e Solo são aplicados em tempo real e na mistura exportada.

No painel **Exportação WAV**, escolher a mistura completa ou uma pista individual processada, definir o nome e selecionar 44,1 ou 48 kHz (PCM de 16 bits, estéreo). A opção de normalização coloca o pico final a −1 dBFS e mantém o silêncio intacto. A exportação individual respeita volume, panorama e início, ignorando Mute/Solo. O link **WAV da pista** continua a fornecer a tomada original. Alterar os ajustes invalida a mistura preparada; voltar a preparar antes de descarregar.

## Composição multipistas e blocos

O modo **Compor** suporta agora várias pistas de notas por bloco, cada uma com nome, instrumento, volume, mute e solo. Os blocos começam com quatro compassos, crescem pelo scroll horizontal, podem ser nomeados, duplicados de forma independente e ordenados numa sequência. O transporte agenda antecipadamente notas e bateria no relógio do `AudioContext`; parar a sequência preserva notas tocadas manualmente.

As ajudas opcionais incluem tonalidade, escala maior ou menor natural, destaque das notas da escala, restrição apenas para notas novas ou movidas e tríades diatónicas com pré-escuta. Notas existentes nunca são alteradas automaticamente.

### Inserção rápida de acordes

O painel **Inserir acorde** reúne todos os parâmetros da operação. **Grau / acorde** apresenta o grau diatónico e o nome calculado na tonalidade e escala atuais, por exemplo `I — Lá menor`. **Compasso** e **Tempo** definem o início dentro do bloco selecionado; o tempo aceita também as subdivisões `¼`, `½` e `¾`, que usam diretamente os passos de semicolcheia do piano roll.

**Duração** oferece ½, 1, 2, 4, 8 ou 16 tempos. Só ficam disponíveis as durações que cabem até ao fim do bloco atual, mas um acorde pode atravessar livremente os limites entre compassos. **Pré-escutar acorde** toca a tríade selecionada sem criar notas. **Inserir acorde** cria simultaneamente as três notas na pista e bloco atuais e avança o início para o fim do acorde inserido. O início pode ser alterado manualmente a qualquer momento, permitindo tanto construir progressões rapidamente como inserir acordes em posições isoladas.

Estes controlos usam o mesmo modelo temporal da grelha: quatro passos por tempo e 16 passos por compasso. Cada bloco começa com 64 passos e guarda a sua própria duração, que cresce em grupos de quatro compassos através do scroll infinito. Notas, acordes e bateria são alargados no mesmo modelo; reprodução, persistência, migração de projetos antigos e exportação WAV respeitam a duração real de cada bloco. Os projetos v2 anteriores, sem duração explícita, continuam a abrir com os quatro compassos originais.

O projeto v2 guarda pistas, instrumentos, notas, bateria, blocos, ordem e andamento. Pode ser exportado/importado em JSON e migra composições v1. **Exportar composição WAV** renderiza offline a sequência completa em estéreo com instrumentos, volumes e efeitos, com limite de 12 minutos para proteger a memória. Instrumentos por amostras requerem Internet na primeira utilização e usam uma cache própria preservada entre versões da aplicação.


## Correções de exportação e registo grave

A composição e o WAV usam agora o mesmo encaminhamento dos instrumentos, volumes por pista e um único bus de efeitos/master. A exportação recebe uma cópia dos efeitos e master atuais no momento em que é iniciada. As notas de composição não são alteradas pelo sustain nem pelas alterações de timbre do teclado manual.

Na renderização offline, eventos futuros não são contabilizados como vozes simultâneas: os limites de recursos do modo ao vivo não eliminam notas ou impactos ainda por renderizar. O WAV conserva todas as notas agendadas e acrescenta uma cauda calculada para release, delay e reverb. A polifonia ao vivo continua limitada; arranjos que a excedam podem diferir da exportação, que preserva os eventos completos. O projeto continua limitado a 12 minutos por exportação e a memória necessária cresce com a duração e densidade do arranjo.

O piano roll permite Dó1–Si6, incluindo Mi1 e outras notas graves de baixo. Guardar/abrir e migrar projetos anteriores mantém as notas existentes.

## Referência de regressão da Fase 4

`phase4ReferenceSong()` cria uma composição determinística com piano, guitarra acústica, guitarra elétrica, baixo, sintetizador e bateria. Inclui velocity variada, todas as articulações expressivas, acordes e notas sobrepostas, gestos persistentes ascendentes e descendentes, ghost notes, acentos, swing e humanização com seed fixa. A referência tem dois blocos e é validada tanto pelo transporte como pela exportação WAV.

Os testes automáticos cobrem pausa, retoma, seek, alteração de BPM em reprodução, ciclos, gestos nos limites, clips sobrepostos no arranjador, migração de projetos antigos e limpeza das vozes. O BPM guardado continua global; alterações durante a reprodução são operações do transporte e não automação persistida.

A validação auditiva deve comparar as articulações com a mesma nota, duração e velocity antes de avaliar a mistura completa. O perfil Android do Playwright verifica toque e reprodução em viewport móvel, mas não substitui um teste num dispositivo físico. Qualidade sonora percebida, latência total toque–som e estabilidade prolongada em hardware Android permanecem validações manuais.

### Estado de validação

A implementação das etapas A–J da Fase 4 está concluída. A regressão automática contém 126 testes unitários, build TypeScript/Vite e cenários Playwright no Chromium para transporte, edição expressiva, toque em perfil móvel, exportação WAV e arranjador. A auditoria de polifonia renderiza 8, 16 e 32 vozes, verifica valores finitos, ausência de clipping e limpeza de vozes, e guarda as medições em `artifacts/stage-i-*.json`.

No ambiente de referência, o Chromium reportou `baseLatency` de 10 ms; este valor não representa a latência total entre gesto e som. O maior pico medido nos acordes de auditoria foi aproximadamente −10,8 dBFS. Ativar o `DynamicsCompressorNode` elevou pico e RMS em cerca de 5 dB nos sinais conservadores usados, apesar de reportar perto de 0,8 dB de redução. O compressor não é tratado como limitador: a proteção final continua a ser a curva de segurança da saída. Ganho de compensação, distorção percebida e comportamento da cadeia completa serão reavaliados com os efeitos da Fase 5.

Continuam pendentes apenas validações que exigem avaliação humana ou hardware: comparação auditiva das articulações, latência total medida, uso prolongado de memória e execução num dispositivo Android físico. O perfil Android emulado confirma compatibilidade funcional, mas não autoriza declarar desempenho validado em todos os dispositivos reais.
