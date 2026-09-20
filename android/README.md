# HA Panel — projekt pro Android Studio

Aplikace pro tablet na zdi: panel pro **Home Assistant** připojený přes
dlouhodobý přístupový token.

```
File → Open → vyber tuhle složku (android)
```

Projekt nemá jedinou knihovnu (žádné AndroidX), minSdk 24, Java 17.
Po sestavení dej **Run** — při prvním spuštění se otevře nastavení, kam
patří adresa Home Assistanta a token.

**Celý popis, nastavení i příklady automatizací:**
[../docs/ha-panel.md](../docs/ha-panel.md)

Stránka panelu je v `app/src/main/assets/` a dá se vyzkoušet i bez
tabletu — stačí ji naservírovat jakýmkoli statickým serverem a otevřít
v prohlížeči (tlačítko *Ukázat, jak to vypadá* ukáže panel bez Home
Assistanta).

Testy stránky běží v Node bez prohlížeče:

```
node ../tests/hapanel-util.cjs
node ../tests/hapanel-layout.cjs
node ../tests/hapanel-ws.cjs
```
