# Relatório de validação — Ondas

Data: 18 de outubro de 2026.

## Ambiente e método

Windows, Node.js 24.15.0, Chrome instalado, TypeScript/Vite, Vitest e Playwright. Os perfis de interface são desktop e Pixel 7 emulado. Emulação não equivale a teste num Android físico.

O ambiente restrito bloqueou o esbuild com EACCES. Compilação e testes foram executados com a permissão necessária. A navegação de desenvolvimento teve timeouts intermitentes; foi preparada uma alternativa que compila o mesmo código e entrega HTML/JS por interceção de pedidos Playwright. Essa alternativa mantém React, Web Audio, localStorage, Pointer Events e o navegador reais, sem simular o motor. A distribuição HTTP e o service worker são testados separadamente.

## Resultados confirmados

- Build inicial: passou, 41 módulos. A build com modo Tocar e gravação passou com 43 módulos, JavaScript de 255,77 kB (80,25 kB gzip).
- Vitest: 14 testes passaram.
- Produção: o cenário de ativação de áudio, preenchimento de cache e recarregamento offline passou.
- Diagnóstico independente do Chrome: OfflineAudioContext produziu 4 800 amostras de uma onda sinusoidal.
- Suite completa de navegador: 16 testes passaram (8 desktop e 8 Pixel 7 emulado), usando a entrega isolada em Chrome. O cenário de produção HTTP/offline também terminou com estado passed.

## Cobertura unitária

Frequências; 16 vozes/32 osciladores; acordes; libertação independente; sustain; prioridade e limite de vozes; repetição durante release; ADSR; alteração de parâmetros; desconexão de recursos; limpeza quando falta ended; oito presets distintos e válidos; armazenamento e rejeição de dados inválidos; cancelamento durante inicialização assíncrona; identificadores de dedos independentes.

## Correções encontradas durante a validação

- Repetir uma tecla durante release agora cria uma nova voz.
- Substituição de vozes inclui uma breve cauda de 8 ms.
- Pedal visual e motor voltam a ficar sincronizados após suspensão.
- Não há dependência de fontes externas para carregar a aplicação.
- O navegador de testes tem encerramento normal com salvaguarda de 5 segundos, limitada ao processo criado pela própria suite. Isto não altera os testes nem o código da aplicação.
- Uma salvaguarda de tempo liberta recursos se o dispositivo não entregar ended; não é usada no OfflineAudioContext.
- A página de teste isolada declara UTF-8; a página de produção já o declarava.

## O que exige validação física

Não foram validados num Android real: multitoque físico, latência de ponta a ponta, saída nas colunas/auscultadores, interrupções por chamadas ou mudanças de aplicação, consumo de bateria e instalação PWA. A avaliação auditiva humana dos presets e dos efeitos também não foi realizada. Medições digitais de sinal não substituem essa avaliação.

Os oito sons temáticos são síntese, não amostras acústicas. Não foram implementadas as funcionalidades futuras fora do âmbito: wavetable, FM, arpejador e MIDI.

## Medições digitais confirmadas no desktop

| Medição | Resultado |
| --- | --- |
| Lá4 por cruzamentos de zero | 440 Hz |
| RMS inicial do attack | 0,003267 |
| RMS no sustain | 0,011315 |
| RMS da cauda após release | 0 |
| Recursos de voz restantes após renderização | 0 |
| RMS do acorde | 0,011442 |
| Pico com 16 vozes e efeitos predefinidos | 0,109223 (limite digital: 1) |

Os oito presets produziram sinal e RMS distintos. Chorus, delay, reverb e compressor produziram diferenças mensuráveis face ao respetivo bypass. Os valores completos ficam em `artifacts/audio-desktop.json`. Estes resultados verificam geração digital e comportamento dos parâmetros; não são uma avaliação auditiva humana.


## Tablet

Passaram os três cenários adicionais em Chrome com viewport 820 × 1180 e toque emulado: layout sem overflow, libertação independente/cancelamento e captura de três contactos. Não foi utilizado um tablet físico, Safari ou Firefox. Foi também corrigido o espaçamento do título quando a quebra de linha é ocultada no ecrã pequeno.



## Atualização: modo Tocar e gravação WAV

- Build TypeScript/Vite passou; HTML autónomo regenerado.
- 17 testes unitários passaram: 14 do motor e 3 do gravador (cabeçalho PCM, amostras estéreo, saturação, limite de 120 segundos e desconexão do ramo de captura).
- O novo cenário de navegador passou em desktop, Pixel 7 emulado e tablet emulado. Verifica teclas maiores, ausência de overflow, WAV estéreo descodificável com sinal não nulo, descarga, leitor de áudio, segunda gravação, interrupção por visibilidade e regresso ao modo Explorar. O teste de tablet inclui teclado físico imediatamente depois de Gravar.
- Imagens do modo Tocar foram guardadas em artifacts/, incluindo orientação horizontal. Os 16 cenários anteriores e o teste HTTP/offline pertencem à validação inicial; não foram todos repetidos nesta atualização.
- O ambiente apresentou atrasos: a espera de captura do teste foi alargada para 30 segundos e os testes unitários foram repetidos com timeout de 30 segundos, mantendo as mesmas verificações. A execução final dos 17 testes demorou 5,51 segundos.
- A captura usa ScriptProcessor no ramo de gravação para funcionar também no HTML local. Mantém-se pendente a avaliação auditiva humana, aparelhos físicos, Safari/Firefox e comportamento do ecrã inteiro nesses aparelhos.
- Verificação final por file://: 49 teclas, modo Tocar, ativação de áudio, gravação WAV estéreo com sinal e notas pelo teclado passaram sem erros de página.

## Atualização: piano em ecrã inteiro e 20 presets

- Botão dedicado na área do piano, saída por botão/Escape, teclado ampliado e alternativa que ocupa o viewport quando a API Fullscreen não está disponível. Na alternativa, os restantes controlos ficam inert até à saída.
- Biblioteca ampliada de 8 para 20 presets, com 12 novos instrumentos sintetizados. Não foram acrescentadas amostras acústicas.
- Build passou (43 módulos; JS 260,37 kB / 81,25 kB gzip). HTML autónomo regenerado.
- Os 17 testes unitários passaram, incluindo validação e distinção dos 20 patches.
- Novo teste passou em Chrome desktop e Pixel 7 emulado: entrada nativa em ecrã inteiro, notas pelo teclado, saída, alternativa com API rejeitada, Escape, reposição dos controlos e renderização dos 20 instrumentos com sinal não nulo e RMS distintos.
- Capturas em artifacts/piano-inteiro-desktop.png e artifacts/piano-inteiro-android-emulado.png. A qualidade acústica dos timbres e o comportamento em dispositivos físicos continuam sem avaliação humana.
- O HTML final aberto por file:// também passou: 20 opções, entrada/saída do piano ampliado, modo Tocar e gravação WAV com sinal, sem erros de página.

## Atualização: piano roll de composição

- Novo modo Compor: quatro compassos em 4/4, 64 passos de semicolcheia, quatro oitavas (Dó3–Si6), até 256 notas, edição de início/altura/duração, arrastar notas, alongar pela extremidade, apagar e desfazer.
- Transporte com andamento de 40–240 BPM, repetição opcional e relógio do AudioContext. Usa o preset e os efeitos atuais. Para com Pânico, mudança de modo, perda de foco ou suspensão; parar apenas a composição preserva as notas manuais.
- Guardar automaticamente no navegador, exportar/importar composição JSON e rejeitar ficheiros inválidos. A gravação WAV pode captar a sequência.
- Build passou: 45 módulos, JavaScript 271,69 kB (84,59 kB gzip). HTML autónomo regenerado.
- 24 testes unitários passaram (14 motor, 3 WAV, 7 composição/transporte). Cobrem validação, fronteiras, acordes, ciclos, armazenamento, cancelamento de arranque e paragem.
- O novo cenário passou em Chrome desktop e Pixel 7 emulado: criar notas, alterar duração, arrastar, desfazer, descarregar/reabrir ficheiro, persistência após reload, rejeitar ficheiro inválido, reproduzir acorde, preservar voz manual ao parar e gravar WAV com sinal. As primeiras falhas eram de coordenadas de teste sob a régua fixa e do uso de download.path numa ligação remota; foram corrigidas sem alterar as verificações.
- Capturas revistas: artifacts/compor-desktop.png e artifacts/compor-android-emulado.png. A emulação móvel não substitui teste num aparelho físico.
- Limitação: o transporte verifica o relógio de áudio a cada 20 ms na thread da interface. Não garante precisão à amostra e pode atrasar/omitir notas se essa thread ficar bloqueada. A polifonia total continua limitada a 16 vozes. Ainda não há múltiplas pistas, velocidades por nota ou exportação MIDI.

- Verificação final por file:// passou sem erros de página: piano em ecrã inteiro, 20 presets, teclado, gravação WAV e reprodução/gravação do piano roll com sinal não nulo.

## Atualização: sequenciador de bateria e percussão

- Oito pistas sintetizadas localmente: bombo, caixa, chimbal fechado/aberto, palmas, tom grave, conga e shaker. Quatro compassos de 16 passos, três estados por passo (desligado, normal, acentuado), volume e mute por pista.
- Ritmos Rock, House e Percussão latina, repetição de um compasso nos quatro, limpeza e desfazer. O transporte é o mesmo do piano roll; pode tocar apenas bateria ou bateria com piano. Pânico, interrupções e paragem cancelam os sons ativos.
- As composições guardam passos, acentos, volumes e mute. A versão 1 aceita ficheiros antigos sem o campo drums, abrindo com bateria vazia.
- A bateria entra antes do compressor e master comuns, com proteção de saída, sem os efeitos de chorus/delay/reverb da pista melódica. Limite de 32 caudas de percussão, além das 16 vozes melódicas. O chimbal fechado corta o aberto.
- Build final passou: 48 módulos; JS 280,18 kB (87,40 kB gzip). HTML autónomo regenerado.
- 30 testes unitários passaram: 14 motor, 3 gravação, 7 composição e 6 bateria. As verificações de bateria incluem amostras finitas/distintas, padrões e limites, compatibilidade, mute, volume, corte do chimbal, limpeza, bateria sem piano e impactos únicos sincronizados por passo.
- O novo cenário passou em Chrome desktop e Pixel 7 emulado: estados dos passos, compassos/cópia, mute/volume, download/persistência, bateria sem notas melódicas, WAV com sinal, reprodução conjunta, Pânico e importação de composição antiga. Renderizações OfflineAudioContext confirmaram oito sinais diferentes, não nulos e abaixo do limite digital.
- Capturas revistas em artifacts/bateria-desktop.png e artifacts/bateria-android-emulado.png. Continua pendente a audição humana e teste em dispositivos físicos. Mantém-se a limitação do transporte a verificações de 20 ms na thread da interface.
- Verificação final do HTML por file:// passou sem erros: teclado e piano ampliado, piano roll, toque real simulado num passo de bateria e WAV com sinal de bateria sem notas melódicas.

## Estúdio multipistas — 18/10/2026

- Implementados quatro takes independentes (120 s cada), reprodução das bases durante a captação, importação de áudio, nomes/volumes/mute/solo, início ajustável, WAV individual e mistura estéreo.
- Build TypeScript/Vite concluído; HTML autónomo regenerado.
- 33 testes unitários passaram, incluindo a seleção das pistas audíveis, duração com deslocamentos e conversão mono/estéreo.
- O cenário de desktop verificou base audível com overdub silencioso sem recaptura, gravação do sintetizador com sinal, mistura com deslocamento, solo, importação e paragem por Pânico, sem erros de página ou overflow.
- A primeira execução excedeu os 5 s de espera da exportação. O renderizador foi simplificado para somar as pistas e aplicar master/limitação, sem criar efeitos de síntese desnecessários. A execução seguinte passou as asserções de desktop.
- O encerramento do Chrome na fixture excedeu 120 s após as asserções; esta falha de infraestrutura é distinta dos resultados funcionais. Não foi repetida a suite completa anterior.
- A primeira verificação do HTML, em paralelo com outro navegador de teste, não recebeu amostras a tempo no gravador estéreo. Não é registada como validação bem-sucedida.
- Limites: pistas apenas em memória, sem projeto multipistas persistente; sem microfone ou compensação automática da latência. Testes em dispositivos emulados não substituem testes em hardware físico.

## Atualização: composição multipistas e transporte — 21/10/2026

- Corrigida a duração e paragem das notas por amostras, incluindo cancelamento exclusivo da sequência, limite de 16 vozes, libertação suave e limpeza de recursos. A troca rápida de instrumentos ignora carregamentos obsoletos e a ativação do service worker preserva a cache de instrumentos.
- O piano roll passou a usar agendamento antecipado no relógio de áudio para inícios, finais e bateria. Foram acrescentadas pistas editáveis por instrumento, volume, mute/solo, blocos independentes nomeáveis/duplicáveis/ordenáveis e reprodução do bloco ou da sequência completa.
- Acrescentadas tonalidade, escala maior/menor natural, destaque da escala, restrição opcional de notas novas e inserção/pré-escuta de acordes diatónicos.
- Persistência v2, ficheiro JSON versionado, migração v1, validação que preserva o projeto aberto e exportação offline da composição completa para WAV estéreo.
- Executados agora: `npm test -- --run` — **56 testes em 10 ficheiros, todos passaram**; `npm run build` — TypeScript e Vite passaram, 63 módulos, JS 327,95 kB (102,06 kB gzip).
- Playwright em Chrome desktop confirmou WAV RIFF estéreo com sinal PCM não silencioso. A validação móvel emulada desta atualização ficou bloqueada por timeout na ligação/arranque do Chrome antes de carregar a página. Não foi realizado teste num Android físico nem avaliação auditiva humana.
- Os resultados históricos acima não são apresentados como repetidos nesta atualização.


## Correção: exportação completa e notas graves — 21/10/2026

- A renderização offline deixou de eliminar eventos futuros ao atingir 16 notas/caudas ou 32 impactos. O agendamento preserva todas as notas, percorre os blocos por ordem e aplica o corte do chimbal no tempo musical, sem desligar antecipadamente o áudio anterior.
- Novo `SequenceAudio` partilhado pela reprodução e exportação para instrumentos, volumes e duração. Um único `Effects` aplica os efeitos e master atuais à soma das pistas e bateria. A exportação copia esses parâmetros no arranque e acrescenta uma cauda calculada para release, ecos e reverb.
- Vozes sintetizadas da composição separadas das vozes manuais; sustain e alterações de timbre no teclado não reescrevem notas das pistas. Pânico continua a limpar ambas.
- Piano roll alargado para Dó1–Si6, com grelha e seletor dinâmicos. Notas graves sobrevivem a guardar/abrir; projetos v1 continuam a migrar.
- Executados nesta correção: `npm test` — **63 testes em 11 ficheiros, todos passaram**. Os sete novos cenários cobrem notas/impactos completos antes de renderizar, encaminhamento e volumes partilhados, master, limpeza em falha de carregamento, chimbal, independência manual/composição, ordem/mute/solo e persistência grave/migração.
- `npm run build` passou: 64 módulos; JS 328,37 kB (102,20 kB gzip). HTML autónomo regenerado com a mesma build.
- Verificação adicional de PCM em Node, com `web-audio-engine` instalado apenas num diretório temporário de teste (sem nova dependência do projeto): WAVs com 24 notas por amostras, 48 sintetizadas e 40 impactos produziram sinal no início, meio e fim. Master 0 produziu pico PCM16 igual a 0. Usou-se uma amostra sinusoidal de teste em vez de descarregar instrumentos. Adaptou-se apenas o setter de limpeza `buffer=null`, não suportado por esse motor antigo; este ensaio não equivale ao Web Audio nativo do Chrome.
- Não foi repetida a suite de navegador nesta correção; não houve teste em Android físico nem avaliação auditiva humana. Os resultados de Chrome da atualização anterior são históricos.
- Limite explícito: a exportação preserva todos os eventos; a reprodução ao vivo mantém limites de polifonia. Não se promete igualdade amostra a amostra em arranjos que excedam esses limites, nem entre fases de efeitos iniciados em instantes distintos.
