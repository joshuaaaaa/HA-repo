/*! HA Panel Card 1.0.0 - https://github.com/joshuaaaaa/HA-repo
    Soubor je SESTAVENÝ. Needituj ho - uprav src/card/card.js nebo
    android/app/src/main/assets/js/*.js a spusť: node tools/build-card.mjs */

(function () {

'use strict';

var CARD_VERSION = "1.0.0";

var CARD_CSS = "/* ------------------------------------------------------------------\n   Panel pro Home Assistant - jeden vizualni system pro vsechny stavy.\n\n   Navrhovy prostor je pevny (2400 x 1080 na sirku, 1400 x 2000 na vysku)\n   a cela plocha se jen zvetsi na displej tabletu - proto jsou vsechny\n   rozmery v pixelech a na kazdem zarizeni vypadaji stejne.\n\n   Dve pravidla, ktera drzi cely vzhled pohromade:\n     1) Stav nese barvu I SLOVO - nikdy jen barvu.\n     2) Cisla jsou velka natolik, aby se dala precist pres pokoj.\n   ------------------------------------------------------------------ */\n:host{\n --a1:#36d8ff;--a2:#ff8b3e;--a3:#8af5bc;--a4:#c48aff;--a5:#ff5369;\n --good:#8af5bc;--warning:#ffd064;--serious:#ff9863;--critical:#ff5369;\n --void:#000;--pane:#080e14;--rail:#263541;--rail2:#455c6e;\n --ink:#f2f8ff;--ink2:#c0cfda;--muted:#90a5b6;\n --display:'Bahnschrift Condensed','Bahnschrift','Roboto Condensed','Arial Narrow',sans-serif;\n --mono:'Cascadia Mono','Consolas',ui-monospace,monospace;\n}\n*{box-sizing:border-box;margin:0;padding:0}\n\nbody{background:var(--void);color:var(--ink);font-family:var(--display);-webkit-font-smoothing:antialiased;\n -webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}\n.bg,.scan{position:absolute;inset:0;pointer-events:none}\n.bg{z-index:0;background:radial-gradient(ellipse at 15% 35%,#06364b80,transparent 48%),radial-gradient(ellipse at 90% 40%,#48200c60,transparent 48%),#020507}\n.scan{z-index:0;opacity:.18;background-image:linear-gradient(#47728c35 1px,transparent 1px),linear-gradient(90deg,#47728c35 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(transparent,#000,transparent)}\n\n/* ---------- plocha ---------- */\n#stage{position:absolute;top:0;left:0;width:2400px;height:1080px;transform-origin:top left;z-index:2;\n display:grid;grid-template-rows:84px 1fr auto;gap:16px;padding:24px 32px}\n.panel-root.mode-ambient .pages,.panel-root.mode-ambient .pdots{display:none}\n.panel-root.is-portrait #stage{width:1400px;height:2000px;grid-template-rows:84px 1fr auto}\n\nheader{display:flex;align-items:center;gap:32px;position:relative;border-bottom:1px solid #324652;padding-bottom:10px}\nheader::after{content:'';position:absolute;bottom:-1px;left:0;width:220px;height:3px;background:var(--a1);box-shadow:0 0 18px #36d8ff60}\n.plate{display:flex;align-items:center;gap:18px;min-width:0}\n.plate .bar{width:48px;height:48px;flex:none;background:linear-gradient(135deg,var(--a1) 0 30%,transparent 30% 42%,var(--a1) 42% 61%,transparent 61% 73%,var(--a2) 73%);clip-path:polygon(18% 0,100% 0,82% 100%,0 100%)}\n.wordmark{font-size:43px;line-height:1;font-weight:800;letter-spacing:6px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.subline{font:16px var(--mono);letter-spacing:3px;color:var(--muted);margin-top:6px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.plate.empty{display:none}\n.badge{display:flex;align-items:center;gap:10px;border:1px solid #3b6358;background:#0c211d;padding:9px 14px;flex:none}\n.badge .led{width:8px;height:8px;background:var(--good);box-shadow:0 0 12px #8af5bc80}\n.badge span{font:18px var(--mono);color:var(--good);letter-spacing:2px;white-space:nowrap}\n.badge.warn{border-color:#6b5426;background:#211a0c}\n.badge.warn .led{background:var(--warning);box-shadow:0 0 12px #ffd06480;animation:breath 1.6s ease-in-out infinite}\n.badge.warn span{color:var(--warning)}\n.badge.bad{border-color:#6b2f34;background:#210d0f}\n.badge.bad .led{background:var(--critical);box-shadow:0 0 12px #ff536980}\n.badge.bad span{color:var(--critical)}\nheader .grow{flex:1}\n.wx{flex:none;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;\n padding-right:26px;margin-right:4px;border-right:1px solid var(--rail)}\n.wx b{font:500 30px var(--display);color:#dcebf6;font-variant-numeric:tabular-nums;white-space:nowrap}\n.wx span{font:15px var(--mono);letter-spacing:2px;color:var(--muted);text-transform:uppercase;white-space:nowrap}\n.clock .t{font:46px/1 var(--mono);letter-spacing:-2px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}\n.clock .d{font-size:18px;color:var(--muted);letter-spacing:1px;margin-top:5px;text-align:right;white-space:nowrap}\n/* Ozubene kolo: jedina cesta do editoru. Zamerne male a v rohu - panel\n   ma ukazovat data, ne ovladaci prvky. */\n.cog{flex:none;width:52px;height:52px;border:1px solid var(--rail);background:#0a141c;color:#6f8798;\n display:flex;align-items:center;justify-content:center;border-radius:4px}\n.cog svg{width:26px;height:26px;fill:currentColor}\n.cog:active{background:#12212c;color:var(--a1)}\n\n/* ---------- stranky ----------\n   Vsechny stranky stoji vedle sebe v jednom pasu; prepnuti je posun.\n   Nic se pri prejeti nedopocitava, takze i na levnem tabletu jede\n   prechod plynule. */\n.pages{position:relative;display:block;min-height:0;overflow:hidden}\n.pstrip{display:flex;height:100%;min-height:0;\n transition:transform .38s cubic-bezier(.22,.7,.3,1);will-change:transform}\n.page{flex:0 0 100%;min-width:100%;display:grid;grid-template-rows:1fr auto;gap:16px;min-height:0;\n padding-right:0;opacity:.4;transition:opacity .3s}\n.page.on{opacity:1}\n/* Tecky stranek: ukazuji, kde jsi, a daji se i zmacknout. */\n.pdots{display:flex;align-items:center;justify-content:center;gap:16px;height:26px;flex:none}\n.pdots i{width:12px;height:12px;border-radius:50%;background:#2b3d49;transition:background .25s,transform .25s}\n.pdots i.on{background:var(--a1);transform:scale(1.35);box-shadow:0 0 12px #36d8ff70}\n\n/* ---------- sekce s budikem ----------\n   Cim vic sekci, tim mensi okna - o tom rozhoduje uzivatel. Vsechny\n   rozmery uvnitr sekce se odvozuji od jedineho meritka --k, takze\n   zmensena sekce zustane sama sebou a nerozsype se. */\n.mid{display:grid;gap:16px;min-height:0;--k:1}\n.mid.n1{grid-template-columns:1fr}\n.mid.n2{grid-template-columns:1fr 1fr}\n.mid.n3{grid-template-columns:repeat(3,1fr);--k:.74}\n.mid.n4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;--k:.78}\n/* Pet sekci: tri nahore, dve dole pres pul sirky. */\n.mid.n5{grid-template-columns:repeat(6,1fr);grid-template-rows:1fr 1fr;--k:.62}\n.mid.n5 > *{grid-column:span 2}\n.mid.n5 > *:nth-child(n+4){grid-column:span 3}\n/* Rucne nastavena mrizka: zadne zvlastni pripady, plati presne to,\n   co si uzivatel rekl. */\n.mid.fixed > *,.mid.fixed > *:nth-child(n+4){grid-column:auto}\n.mid.n6{grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;--k:.62}\n.panel-root.is-portrait .mid.n2{grid-template-columns:1fr;grid-template-rows:1fr 1fr}\n.panel-root.is-portrait .mid.n3{grid-template-columns:1fr 1fr;--k:.62}\n.panel-root.is-portrait .mid.n4{grid-template-columns:1fr 1fr;--k:.62}\n.panel-root.is-portrait .mid.n5,.panel-root.is-portrait .mid.n6{grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);--k:.55}\n.panel-root.is-portrait .mid.n5 > *,.panel-root.is-portrait .mid.n5 > *:nth-child(n+4){grid-column:auto}\n.pane{position:relative;min-height:0;border:1px solid var(--rail);background:var(--pane);border-radius:4px 28px 4px 4px;overflow:hidden}\n.card{--accent:var(--a1);--rgb:54,216,255;display:flex;flex-direction:column;\n padding:calc(20px*var(--k)) calc(28px*var(--k)) calc(14px*var(--k));\n border-color:rgba(var(--rgb),.42);background:radial-gradient(ellipse at 22% 48%,rgba(var(--rgb),.13),transparent 62%),linear-gradient(120deg,#0b141d,#05090d 80%)}\n.card.t-amber{--accent:var(--a2);--rgb:255,139,62}\n.card.t-green{--accent:var(--a3);--rgb:138,245,188}\n.card.t-violet{--accent:var(--a4);--rgb:196,138,255}\n.card.t-red{--accent:var(--a5);--rgb:255,83,105}\n.card::before{content:'';position:absolute;top:0;left:0;width:48%;height:4px;background:var(--accent);box-shadow:0 0 24px rgba(var(--rgb),.6)}\n.card::after{content:'';position:absolute;right:18px;bottom:15px;width:68px;height:9px;background:repeating-linear-gradient(120deg,var(--accent) 0 4px,transparent 4px 10px);opacity:.45}\n.chead{display:flex;align-items:center;gap:calc(16px*var(--k));height:calc(65px*var(--k));flex:none;\n border-bottom:1px solid rgba(var(--rgb),.19);padding-bottom:calc(12px*var(--k))}\n.chead .id{font:calc(19px*var(--k)) var(--mono);color:var(--accent);border:1px solid rgba(var(--rgb),.4);\n padding:calc(8px*var(--k)) calc(10px*var(--k));background:rgba(var(--rgb),.06)}\n.chead .nm{font-size:calc(44px*var(--k));font-weight:800;letter-spacing:calc(5px*var(--k));color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.chead .part{margin-left:auto;max-width:52%;font-size:calc(22px*var(--k));letter-spacing:1px;text-transform:uppercase;color:#b6c8d6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.cbody{display:flex;align-items:stretch;gap:calc(24px*var(--k));flex:1;min-height:0}\n.c.panel-root.solo{justify-content:center}\n/* Budik si vezme celou vysku sekce a zustane kulaty. Starsi WebView bez\n   aspect-ratio dostane pevny rozmer - panel tam vypada jako driv. */\n.gw{position:relative;flex:none;width:calc(520px*var(--k));height:calc(520px*var(--k));color:var(--accent);\n max-height:100%;align-self:center}\n@supports (aspect-ratio:1){\n  .gw{width:auto;height:100%;aspect-ratio:1;max-height:calc(640px*var(--k));min-width:calc(300px*var(--k))}\n}\n.gw::before{content:'';position:absolute;inset:48px;border-radius:50%;background:radial-gradient(circle,rgba(var(--rgb),.08),transparent 69%);box-shadow:inset 0 0 36px rgba(var(--rgb),.06)}\n.gw svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}\n.gw .dial-frame{fill:none;stroke:var(--accent);stroke-width:.6;opacity:.35}\n.gw .dial-ticks{fill:none;stroke:var(--accent);stroke-width:3;stroke-dasharray:.6 9.5;opacity:.5}\n.gw .dial-core{fill:none;stroke:var(--accent);stroke-width:.6;opacity:.2}\n.gw .dial-caption{font:10px var(--mono);letter-spacing:2px;fill:var(--accent);opacity:.75}\n.gv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:9px}\n.gv .cap{font:calc(19px*var(--k)) var(--mono);letter-spacing:calc(5px*var(--k));color:#99b2c4;margin-bottom:calc(20px*var(--k));text-transform:uppercase}\n.gv .n{font:700 calc(216px*var(--k))/.85 var(--display);letter-spacing:calc(-10px*var(--k));color:#d6e1e8;font-variant-numeric:tabular-nums}\n.gv .n.txt{font-size:calc(92px*var(--k));letter-spacing:-2px;text-align:center;padding:0 24px;line-height:1.05}\n.gv .u{font:calc(28px*var(--k)) var(--mono);color:var(--accent);margin-top:calc(14px*var(--k));letter-spacing:1px;min-height:calc(28px*var(--k))}\n.gv .st{font-size:calc(23px*var(--k));font-weight:700;letter-spacing:2px;margin-top:calc(19px*var(--k));padding:calc(5px*var(--k)) calc(12px*var(--k));background:#020609b0;border:1px solid currentColor}\n.cright{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;\n gap:calc(30px*var(--k));padding:0 0 calc(12px*var(--k))}\n.cright:empty{display:none}\n\n/* ---------- ukazatele a dlazdice ---------- */\n.meter .lbl{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:calc(12px*var(--k));white-space:nowrap}\n.meter .k{font-size:calc(26px*var(--k));letter-spacing:1px;color:var(--muted);overflow:hidden;text-overflow:ellipsis}\n.meter .k b{margin-left:calc(14px*var(--k));font:700 calc(20px*var(--k)) var(--display);letter-spacing:2px;text-transform:uppercase}\n.meter .v{font:500 calc(50px*var(--k)) var(--display);letter-spacing:-1px;font-variant-numeric:tabular-nums}\n.track{height:calc(24px*var(--k));position:relative;background:#010406;border:1px solid #344753;padding:3px;overflow:hidden}\n.fill{height:100%;width:0;transition:width .5s ease;mask-image:repeating-linear-gradient(90deg,#000 0 10px,transparent 10px 15px);-webkit-mask-image:repeating-linear-gradient(90deg,#000 0 10px,transparent 10px 15px)}\n.mnote{display:flex;justify-content:space-between;align-items:baseline;gap:14px;margin-top:11px;font:20px var(--mono);color:#829baa;white-space:nowrap}\n.mnote span{overflow:hidden;text-overflow:ellipsis}\n/* Dlazdice se skladaji podle toho, kolik je mista - v uzke sekci na\n   tabletu na vysku radeji jedna pod druhou nez orezana cisla. */\n.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(calc(190px*var(--k)),1fr));gap:calc(18px*var(--k));margin-top:4px}\n.tiles .tile{border-top:1px solid rgba(var(--rgb),.3);background:linear-gradient(rgba(var(--rgb),.06),transparent);\n padding:calc(18px*var(--k)) 8px calc(10px*var(--k)) calc(12px*var(--k));min-width:0}\n.tile .k{font-size:calc(24px*var(--k));letter-spacing:1px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.tile .v{font:600 calc(57px*var(--k))/1.1 var(--display);letter-spacing:-1px;margin-top:calc(8px*var(--k));white-space:nowrap;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}\n.tile .v.txt{font-size:calc(38px*var(--k))}\n.tile .v small{font-size:calc(25px*var(--k));font-weight:400;color:var(--muted);margin-left:8px;letter-spacing:0}\n\n/* ---------- sloupec, krivka, holé číslo ----------\n   Tri dalsi zpusoby, jak ukazat tutez hodnotu. Sloupec se cte stejne\n   jako budik (kolik je z rozsahu), krivka ukaze, kam to smeruje, a holé\n   číslo je pro veliciny, u kterych zadny rozsah nedava smysl. */\n.barw{position:relative;flex:none;display:flex;align-items:stretch;gap:calc(18px*var(--k));height:100%;padding:calc(8px*var(--k)) 0}\n.barw .bcol{position:relative;width:calc(150px*var(--k));flex:none;display:flex;flex-direction:column-reverse;gap:calc(4px*var(--k));\n background:#010406;border:1px solid #2b3d49;padding:calc(5px*var(--k))}\n.barw .bseg{flex:1;background:#141d28;transition:background .4s}\n.barw .bside{display:flex;flex-direction:column;justify-content:center;min-width:0}\n.barw .cap{font:calc(19px*var(--k)) var(--mono);letter-spacing:calc(4px*var(--k));color:#99b2c4;text-transform:uppercase;margin-bottom:calc(10px*var(--k))}\n.barw .n{font:700 calc(150px*var(--k))/.85 var(--display);letter-spacing:calc(-6px*var(--k));color:#d6e1e8;font-variant-numeric:tabular-nums}\n.barw .n.txt{font-size:calc(70px*var(--k));letter-spacing:-2px}\n.barw .u{font:calc(26px*var(--k)) var(--mono);color:var(--accent);margin-top:calc(10px*var(--k))}\n.barw .st{align-self:flex-start;font-size:calc(22px*var(--k));font-weight:700;letter-spacing:2px;margin-top:calc(16px*var(--k));\n padding:calc(5px*var(--k)) calc(12px*var(--k));background:#020609b0;border:1px solid currentColor}\n.barw .ends{position:absolute;right:calc(-2px*var(--k));top:0;bottom:0;display:none}\n\n.numw{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center}\n.numw .cap{font:calc(19px*var(--k)) var(--mono);letter-spacing:calc(5px*var(--k));color:#99b2c4;text-transform:uppercase;margin-bottom:calc(14px*var(--k))}\n.numw .n{font:700 calc(230px*var(--k))/.85 var(--display);letter-spacing:calc(-10px*var(--k));color:#d6e1e8;font-variant-numeric:tabular-nums}\n.numw .n.txt{font-size:calc(96px*var(--k));letter-spacing:-2px;text-align:center}\n.numw .u{font:calc(30px*var(--k)) var(--mono);color:var(--accent);margin-top:calc(12px*var(--k))}\n.numw .st{font-size:calc(23px*var(--k));font-weight:700;letter-spacing:2px;margin-top:calc(18px*var(--k));\n padding:calc(5px*var(--k)) calc(12px*var(--k));background:#020609b0;border:1px solid currentColor}\n\n.graphw{flex:1;min-width:0;display:flex;flex-direction:column;height:100%;padding:calc(6px*var(--k)) 0 0}\n.graphw .ghead{display:flex;align-items:baseline;gap:calc(16px*var(--k));flex:none}\n.graphw .cap{font:calc(18px*var(--k)) var(--mono);letter-spacing:calc(4px*var(--k));color:#99b2c4;text-transform:uppercase}\n.graphw .n{font:700 calc(110px*var(--k))/.9 var(--display);letter-spacing:calc(-4px*var(--k));color:#d6e1e8;font-variant-numeric:tabular-nums}\n.graphw .n.txt{font-size:calc(56px*var(--k));letter-spacing:-1px}\n.graphw .u{font:calc(24px*var(--k)) var(--mono);color:var(--accent)}\n.graphw .st{margin-left:auto;font-size:calc(21px*var(--k));font-weight:700;letter-spacing:2px;\n padding:calc(4px*var(--k)) calc(10px*var(--k));background:#020609b0;border:1px solid currentColor}\n.graphw .gbox{flex:1;min-height:calc(120px*var(--k));position:relative;margin-top:calc(10px*var(--k))}\n.graphw .span{display:flex;justify-content:space-between;flex:none;margin-top:calc(6px*var(--k));\n font:calc(17px*var(--k)) var(--mono);color:#6f8798;letter-spacing:1px}\n\n.gempty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;\n font:calc(20px*var(--k)) var(--mono);color:#4e6373;letter-spacing:2px}\n\n/* Krivka v dlazdici a v ukazateli - jen tvar, bez popisku. */\n.spark{height:calc(46px*var(--k));position:relative;margin-top:calc(6px*var(--k))}\n.lt .spark{height:calc(52px*var(--k))}\n\n/* ---------- kamera ----------\n   Snimek se obnovuje po par vterinach; proud videa by na levnem tabletu\n   jen zral proud a pamet. */\n.camw{flex:1;min-width:0;position:relative;display:flex;align-items:center;justify-content:center;\n background:#04080b;border:1px solid rgba(var(--rgb),.25);overflow:hidden}\n.camw .cam{width:100%;height:100%;object-fit:cover;display:block}\n.camw .camnote{position:absolute;font:calc(22px*var(--k)) var(--mono);letter-spacing:2px;color:#5f7686}\n.camw::after{content:'';position:absolute;left:0;right:0;bottom:0;height:calc(70px*var(--k));\n background:linear-gradient(transparent,#04080bcc);pointer-events:none}\n\n/* ---------- seznamy: predpoved, kalendar, ukoly ----------\n   Tri ruzna data, jeden tvar radku: vlevo kdy, uprostred co, vpravo\n   cislo. Pres pokoj se to pak cte stejne rychle jako budik. */\n.listw{flex:1;min-width:0;display:flex;flex-direction:column;height:100%;padding:calc(4px*var(--k)) 0 0}\n.listw .lhead{display:flex;align-items:baseline;gap:calc(12px*var(--k));flex:none;\n padding-bottom:calc(10px*var(--k));border-bottom:1px solid rgba(var(--rgb),.18)}\n.listw .cap{font:calc(18px*var(--k)) var(--mono);letter-spacing:calc(4px*var(--k));color:#99b2c4;text-transform:uppercase}\n.listw .n{font:700 calc(72px*var(--k))/.9 var(--display);color:#d6e1e8;font-variant-numeric:tabular-nums}\n.listw .u{font:calc(22px*var(--k)) var(--mono);color:var(--accent)}\n.listw .st{font-size:calc(20px*var(--k));letter-spacing:1px;color:#9fb6c4;text-transform:uppercase}\n.listw .grow{flex:1}\n.listw .lsum{font:calc(19px*var(--k)) var(--mono);color:#7f9db1;white-space:nowrap}\n.listw .lrows{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;\n gap:calc(4px*var(--k));padding-top:calc(8px*var(--k));overflow:hidden}\n/* Radky rostou, dokud je v sekci misto - malo radku tedy neznamena\n   prazdnou spodni polovinu okna. */\n.listw .lrow{flex:1 1 0;display:flex;align-items:center;gap:calc(16px*var(--k));min-width:0;\n min-height:calc(46px*var(--k));max-height:calc(104px*var(--k));\n padding:calc(6px*var(--k)) 0;border-bottom:1px solid #16222c}\n.listw .lrow:last-child{border-bottom:none}\n.listw .lday{flex:none;width:calc(66px*var(--k));font:700 calc(30px*var(--k)) var(--display);\n letter-spacing:1px;color:var(--accent);text-transform:uppercase}\n.listw .lwhen{flex:none;min-width:calc(170px*var(--k));font:calc(25px*var(--k)) var(--mono);color:var(--accent);white-space:nowrap}\n.listw .lname{flex:1;min-width:0;font-size:calc(30px*var(--k));color:#d6e1e8;\n white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.listw .ltemp{flex:none;display:flex;align-items:baseline;gap:calc(10px*var(--k));font-variant-numeric:tabular-nums}\n.listw .ltemp b{font:600 calc(38px*var(--k)) var(--display);color:#eaf4ff}\n.listw .ltemp i{font:calc(28px*var(--k)) var(--display);font-style:normal;color:#7f9db1}\n.listw .lrain{flex:none;width:calc(84px*var(--k));text-align:right;font:calc(22px*var(--k)) var(--mono);color:var(--a1)}\n/* Ukol se odskrtne klepnutim - jedine, co u seznamu na zdi clovek dela. */\n.listw .lbox{flex:none;width:calc(32px*var(--k));height:calc(32px*var(--k));\n border:2px solid rgba(var(--rgb),.6);border-radius:4px}\n.listw .lrow.tapable:active{background:rgba(var(--rgb),.14)}\n.listw .lrow.done{opacity:.35}\n.listw .lrow.done .lbox{background:var(--accent)}\n.listw .lrow.done .lname{text-decoration:line-through}\n.listw .lwait{flex:1;display:flex;align-items:center;justify-content:center;\n font:calc(20px*var(--k)) var(--mono);color:#5f7686;letter-spacing:2px}\n\n/* Nahled kamery v dlazdici panelu. */\n/* Dlazdice s kamerou ukazuje obraz, ne stav (\"Klid\") - ten by jen mátl. */\n.lt.camtile{display:flex;flex-direction:column}\n.lt.camtile .lv,.lt.camtile .lst{display:none}\n/* Pevna vyska: roztahujici se nahled by stlacil sekce nad sebou. */\n.camthumb{flex:none;height:calc(150px*var(--k));margin-top:calc(6px*var(--k));\n background:#04080b;border:1px solid rgba(var(--rgb),.25);overflow:hidden}\n.camthumb img{width:100%;height:100%;object-fit:cover;display:block}\n\n/* ---------- spodni panely ---------- */\n.bot{display:grid;gap:16px;min-height:0;--k:1}\n.bot.n1{grid-template-columns:1fr}\n.bot.n2{grid-template-columns:1fr 1fr}\n.bot.n3{grid-template-columns:repeat(3,1fr);--k:.85}\n.bot.n4{grid-template-columns:repeat(4,1fr);--k:.72}\n.panel-root.is-portrait .bot.n2{grid-template-columns:1fr 1fr;--k:.8}\n.panel-root.is-portrait .bot.n3,.panel-root.is-portrait .bot.n4{grid-template-columns:1fr 1fr;--k:.7}\n.panel{display:flex;flex-direction:column;padding:calc(18px*var(--k)) calc(26px*var(--k)) calc(16px*var(--k));\n background:linear-gradient(120deg,#0b151b,#050a0e);min-height:calc(248px*var(--k))}\n.ptitle{font:500 calc(21px*var(--k)) var(--display);color:#adc0cf;letter-spacing:3px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.ptitle::before{content:'';display:inline-block;width:5px;height:16px;background:var(--accent,var(--a3));margin-right:12px;vertical-align:-1px}\n.chead2{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px}\n.panel{--accent:var(--a3);--rgb:138,245,188}\n.panel.t-cyan{--accent:var(--a1);--rgb:54,216,255}\n.panel.t-amber{--accent:var(--a2);--rgb:255,139,62}\n.panel.t-violet{--accent:var(--a4);--rgb:196,138,255}\n.panel.t-red{--accent:var(--a5);--rgb:255,83,105}\n.psrc{font:18px var(--mono);letter-spacing:2px;color:var(--muted);white-space:nowrap}\n.prow{flex:1;min-height:0;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:22px;align-content:start}\n.prow.c3{grid-auto-flow:row;grid-template-columns:repeat(3,1fr)}\n.prow.wrap{grid-auto-flow:row;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}\n.lt{position:relative;border-top:1px solid rgba(var(--rgb),.3);background:linear-gradient(rgba(var(--rgb),.06),transparent);padding:12px 12px 6px;min-width:0}\n.lt.act{border-top-width:3px}\n.lt.act::after{content:'';position:absolute;right:10px;top:10px;width:9px;height:9px;background:var(--accent);opacity:.5}\n.lt.on{background:linear-gradient(rgba(var(--rgb),.22),rgba(var(--rgb),.04))}\n.lt:active{background:rgba(var(--rgb),.3)}\n.lt .lk{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:calc(24px*var(--k));letter-spacing:1px;color:var(--muted);white-space:nowrap}\n.lt .lk span{overflow:hidden;text-overflow:ellipsis}\n.lt .lst{flex:none;font-size:calc(19px*var(--k));font-weight:700;letter-spacing:2px;text-transform:uppercase}\n.lt .lv{font:600 calc(62px*var(--k))/1.05 var(--display);letter-spacing:-1px;margin:2px 0 calc(6px*var(--k));font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.lt .lv.txt{font-size:calc(40px*var(--k));letter-spacing:0}\n.lt .lv small{font-size:calc(24px*var(--k));font-weight:400;color:var(--muted);margin-left:8px;letter-spacing:1px}\n.lt .track{height:calc(18px*var(--k))}\n.lt .lr{font:calc(20px*var(--k)) var(--mono);color:#829baa;margin-top:calc(8px*var(--k));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.pempty{flex:1;display:flex;align-items:center;justify-content:center;font:22px var(--mono);letter-spacing:2px;color:#5f7686;text-align:center;padding:12px}\n\n/* ---------- krivka: stupnice, bod posledni hodnoty ---------- */\n.chartbox{position:absolute;inset:0}\n.chartbox.scaled{left:calc(58px*var(--k));bottom:calc(26px*var(--k))}\n.chart{position:absolute;inset:0;width:100%;height:100%;overflow:visible}\n.chart .grid{stroke:#24323d;stroke-width:1;vector-effect:non-scaling-stroke}\n.chart .area{fill:rgba(var(--rgb),.16)}\n.chart .line{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}\n/* Bod je HTML, ne SVG - v roztazene soustave by z kolecka byl oval. */\n.cdot{position:absolute;width:calc(14px*var(--k));height:calc(14px*var(--k));margin:calc(-7px*var(--k)) 0 0 calc(-7px*var(--k));\n border-radius:50%;background:var(--accent);box-shadow:0 0 calc(14px*var(--k)) rgba(var(--rgb),.9)}\n.cy{position:absolute;right:100%;top:0;bottom:0;width:calc(54px*var(--k));pointer-events:none}\n.cy span{position:absolute;right:calc(8px*var(--k));transform:translateY(-50%);\n font:calc(17px*var(--k)) var(--mono);color:#6f8798;letter-spacing:.5px;white-space:nowrap}\n.cx{position:absolute;left:0;right:0;top:100%;display:flex;justify-content:space-between;\n font:calc(17px*var(--k)) var(--mono);color:#6f8798;letter-spacing:1px;padding-top:calc(5px*var(--k))}\n.spark .chartbox{inset:0}\n.spark .cdot{width:calc(9px*var(--k));height:calc(9px*var(--k));margin:calc(-4.5px*var(--k)) 0 0 calc(-4.5px*var(--k))}\n.spark .chart .grid{display:none}\n\n/* ---------- pruh upozorneni (misto zahlavi) ---------- */\n#alert{position:absolute;top:24px;left:32px;right:32px;height:84px;z-index:6;display:flex;align-items:center;gap:24px;\n padding:15px 26px;background:linear-gradient(100deg,#103448,#08131d);border:1px solid #36d8ff80;border-left:5px solid var(--a1);\n transform:translateY(-150%);opacity:0;transition:transform .5s ease,opacity .4s;pointer-events:none}\n.panel-root.alert #alert{transform:none;opacity:1}\n.panel-root.alert header{visibility:hidden}\n#alert .al{display:flex;align-items:center;gap:12px;white-space:nowrap;font-size:26px;letter-spacing:2px;font-weight:700;color:var(--a1);text-transform:uppercase}\n#alert .al i{width:10px;height:10px;background:var(--a1);animation:breath 1.6s ease-in-out infinite}\n#alert .at{flex:1;min-width:40px;height:18px;background:#030b11;position:relative;overflow:hidden}\n#alert .af{width:0;height:100%;background:var(--a1);transition:width .45s;mask-image:repeating-linear-gradient(90deg,#000 0 10px,transparent 10px 15px)}\n#alert .ap{font:600 43px var(--display);min-width:140px;text-align:right;white-space:nowrap}\n#alert .ap small{font-size:23px;margin-left:6px;color:var(--muted)}\n#alert.text .at,#alert.text .ap{display:none}\n#alert .am{font-size:24px;color:var(--ink2);white-space:nowrap;text-align:right;overflow:hidden;text-overflow:ellipsis}\n\n/* ---------- klidovy rezim ---------- */\n#organism{position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:0;transition:opacity 1.8s}\n.panel-root.mode-ambient #organism{opacity:.28}\n#ambient{position:absolute;inset:0;z-index:4;display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 80px 36px}\n.panel-root.mode-ambient #ambient{display:flex;opacity:.5;animation:ambIn 1.2s ease both,ambientTravel 173s ease-in-out infinite alternate}\n.panel-root.mode-ambient header,.panel-root.mode-ambient .mid,.panel-root.mode-ambient .bot,.panel-root.mode-ambient #alert{display:none}\n.panel-root.mode-ambient .bg,.panel-root.mode-ambient .scan{display:none}\n#ambient .aclock{font:500 190px/1 var(--display);letter-spacing:1px;color:#eef7ff;font-variant-numeric:tabular-nums}\n#ambient .adate{font-size:32px;letter-spacing:6px;color:#7f9db1;margin-top:8px;text-transform:uppercase}\n/* Kruhu muze byt az ctyri - cim vic jich je, tim mensi, a v uzkem\n   prostoru se prelomi do dvou rad. --ak je jejich meritko. */\n#ambient .arow{--ak:1;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;\n gap:40px 90px;margin-top:30px;max-width:100%}\n#ambient .arow.c3{--ak:.8}\n#ambient .arow.c4{--ak:.72}\n#ambient .acell{--accent:var(--a1);--rgb:54,216,255;position:relative;flex:none;\n width:calc(460px*var(--ak));height:calc(460px*var(--ak));display:flex;flex-direction:column;\n align-items:center;justify-content:center;border-radius:50%;\n background:radial-gradient(circle,rgba(var(--rgb),.08),#02070bb0 57%,transparent 68%)}\n#ambient .acell:nth-child(2){--accent:var(--a2);--rgb:255,139,62}\n#ambient .acell:nth-child(3){--accent:var(--a3);--rgb:138,245,188}\n#ambient .acell:nth-child(4){--accent:var(--a4);--rgb:196,138,255}\n#ambient .acell::before{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid rgba(var(--rgb),.3);border-top:5px solid var(--accent);border-bottom:5px solid var(--accent);transform:rotate(-35deg);box-shadow:0 0 35px rgba(var(--rgb),.1),inset 0 0 35px rgba(var(--rgb),.08)}\n#ambient .acell::after{content:'';position:absolute;inset:16px;border-radius:50%;border:1px dashed rgba(var(--rgb),.4);pointer-events:none}\n/* Popisek zustava UVNITR kruhu: dlouhy nazev entity driv pretekl pres\n   sousedni budik. Co se nevejde, konci trema teckami. */\n#ambient .alabel{max-width:66%;font-size:calc(28px*var(--ak));font-weight:700;\n letter-spacing:calc(5px*var(--ak));color:var(--accent);margin-bottom:calc(10px*var(--ak));\n text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}\n#ambient .aval{font:700 calc(200px*var(--ak))/.9 var(--display);letter-spacing:calc(-8px*var(--ak));\n color:#d6e1e8;font-variant-numeric:tabular-nums;max-width:86%;overflow:hidden;text-overflow:ellipsis}\n/* Delsi cislo = mensi pismo, at se vejde do kruhu cele. */\n#ambient .aval.l4{font-size:calc(150px*var(--ak));letter-spacing:calc(-5px*var(--ak))}\n#ambient .aval.l5{font-size:calc(122px*var(--ak));letter-spacing:calc(-4px*var(--ak))}\n#ambient .aval.l6{font-size:calc(104px*var(--ak));letter-spacing:calc(-3px*var(--ak))}\n#ambient .aval.l7{font-size:calc(88px*var(--ak));letter-spacing:calc(-2px*var(--ak))}\n#ambient .aval.txt{font-size:calc(74px*var(--ak));letter-spacing:0;text-align:center;white-space:nowrap}\n#ambient .aunit{font:calc(31px*var(--ak)) var(--mono);color:var(--accent);margin-top:calc(8px*var(--ak));min-height:calc(31px*var(--ak))}\n#ambient .astate{max-width:82%;font-size:calc(23px*var(--ak));letter-spacing:3px;margin-top:calc(14px*var(--ak));\n text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#ambient .aline{margin-top:26px;font:26px var(--mono);letter-spacing:2px;color:#7f9db1;white-space:nowrap;\n max-width:92%;overflow:hidden;text-overflow:ellipsis}\n#ambient .aline b{font-weight:500;color:#cfe0ea}\n#ambient .atag{font:22px var(--mono);letter-spacing:4px;color:#8ca9bc;margin-top:30px;display:flex;align-items:center;gap:14px;text-transform:uppercase}\n#ambient .atag i{width:8px;height:8px;background:var(--a1);box-shadow:0 0 12px var(--a1);animation:breath 3s ease-in-out infinite}\n/* Na vysku se kruhy poskladaji po dvou - vedle sebe by nezbylo na cisla. */\n.panel-root.is-portrait #ambient .arow{--ak:.72;gap:36px 50px;max-width:96%}\n.panel-root.is-portrait #ambient .aclock{font-size:150px}\n\n/* ---------- zvetsena sekce ----------\n   Okno se rozbali z mista, kde sekce stoji. Zadny efekt navic: jen\n   prechod polohy a velikosti, aby bylo videt, co se zvetsilo. */\n#zoom{position:absolute;inset:0;z-index:85;display:none;align-items:center;justify-content:center;\n padding:4vmin;background:#01050898;backdrop-filter:blur(3px)}\n.panel-root.zooming #zoom{display:flex}\n.panel-root.zooming #stage{filter:blur(2px) saturate(.7)}\n/* Okno nemusi byt pres cely tablet - kolem neho je videt panel, takze\n   je poznat, ze jde o nahled, ne o jinou obrazovku. */\n#zoom .zwin{position:relative;width:min(1400px,90vw);height:min(860px,86vh);\n display:flex;flex-direction:column;\n transition:transform .5s cubic-bezier(.17,.86,.28,1),opacity .34s ease-out;\n transform-origin:center;will-change:transform}\n#zoom #zoomBody{position:relative;flex:1 1 auto;min-height:0;--k:1;display:flex}\n/* Ovladani pod zvetsenou sekci - svetlo se da rozsvitit rovnou ve velkem.\n   Kdyz ma entita ovladani vic (jas, teplota bile, barvy), pruh si vezme\n   az nadpolovicni vysku okna a sekce se o to zmensi; co se nevejde ani\n   tak, se da vyrolovat. Nic nikdy nezustane pod okrajem displeje. */\n#zoom .zctrl{flex:0 1 auto;max-height:58%;overflow-y:auto;-webkit-overflow-scrolling:touch;\n padding:14px 20px 4px;background:linear-gradient(160deg,#0c1720,#050b0f);\n border-top:1px solid #1b2a35}\n#zoom .zctrl:empty{display:none}\n/* Na lezicim tabletu stoji ovladani VEDLE sekce, ne pod ni: sekce\n   zustane velka a ovladani se vejde cele i na nizky displej. Bez\n   ovladani (cidlo, kamera) si sekce vezme celou sirku sama. */\n@media (min-aspect-ratio:5/4){\n #zoom .zwin{flex-direction:row}\n #zoom #zoomBody{flex:1 1 auto;min-width:0}\n #zoom .zctrl{flex:0 0 34%;max-width:520px;max-height:none;align-self:stretch;\n  padding:18px 20px 6px;border-top:none;border-left:1px solid #1b2a35}\n /* Misto pro krizek v rohu, at nelezi na prvnim tlacitku. */\n #zoom .zctrl > :first-child{padding-right:62px}\n /* V uzkem sloupci se tlacitka radeji zalomi pod sebe, nez aby\n    prerostla jeho sirku a zalezla pod okraj okna. */\n #zoom .zctrl .drow{flex-wrap:wrap}\n #zoom .zctrl .dbtn{min-width:0}\n #zoom .zctrl .dbtn.big{flex:1 1 120px}\n}\n/* Ve zvetsene sekci jsou ovladaci prvky o neco nizsi nez v okne s\n   podrobnostmi - vejde se jich vedle sebe vic a porad se do nich da\n   trefit prstem. */\n#zoom .zctrl .dbtn{min-height:52px}\n#zoom .zctrl .dbtn.big{min-height:60px;font-size:19px}\n#zoom .zctrl .dbtn.rnd{width:68px;min-height:68px;font-size:30px}\n#zoom .zctrl .drow{margin-bottom:12px}\n#zoom .zctrl .dslide{margin-bottom:12px}\n#zoom .zctrl .dslide input[type=range]{height:44px}\n#zoom .zctrl .dsl{margin-bottom:4px}\n#zoom .zctrl .dsl b{font-size:22px}\n#zoom .zctrl .dsw{gap:8px;margin-bottom:12px}\n#zoom .zctrl .dsw i{height:44px}\n#zoom .zctrl .dtemp{gap:18px;margin-bottom:12px}\n#zoom .zctrl .dtemp b{font-size:46px;min-width:150px}\n#zoom .zctrl .dmedia{margin-bottom:12px}\n#zoom .zctrl .dmedia img{width:72px;height:72px}\n\n/* Nizky displej (tablet se prohlizeci casto hlasi jen par set bodu):\n   ovladani se scvrkne, aby se veslo cele - i svetlo s jasem, teplotou\n   bile a dvanacti barvami. Prstem se do nej pak trefi porad. */\n@media (max-height:640px){\n #zoom .zwin{height:90vh;width:92vw}\n #zoom{padding:2vmin}\n #zoom .zctrl{max-height:62%;padding:10px 14px 2px}\n @media (min-aspect-ratio:5/4){#zoom .zctrl{max-height:none;padding:12px 14px 4px}}\n #zoom .zctrl .dbtn,.dwin .dbtn{min-height:42px;font-size:15px}\n #zoom .zctrl .dbtn.big,.dwin .dbtn.big{min-height:46px;font-size:16px}\n #zoom .zctrl .dbtn.rnd,.dwin .dbtn.rnd{width:54px;min-height:54px;font-size:24px}\n #zoom .zctrl .dbtn.x,.dwin .dbtn.x{width:42px;min-height:42px;font-size:17px}\n #zoom .zctrl .drow,.dwin .drow,\n #zoom .zctrl .dslide,.dwin .dslide,\n #zoom .zctrl .dsw,.dwin .dsw{margin-bottom:8px}\n #zoom .zctrl .dsl,.dwin .dsl{font-size:13px;margin-bottom:2px}\n #zoom .zctrl .dsl b,.dwin .dsl b{font-size:18px}\n #zoom .zctrl .dslide input[type=range],.dwin .dslide input[type=range]{height:34px}\n #zoom .zctrl .dslide input[type=range]::-webkit-slider-runnable-track,\n .dwin .dslide input[type=range]::-webkit-slider-runnable-track{height:16px;border-radius:8px}\n #zoom .zctrl .dslide input[type=range]::-webkit-slider-thumb,\n .dwin .dslide input[type=range]::-webkit-slider-thumb{width:34px;height:34px;margin-top:-10px}\n #zoom .zctrl .dsw i,.dwin .dsw i{height:34px}\n #zoom .zctrl .dsw,.dwin .dsw{gap:7px}\n #zoom .zctrl .dtemp b,.dwin .dtemp b{font-size:34px;min-width:110px}\n #zoom .zctrl .dmedia img,.dwin .dmedia img{width:56px;height:56px}\n .dwin .dbody{padding:12px 16px 14px}\n .dwin .dhead{padding:12px 12px 10px 16px}\n .dwin .dnames b{font-size:20px}\n .dwin .dval{font-size:26px}\n .dwin .dgraph{height:120px}\n}\n#zoom #zoomBody .mid{flex:1;min-width:0;--k:1}\n#zoom #zoomBody .pages,#zoom #zoomBody .pstrip,#zoom #zoomBody .page{flex:1;min-width:0;display:flex}\n#zoom #zoomBody .camw{min-height:60vh}\n#zoom .zclose{position:absolute;top:-1px;right:-1px;z-index:2;width:66px;height:66px;\n font-size:30px;color:#cfe4f2;background:#0b1b24e0;border:1px solid #2d5768;border-radius:0 4px 0 12px}\n#zoom .zclose:active{background:#16303d}\n/* Zvetsena sekce uz se nezvetsuje dal. */\n#zoom .card{border-radius:6px 28px 6px 6px}\n/* Misto pro krizek, at nelezi na nazvu entity v rohu sekce. */\n#zoom #zoomBody .card > .head{padding-right:78px}\n\n/* ---------- okno s ovladanim entity ---------- */\n#detail{position:absolute;inset:0;z-index:105;display:none;align-items:center;justify-content:center;\n padding:3vmin;background:#010508b0;backdrop-filter:blur(3px)}\n.panel-root.detailing #detail{display:flex}\n.dwin{width:min(860px,94vw);max-height:92vh;overflow-y:auto;-webkit-overflow-scrolling:touch;\n background:linear-gradient(150deg,#0c1720,#050a0e);border:1px solid #2d5768;border-radius:6px 24px 6px 6px;\n box-shadow:0 30px 80px #000a;animation:dwinIn .26s cubic-bezier(.2,.8,.3,1) both}\n@keyframes dwinIn{from{opacity:0;transform:translateY(26px) scale(.96)}to{opacity:1;transform:none}}\n.dhead{display:flex;align-items:center;gap:18px;padding:20px 18px 16px 24px;border-bottom:1px solid #1b2a35}\n.dnames{flex:1;min-width:0}\n.dnames b{display:block;font-size:30px;font-weight:700;letter-spacing:2px;color:#eaf4ff;\n white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase}\n.dnames i{display:block;font:14px var(--mono);color:#6f8798;font-style:normal;\n white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dval{flex:none;font:600 40px var(--display);color:var(--a1);font-variant-numeric:tabular-nums;white-space:nowrap}\n.dbody{padding:20px 24px 26px}\n.dbtn{min-height:60px;padding:0 22px;font:17px/1 var(--display);letter-spacing:2px;text-transform:uppercase;\n color:#cfe4f2;background:#0e1d27;border:1px solid #2d5768;border-radius:4px}\n.dbtn:active{background:#16303d}\n.dbtn.big{flex:1;min-height:76px;font-size:21px}\n.dbtn.on{color:#04121a;background:var(--a1);border-color:var(--a1)}\n.dbtn.off{color:#cfd9e0;background:#1b2730;border-color:#3b4b57}\n.dbtn.x{flex:none;width:56px;min-height:56px;padding:0;font-size:22px;border-radius:50%}\n.dbtn.rnd{width:84px;min-height:84px;font-size:36px;border-radius:50%}\n.drow{display:flex;gap:12px;margin-bottom:18px}\n.drow.wrap{flex-wrap:wrap}\n.dlbl{font:13px var(--mono);letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:6px 0 10px}\n.dslide{margin-bottom:20px}\n.dsl{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;\n font:15px var(--mono);letter-spacing:1px;color:var(--muted)}\n.dsl b{font:600 26px var(--display);color:#eaf4ff}\n/* Posuvnik musi byt tlusty - na tabletu se trefuje prstem, ne mysi. */\n.dslide input[type=range]{width:100%;height:52px;appearance:none;-webkit-appearance:none;background:transparent}\n.dslide input[type=range]::-webkit-slider-runnable-track{height:22px;border-radius:11px;\n background:linear-gradient(90deg,#123244,#36d8ff55);border:1px solid #2d5768}\n.dslide input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;\n width:46px;height:46px;margin-top:-13px;border-radius:50%;background:var(--a1);border:3px solid #04121a;\n box-shadow:0 0 16px #36d8ff70}\n.dslide.warm input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(90deg,#ff9b3a,#cfe6ff)}\n.dslide.warm input[type=range]::-webkit-slider-thumb{background:#ffd7a8}\n.dsw{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px}\n.dsw i{display:block;height:58px;border-radius:6px;border:1px solid #ffffff22}\n.dsw i:active{outline:3px solid #fff8}\n.dtemp{display:flex;align-items:center;justify-content:center;gap:26px;margin-bottom:20px}\n.dtemp b{font:600 62px var(--display);color:#eaf4ff;font-variant-numeric:tabular-nums;min-width:200px;text-align:center}\n.dmedia{display:flex;align-items:center;gap:18px;margin-bottom:20px}\n.dmedia img{width:96px;height:96px;object-fit:cover;border-radius:6px;background:#0b1720}\n.dmtxt{min-width:0}\n.dmtxt b{display:block;font-size:22px;color:#eaf4ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dmtxt span{display:block;font:14px var(--mono);color:#7f9db1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.dgraph{position:relative;height:190px;margin:18px 0 6px;--k:1;--accent:var(--a1);--rgb:54,216,255}\n.dnote{font:14px var(--mono);color:#6f8798;letter-spacing:1px;margin-top:14px}\n/* Dlazdice pod prstem pri dlouhem stisku - at je poznat, ze se neco deje. */\n.lt.held,.card.held{outline:2px solid rgba(var(--rgb),.5);outline-offset:-2px}\n\n/* ---------- prekryvy stavu ---------- */\n.overlay{position:absolute;inset:0;z-index:70;display:none;flex-direction:column;align-items:center;justify-content:center;padding:5vmin;text-align:center}\n.panel-root.mode-down .ov-down,.panel-root.mode-setup .ov-setup{display:flex}\n.panel-root.mode-down #stage,.panel-root.mode-setup #stage{visibility:hidden;opacity:0}\n.panel-root.mode-down .bg,.panel-root.mode-down .scan{display:none}\n.state-kicker{font:clamp(10px,2.4vmin,25px) var(--mono);letter-spacing:.3em;text-transform:uppercase}\n.ov-down{background:radial-gradient(ellipse at 50% 45%,#35200d,#020405 70%)}\n.ov-down .state-kicker{color:var(--a2);margin-bottom:3vmin}\n.signal-mark{display:flex;align-items:center;justify-content:center;gap:1.3vmin;width:19vmin;height:19vmin;border:1px solid #986032;background:#29190b;clip-path:polygon(20% 0,100% 0,100% 80%,80% 100%,0 100%,0 20%);margin-bottom:3vmin}\n.signal-mark i{width:1.6vmin;background:var(--a2);animation:breath 1.8s ease-in-out infinite}\n.signal-mark i:nth-child(1){height:4vmin}.signal-mark i:nth-child(2){height:8vmin;animation-delay:.2s}.signal-mark i:nth-child(3){height:12vmin;animation-delay:.4s}\n.ov-down h2{font-size:8vmin;letter-spacing:.08em;text-transform:uppercase;color:#ffc28b}\n.ov-down p{font-size:3vmin;max-width:85vw;color:#c5ad97;margin-top:2vmin}\n.ov-down .state-note{font:2.3vmin var(--mono);color:#ac815a;letter-spacing:.08em;border-top:1px solid #604124;padding-top:3vmin;margin-top:4vmin}\n.ov-setup{background:radial-gradient(ellipse at 50% 40%,#0a2b3b,#020508 68%)}\n.ov-setup .state-kicker{color:var(--a1);margin-bottom:3vmin}\n.ov-setup h2{font-size:6vmin;letter-spacing:.08em;text-transform:uppercase;color:#cfe9f6}\n.ov-setup p{font-size:2.8vmin;max-width:80vw;color:#9fc0d2;margin-top:2vmin;line-height:1.5}\n.bigbtn{margin-top:5vmin;padding:2.2vmin 5vmin;font:3vmin var(--display);letter-spacing:.2em;text-transform:uppercase;\n color:#04121a;background:var(--a1);border:none;border-radius:3px}\n.bigbtn.ghost{background:transparent;color:var(--a1);border:1px solid var(--a1)}\n\n/* ---------- start ---------- */\n#boot{position:absolute;inset:0;z-index:90;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4vmin;background:radial-gradient(ellipse at 50% 35%,#0a2b3b,#020508 65%);overflow:hidden}\n#boot::before,#boot::after{content:'';position:absolute;left:50%;top:43%;width:69vmin;height:69vmin;border:1px solid #36d8ff25;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}\n#boot::after{width:83vmin;height:83vmin;border-style:dashed;border-color:#36d8ff15}\n/* Po dobehnuti uz nesmi chytat dotyky - jinak by prvni klepnuti nebo\n   prejeti prstem spadlo do prazdna. */\n#boot.done{animation:bootOut .7s ease forwards;pointer-events:none}\n#boot .boot-emblem{position:relative;width:15vmin;height:15vmin;border:2px solid var(--a1);border-left-color:transparent;border-right-color:var(--a2);border-radius:50%;margin-bottom:1vmin;box-shadow:0 0 7vmin #36d8ff20;animation:reactorIn 1.8s ease both}\n#boot .boot-emblem::before{content:'';position:absolute;inset:3vmin;background:linear-gradient(135deg,var(--a1) 0 32%,transparent 32% 44%,var(--a1) 44% 62%,transparent 62% 74%,var(--a2) 74%);clip-path:polygon(20% 0,100% 0,80% 100%,0 100%)}\n#boot .boot-kicker{font:2.2vmin var(--mono);letter-spacing:.3em;text-transform:uppercase;color:#75b3cf;z-index:1}\n#boot .bl{width:54vw;max-width:900px;height:1.3vmin;background:#142833;margin-top:2vmin;z-index:1;overflow:hidden}\n#boot .bl i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--a1) 70%,#fff);transition:width .35s;mask-image:repeating-linear-gradient(90deg,#000 0 12px,transparent 12px 17px)}\n#boot .bt{font:2.6vmin var(--mono);height:4vmin;color:#b3cfdd;letter-spacing:.1em;z-index:1}\n#boot .boot-steps{display:flex;gap:2vmin;z-index:1}\n#boot .boot-steps i{width:5vmin;height:.4vmin;background:#284052}\n#boot .boot-steps i.active{background:var(--a1)}\n\n/* ---------- drobnosti ---------- */\n#pulse{position:absolute;inset:0;z-index:60;pointer-events:none;opacity:0;background:linear-gradient(100deg,transparent 20%,#36d8ff30 48%,#ff8b3e20 52%,transparent 80%)}\n#pulse.go{animation:shock 1.1s ease-out forwards}\n#toast{position:absolute;left:50%;bottom:6vmin;transform:translateX(-50%) translateY(20px);z-index:95;opacity:0;\n padding:14px 28px;background:#08131de6;border:1px solid #34576c;color:#cfe4f2;font:2.2vmin var(--mono);letter-spacing:1px;\n transition:opacity .3s,transform .3s;pointer-events:none;max-width:80vw;text-align:center}\n#toast.show{opacity:1;transform:translateX(-50%)}\n\n/* Cerna, dokud Android dokoncuje sve zhasinani - pod ni nesmi nic bezet. */\n.panel-root.oled-off{background:#000}\n.panel-root.oled-off > *{visibility:hidden!important;pointer-events:none!important}\n.panel-root.oled-off *{animation:none!important}\n\n@keyframes breath{0%,100%{opacity:.35}50%{opacity:1}}\n@keyframes spin{to{transform:rotate(360deg)}}\n@keyframes shock{0%{opacity:0;transform:translateX(-100%)}30%{opacity:1}100%{opacity:0;transform:translateX(100%)}}\n@keyframes reactorIn{from{opacity:0;transform:rotate(-160deg) scale(.6)}to{opacity:1;transform:rotate(0) scale(1)}}\n@keyframes bootOut{to{opacity:0;visibility:hidden;filter:blur(5px)}}\n@keyframes rise{from{opacity:0;transform:translateY(24px);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}\n.anim{animation:rise .7s cubic-bezier(.2,.75,.3,1) backwards}\n@keyframes ambIn{from{opacity:0}to{opacity:.5}}\n@keyframes ambientTravel{0%{transform:translate(-140px,-20px)}33%{transform:translate(100px,12px)}66%{transform:translate(-60px,20px)}100%{transform:translate(140px,-12px)}}\n@media(prefers-reduced-motion:reduce){\n *,*::before,*::after{animation:none!important;transition:none!important}\n #organism,#boot{display:none}\n}\n\n:host{display:block;position:relative;contain:content}\n.panel-root{position:relative;width:100%;overflow:hidden;border-radius:12px;background:#020507;color:#f2f8ff}\n#stage{position:absolute;top:0;left:0;transform-origin:top left;height:auto;min-height:0}\n#boot,#organism,#pulse,#toast,#editor,#picker,.overlay,#vhProbe{display:none!important}\n.bg,.scan{position:absolute;inset:0}\n";

/* ------------------------------------------------------------------
   Prevody a slova. Nic z toho nesaha na DOM, aby to sly testy spustit
   samostatne v Node.
   ------------------------------------------------------------------ */
'use strict';

var U = (function () {

  var DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

  /* Stupne stavu: barva a SLOVO. Slovo je povinne - barva sama o sobe
     je pro cast lidi neviditelna a pres pokoj se stejne splyva. */
  var TONES = {
    good:     { color: '#8af5bc', word: 'V normě' },
    warning:  { color: '#ffd064', word: 'Zvýšená' },
    serious:  { color: '#ff9863', word: 'Vysoká' },
    critical: { color: '#ff5369', word: 'Kritická' },
    info:     { color: '#36d8ff', word: 'Aktivní' },
    idle:     { color: '#7f8b99', word: '—' }
  };

  /* Bezne stavy entit cesky. Co tu neni, ukaze se tak, jak prislo. */
  var WORDS = {
    on: 'Zapnuto', off: 'Vypnuto', home: 'Doma', not_home: 'Pryč',
    open: 'Otevřeno', opening: 'Otevírá se', closed: 'Zavřeno', closing: 'Zavírá se',
    locked: 'Zamčeno', unlocked: 'Odemčeno', unavailable: 'Nedostupné', unknown: 'Neznámé',
    idle: 'Klid', playing: 'Hraje', paused: 'Pauza', standby: 'Pohotovost', buffering: 'Načítá',
    heat: 'Topí', cool: 'Chladí', heat_cool: 'Topí/chladí', auto: 'Automaticky',
    dry: 'Vysouší', fan_only: 'Ventilace', cleaning: 'Uklízí', docked: 'V doku',
    returning: 'Vrací se', charging: 'Nabíjí', discharging: 'Vybíjí', full: 'Nabito',
    armed_home: 'Zajištěno doma', armed_away: 'Zajištěno', disarmed: 'Odjištěno',
    triggered: 'Poplach', pending: 'Odpočet', above_horizon: 'Nad obzorem',
    below_horizon: 'Pod obzorem'
  };

  /* Binarni cidla mluvi podle toho, co hlidaji. */
  var BINARY = {
    motion: ['Pohyb', 'Klid'], occupancy: ['Obsazeno', 'Volno'],
    door: ['Otevřeno', 'Zavřeno'], window: ['Otevřeno', 'Zavřeno'],
    garage_door: ['Otevřeno', 'Zavřeno'], opening: ['Otevřeno', 'Zavřeno'],
    moisture: ['Vlhko', 'Sucho'], smoke: ['Kouř', 'Klid'], gas: ['Plyn', 'Klid'],
    problem: ['Závada', 'V pořádku'], safety: ['Nebezpečí', 'Bezpečno'],
    battery: ['Slabá', 'V pořádku'], presence: ['Doma', 'Pryč'],
    connectivity: ['Připojeno', 'Odpojeno'], running: ['Běží', 'Stojí'],
    power: ['Odběr', 'Klid'], sound: ['Zvuk', 'Ticho'], vibration: ['Otřesy', 'Klid'],
    lock: ['Odemčeno', 'Zamčeno'], plug: ['Zapojeno', 'Odpojeno'],
    light: ['Světlo', 'Tma'], update: ['Aktualizace', 'Aktuální']
  };

  /* Stavy pocasi cesky - entita weather.* je nese v anglictine. */
  var WEATHER = {
    'clear-night': 'Jasná noc', cloudy: 'Oblačno', fog: 'Mlha', hail: 'Krupobití',
    lightning: 'Bouřky', 'lightning-rainy': 'Bouřky s deštěm', partlycloudy: 'Polojasno',
    pouring: 'Vydatný déšť', rainy: 'Déšť', snowy: 'Sněžení', 'snowy-rainy': 'Déšť se sněhem',
    sunny: 'Jasno', windy: 'Větrno', 'windy-variant': 'Větrno', exceptional: 'Výjimečné'
  };

  /* Navrh rozsahu a stupnu podle druhu cidla - aby uzivatel po vybrani
     entity nemusel nic dopisovat. */
  var SUGGEST = {
    temperature: { min: 0, max: 35, caption: 'Teplota', decimals: 1,
      levels: [{ to: 18, tone: 'info', label: 'Chladno' }, { to: 24, tone: 'good', label: 'Příjemno' },
               { to: 28, tone: 'warning', label: 'Teplo' }, { to: null, tone: 'critical', label: 'Horko' }] },
    humidity: { min: 0, max: 100, caption: 'Vlhkost', decimals: 0,
      levels: [{ to: 30, tone: 'warning', label: 'Sucho' }, { to: 60, tone: 'good', label: 'V normě' },
               { to: 70, tone: 'warning', label: 'Vlhko' }, { to: null, tone: 'critical', label: 'Mokro' }] },
    battery: { min: 0, max: 100, caption: 'Baterie', decimals: 0,
      levels: [{ to: 15, tone: 'critical', label: 'Vybitá' }, { to: 30, tone: 'warning', label: 'Dochází' },
               { to: null, tone: 'good', label: 'V pořádku' }] },
    carbon_dioxide: { min: 400, max: 2000, caption: 'CO₂', decimals: 0,
      levels: [{ to: 800, tone: 'good', label: 'Čerstvo' }, { to: 1200, tone: 'warning', label: 'Vydýcháno' },
               { to: 1800, tone: 'serious', label: 'Těžký vzduch' }, { to: null, tone: 'critical', label: 'Vyvětrat' }] },
    pm25: { min: 0, max: 100, caption: 'Prach PM2,5', decimals: 0,
      levels: [{ to: 15, tone: 'good', label: 'Čisto' }, { to: 35, tone: 'warning', label: 'Zhoršeno' },
               { to: null, tone: 'critical', label: 'Špatné' }] },
    illuminance: { min: 0, max: 1000, caption: 'Osvětlení', decimals: 0, levels: [] },
    power: { min: 0, max: 3000, caption: 'Příkon', decimals: 0, levels: [] },
    energy: { min: 0, max: 100, caption: 'Spotřeba', decimals: 2, levels: [] },
    pressure: { min: 970, max: 1040, caption: 'Tlak', decimals: 0, levels: [] },
    signal_strength: { min: -100, max: -30, caption: 'Signál', decimals: 0, levels: [] }
  };

  /** Cislo z hodnoty, ktera muze byt text ("21,5 °C"). NaN, kdyz to cislo neni. */
  function num(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var m = String(v).replace(/ /g, ' ').match(/-?[\d\s.,]+/);
    if (!m) return NaN;
    var t = m[0].replace(/\s/g, '');
    if (t.indexOf('.') >= 0 && t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(',', '.');
    var x = parseFloat(t);
    return isNaN(x) ? NaN : x;
  }

  /* Cesky se pise desetinna carka - na panelu to musi sedet, jinak to
     pusobi jako chyba prekladu. */
  function fmt(v, d) {
    if (isNaN(v)) return '--';
    return v.toFixed(d === undefined || d === null ? 0 : d).replace('.', ',');
  }

  function pct(v, min, max) {
    if (isNaN(v) || max === min) return 0;
    return Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
  }

  /** Stupen podle prahu: prvni, do ktereho se hodnota vejde. */
  function level(value, levels) {
    if (isNaN(value) || !levels || !levels.length) return TONES.idle;
    for (var i = 0; i < levels.length; i++) {
      var l = levels[i];
      if (l.to === null || l.to === undefined || value <= l.to) {
        var t = TONES[l.tone] || TONES.idle;
        return { color: t.color, word: l.label || t.word, tone: l.tone || 'idle' };
      }
    }
    var last = levels[levels.length - 1];
    var lt = TONES[last.tone] || TONES.idle;
    return { color: lt.color, word: last.label || lt.word, tone: last.tone || 'idle' };
  }

  /** Slovo pro nenumericky stav. */
  function word(state, attrs) {
    var s = String(state === undefined || state === null ? '' : state);
    var dc = attrs && attrs.device_class;
    if (dc && BINARY[dc] && (s === 'on' || s === 'off')) return BINARY[dc][s === 'on' ? 0 : 1];
    if (WORDS[s]) return WORDS[s];
    if (!s) return '—';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }

  /**
   * Jak entitu ukazat. Vraci cislo i hotovy text, aby si dlazdice vybrala.
   * opt: {unit, decimals, attribute}
   */
  function display(st, opt) {
    opt = opt || {};
    if (!st) return { has: false, n: NaN, text: '—', unit: '', word: 'Nedostupné', live: false };
    var raw = opt.attribute ? (st.attributes || {})[opt.attribute] : st.state;
    var n = num(raw);
    var unit = opt.unit !== undefined && opt.unit !== null && opt.unit !== ''
      ? opt.unit
      : ((st.attributes || {}).unit_of_measurement || '');
    var dead = st.state === 'unavailable' || st.state === 'unknown' || raw === undefined;
    if (dead) return { has: false, n: NaN, text: '—', unit: '', word: word(st.state, st.attributes), live: false };
    if (!isNaN(n)) {
      var d = opt.decimals;
      if (d === undefined || d === null || d === '') d = Math.abs(n) >= 100 ? 0 : (Number.isInteger(n) ? 0 : 1);
      return { has: true, n: n, text: fmt(n, d), unit: unit, word: '', live: true };
    }
    return { has: true, n: NaN, text: word(raw, st.attributes), unit: '', word: word(raw, st.attributes), live: true };
  }

  /** Navrh nastaveni pro cerstve vybranou entitu. */
  function suggest(st) {
    var a = (st && st.attributes) || {};
    var base = SUGGEST[a.device_class];
    var out = {
      caption: '', unit: a.unit_of_measurement || '', min: 0, max: 100,
      decimals: null, levels: []
    };
    if (base) {
      out.caption = base.caption;
      out.min = base.min; out.max = base.max;
      out.decimals = base.decimals;
      out.levels = JSON.parse(JSON.stringify(base.levels));
    } else if (out.unit === '%') {
      out.min = 0; out.max = 100;
    } else if (!isNaN(num(st && st.state))) {
      var v = num(st.state);
      out.min = Math.min(0, Math.floor(v - Math.abs(v) - 10));
      out.max = Math.max(10, Math.ceil(v * 2));
    }
    return out;
  }

  function name(st, fallback) {
    if (fallback) return fallback;
    if (!st) return '—';
    if (st.attributes && st.attributes.friendly_name) return st.attributes.friendly_name;
    var id = st.entity_id || '';
    var dot = id.indexOf('.');
    return dot > 0 ? id.slice(dot + 1).replace(/_/g, ' ') : id;
  }

  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function clockTime(d, seconds) {
    return two(d.getHours()) + ':' + two(d.getMinutes()) + (seconds ? ':' + two(d.getSeconds()) : '');
  }
  function clockDate(d) {
    return DAYS[d.getDay()] + ' · ' + d.getDate() + '. ' + MONTHS[d.getMonth()];
  }

  /** "před 4 min" - jak cerstva je hodnota. */
  function ago(iso, now) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var s = Math.max(0, Math.round(((now || Date.now()) - t) / 1000));
    if (s < 60) return 'právě teď';
    var m = Math.round(s / 60);
    if (m < 60) return 'před ' + m + ' min';
    var h = Math.floor(m / 60);
    if (h < 24) return 'před ' + h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    var dd = Math.floor(h / 24);
    return 'před ' + dd + ' d' + (h % 24 ? ' ' + (h % 24) + ' h' : '');
  }

  /** Domena entity: "light.kuchyne" -> "light" */
  function domain(entityId) {
    var id = String(entityId || '');
    var i = id.indexOf('.');
    return i > 0 ? id.slice(0, i) : '';
  }

  /** Da se entita prepnout klepnutim? */
  var SWITCHABLE = ['light', 'switch', 'fan', 'input_boolean', 'script', 'scene',
                    'automation', 'cover', 'lock', 'media_player', 'siren', 'button'];
  function switchable(entityId) {
    return SWITCHABLE.indexOf(domain(entityId)) >= 0;
  }

  /** Sluzba pro klepnuti na dlazdici. */
  function tapService(entityId, state) {
    var d = domain(entityId);
    if (d === 'scene') return { domain: 'scene', service: 'turn_on' };
    if (d === 'script') return { domain: 'script', service: 'turn_on' };
    if (d === 'button') return { domain: 'button', service: 'press' };
    if (d === 'cover') return { domain: 'cover', service: state === 'open' ? 'close_cover' : 'open_cover' };
    if (d === 'lock') return { domain: 'lock', service: state === 'locked' ? 'unlock' : 'lock' };
    if (d === 'media_player') return { domain: 'media_player', service: 'media_play_pause' };
    if (SWITCHABLE.indexOf(d) >= 0) return { domain: d === 'input_boolean' ? 'input_boolean' : d, service: 'toggle' };
    return null;
  }

  /** Pocasi: slovo o stavu a teplota z atributu. */
  function weather(st) {
    if (!st) return null;
    var a = st.attributes || {};
    return {
      word: WEATHER[st.state] || word(st.state),
      temp: num(a.temperature),
      unit: a.temperature_unit || '°C'
    };
  }

  return {
    DAYS: DAYS, MONTHS: MONTHS, TONES: TONES, WORDS: WORDS, BINARY: BINARY,
    SUGGEST: SUGGEST, WEATHER: WEATHER, weather: weather,
    num: num, fmt: fmt, pct: pct, level: level, word: word, display: display,
    suggest: suggest, name: name, clockTime: clockTime, clockDate: clockDate, ago: ago,
    domain: domain, switchable: switchable, tapService: tapService
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = U;


/* ------------------------------------------------------------------
   Rozvrzeni panelu: co se kde ukazuje.

   Tvar dat je zamerne plochy a citelny - uzivatel ho muze zkopirovat,
   poslat na druhy tablet a tam vlozit. Vsechno, co editor uklada, projde
   pres Layout.normalize(), takze panel nikdy nedostane rozbity vstup.
   ------------------------------------------------------------------ */
'use strict';

var Layout = (function () {

  var VERSION = 1;
  var TONES = ['cyan', 'amber', 'green', 'violet', 'red'];

  /* Jak se hodnota kresli.
       gauge  - budik (vychozi)
       bar    - svisly sloupec
       graph  - krivka za poslednich N hodin
       number - jen velke cislo
     Dlazdice a ukazatele znaji value / bar / graph. */
  var CARD_VIEWS = ['gauge', 'bar', 'graph', 'number', 'camera',
                    'forecast', 'calendar', 'todo'];
  var ITEM_VIEWS = ['value', 'bar', 'graph', 'camera'];

  /* Kolik se toho vejde. Vic sekci = mensi okna, o tom rozhoduje uzivatel. */
  var MAX_CARDS = 6, MAX_PANELS = 4, MAX_ITEMS = 8, MAX_METERS = 4, MAX_TILES = 6;
  var MAX_AMBIENT = 4, MAX_PAGES = 5;

  function id(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 8);
  }

  function str(v, def) {
    return (typeof v === 'string' && v.trim() !== '') ? v : (def === undefined ? '' : def);
  }

  function nOr(v, def) {
    var x = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(x) ? x : def;
  }

  function tone(v, def) {
    return TONES.indexOf(v) >= 0 ? v : (def || 'cyan');
  }

  /** Prazdny panel - to, co uzivatel uvidi pred prvni upravou. */
  function empty() {
    return { v: VERSION, title: '', subtitle: '', weather: '',
             pages: [newPage('Panel')],
             ambient: emptyAmbient(), alert: null, doorbell: null,
             control: { screen: '', brightness: '' } };
  }

  /** Stranka = jedna obrazovka panelu; prejizdi se mezi nimi prstem. */
  function newPage(name) {
    return { id: id('page'), name: name || 'Nová stránka',
             grid: { cols: 0, rows: 0 }, panelGrid: { cols: 0 },
             cards: [], panels: [] };
  }

  function emptyAmbient() {
    return { cells: [], line: [], auto: true };
  }

  /** 0 = at si rozvrzeni poradi samo podle poctu oken. */
  function count(v, max) {
    var n = Math.round(nOr(v, 0));
    return n >= 1 && n <= max ? n : 0;
  }

  function newCard() {
    return {
      id: id('card'), name: 'Nová sekce', code: '', tone: 'cyan', view: 'gauge', hours: 6,
      refresh: 10, count: 5, days: 7,
      dial: { entity: '', caption: '', unit: '', min: 0, max: 100, decimals: null, levels: [] },
      meters: [], tiles: []
    };
  }

  function newPanel() {
    return { id: id('panel'), name: 'Nový panel', tone: 'green', items: [] };
  }

  function newItem(entity) {
    return { entity: entity || '', name: '', unit: '', attribute: '', decimals: null,
             tap: 'auto', view: 'value', hours: 6, min: 0, max: 100, levels: [] };
  }

  /* ---------- kontrola a doplneni ---------- */

  function normLevels(raw) {
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && i < 6; i++) {
      var l = raw[i] || {};
      var to = (l.to === null || l.to === undefined || l.to === '') ? null : nOr(l.to, null);
      out.push({
        to: to,
        tone: ['good', 'warning', 'serious', 'critical', 'info', 'idle'].indexOf(l.tone) >= 0 ? l.tone : 'good',
        label: str(l.label, '')
      });
    }
    // Prahy musi jit vzestupne, jinak by se stupne prekryvaly. Posledni
    // (otevreny) zustava na konci.
    var open = out.filter(function (l) { return l.to === null; });
    var closed = out.filter(function (l) { return l.to !== null; })
                    .sort(function (a, b) { return a.to - b.to; });
    return closed.concat(open.slice(0, 1));
  }

  function normItem(raw) {
    var r = raw || {};
    var min = nOr(r.min, 0), max = nOr(r.max, 100);
    if (max <= min) max = min + 1;
    return {
      entity: str(r.entity, ''),
      name: str(r.name, ''),
      unit: str(r.unit, ''),
      attribute: str(r.attribute, ''),
      decimals: (r.decimals === null || r.decimals === undefined || r.decimals === '') ? null : Math.max(0, Math.min(3, nOr(r.decimals, 0))),
      // auto = podle druhu entity, detail = okno s ovladanim
      tap: ['auto', 'none', 'toggle', 'detail'].indexOf(r.tap) >= 0 ? r.tap : 'auto',
      // "bar: true" je starsi zapis (a zkratka v konfiguraci karty),
      // ktery znamena totez co view: bar.
      view: ITEM_VIEWS.indexOf(r.view) >= 0 ? r.view : (r.bar ? 'bar' : 'value'),
      hours: Math.max(1, Math.min(72, nOr(r.hours, 6))),
      min: min, max: max,
      levels: normLevels(r.levels)
    };
  }

  function normCard(raw) {
    var r = raw || {};
    var d = r.dial || {};
    var min = nOr(d.min, 0), max = nOr(d.max, 100);
    if (max <= min) max = min + 1;
    return {
      id: str(r.id, id('card')),
      name: str(r.name, 'Sekce'),
      code: str(r.code, '').slice(0, 4),
      tone: tone(r.tone),
      view: CARD_VIEWS.indexOf(r.view) >= 0 ? r.view : 'gauge',
      hours: Math.max(1, Math.min(72, nOr(r.hours, 6))),
      // jak casto se obnovi snimek z kamery (s)
      refresh: Math.max(2, Math.min(120, nOr(r.refresh, 10))),
      // kolik radku ma seznam (predpoved, kalendar, ukoly)
      count: Math.max(1, Math.min(10, nOr(r.count, 5))),
      // jak daleko dopredu se ctou udalosti v kalendari (dny)
      days: Math.max(1, Math.min(14, nOr(r.days, 7))),
      dial: {
        entity: str(d.entity, ''),
        caption: str(d.caption, ''),
        unit: str(d.unit, ''),
        attribute: str(d.attribute, ''),
        decimals: (d.decimals === null || d.decimals === undefined || d.decimals === '') ? null : Math.max(0, Math.min(3, nOr(d.decimals, 0))),
        min: min, max: max,
        levels: normLevels(d.levels)
      },
      // Ukazatel vedle budiku ma pruh, dokud si uzivatel nerekne o graf.
      meters: (Array.isArray(r.meters) ? r.meters : []).slice(0, MAX_METERS).map(function (m) {
        var it = normItem(m);
        if (it.view === 'value') it.view = 'bar';
        return it;
      }),
      tiles: (Array.isArray(r.tiles) ? r.tiles : []).slice(0, MAX_TILES).map(normItem)
    };
  }

  function normPanel(raw) {
    var r = raw || {};
    return {
      id: str(r.id, id('panel')),
      name: str(r.name, 'Panel'),
      tone: tone(r.tone, 'green'),
      items: (Array.isArray(r.items) ? r.items : []).slice(0, MAX_ITEMS).map(normItem)
    };
  }

  function normPage(raw, fallbackName) {
    var r = raw || {};
    return {
      id: str(r.id, id('page')),
      name: str(r.name, fallbackName || 'Panel'),
      // Kolik oken na radek a kolik rad - 0 znamena automaticky.
      grid: { cols: count((r.grid || {}).cols, 4), rows: count((r.grid || {}).rows, 3) },
      panelGrid: { cols: count((r.panelGrid || {}).cols, MAX_PANELS) },
      cards: (Array.isArray(r.cards) ? r.cards : []).slice(0, MAX_CARDS).map(normCard),
      panels: (Array.isArray(r.panels) ? r.panels : []).slice(0, MAX_PANELS).map(normPanel)
    };
  }

  /** Jediny vstupni bod: cokoli prijde, odejde platne rozvrzeni. */
  function normalize(raw) {
    var r = raw || {};
    if (typeof r === 'string') {
      try { r = JSON.parse(r); } catch (e) { r = {}; }
    }
    // Drive mel panel jedinou obrazovku (cards a panels primo v korenu).
    // Starsi rozvrzeni se z ni stane prvni strankou.
    var pages = Array.isArray(r.pages) && r.pages.length ? r.pages : [{
      name: 'Panel', grid: r.grid, panelGrid: r.panelGrid,
      cards: r.cards, panels: r.panels
    }];

    var out = {
      v: VERSION,
      title: str(r.title, ''),
      subtitle: str(r.subtitle, ''),
      // Pocasi v zahlavi - u panelu na zdi to je jedna z mala veci,
      // kvuli kterym k nemu clovek opravdu dojde.
      weather: str(r.weather, ''),
      pages: pages.slice(0, MAX_PAGES).map(function (p, i) {
        return normPage(p, i === 0 ? 'Panel' : 'Stránka ' + (i + 1));
      }),
      ambient: emptyAmbient(),
      alert: null,
      // Zvonek u dveri: kdyz cidlo naskoci, panel ukaze kameru.
      doorbell: null,
      // Ovladani tabletu z Home Assistantu: prepinac pro displej a
      // cislo pro jas. Panel je jen posloucha, sam je nemeni.
      control: {
        screen: str((r.control || {}).screen, ''),
        brightness: str((r.control || {}).brightness, '')
      }
    };

    var a = r.ambient || {};
    // Drive byly v klidovem rezimu presne dve hodnoty (left a right),
    // ted je to seznam - starsi rozvrzeni se prevede.
    var cells = Array.isArray(a.cells) ? a.cells.slice() : [];
    if (!cells.length) {
      if (a.left) cells.push(a.left);
      if (a.right) cells.push(a.right);
    }
    out.ambient.cells = cells.slice(0, MAX_AMBIENT)
      .map(normItem).filter(function (i) { return i.entity; });
    // Bez vlastniho vyberu prevezme klidovy rezim hodnoty ze sekci.
    out.ambient.auto = a.auto !== false;
    out.ambient.line = (Array.isArray(a.line) ? a.line : []).slice(0, 3)
      .map(normItem).filter(function (i) { return i.entity; });

    if (r.alert && r.alert.entity) {
      out.alert = {
        entity: str(r.alert.entity, ''),
        name: str(r.alert.name, 'Upozornění'),
        on: str(r.alert.on, 'on'),
        attribute: str(r.alert.attribute, ''),
        note: str(r.alert.note, '')
      };
    }

    if (r.doorbell && r.doorbell.camera && r.doorbell.trigger) {
      out.doorbell = {
        camera: str(r.doorbell.camera, ''),
        trigger: str(r.doorbell.trigger, ''),
        name: str(r.doorbell.name, 'Zvonek'),
        seconds: Math.max(5, Math.min(300, nOr(r.doorbell.seconds, 30)))
      };
    }
    return out;
  }

  /** Vsechny sekce a panely napric strankami. */
  function allCards(l) {
    var out = [];
    (l.pages || []).forEach(function (p) { out = out.concat(p.cards || []); });
    return out;
  }

  function allPanels(l) {
    var out = [];
    (l.pages || []).forEach(function (p) { out = out.concat(p.panels || []); });
    return out;
  }

  /** Vsechny entity, na kterych rozvrzeni stoji - pro kontrolu dostupnosti. */
  function entities(l) {
    var out = [];
    function add(e) { if (e && out.indexOf(e) < 0) out.push(e); }
    allCards(l).forEach(function (c) {
      add(c.dial.entity);
      (c.meters || []).forEach(function (m) { add(m.entity); });
      (c.tiles || []).forEach(function (t) { add(t.entity); });
    });
    allPanels(l).forEach(function (p) {
      (p.items || []).forEach(function (i) { add(i.entity); });
    });
    if (l.ambient) {
      (l.ambient.cells || []).forEach(function (i) { add(i.entity); });
      (l.ambient.line || []).forEach(function (i) { add(i.entity); });
    }
    if (l.alert) add(l.alert.entity);
    if (l.control) { add(l.control.screen); add(l.control.brightness); }
    if (l.weather) add(l.weather);
    if (l.doorbell) { add(l.doorbell.camera); add(l.doorbell.trigger); }
    return out;
  }

  /**
   * Sekce, ktere nestoji na stavu entity, ale na datech navic:
   * predpoved pocasi, kalendar a seznam ukolu.
   */
  function feeds(l) {
    var out = [];
    allCards(l).forEach(function (c) {
      if (['forecast', 'calendar', 'todo'].indexOf(c.view) < 0) return;
      if (!c.dial.entity) return;
      out.push({ kind: c.view, entity: c.dial.entity, count: c.count, days: c.days });
    });
    return out;
  }

  /** Entity, ktere potrebuji historii (krivku), i s delkou okna v hodinach. */
  function graphed(l) {
    var out = [];
    function add(entity, hours) {
      if (!entity) return;
      for (var i = 0; i < out.length; i++) {
        if (out[i].entity === entity) {
          out[i].hours = Math.max(out[i].hours, hours);
          return;
        }
      }
      out.push({ entity: entity, hours: hours });
    }
    allCards(l).forEach(function (c) {
      if (c.view === 'graph') add(c.dial.entity, c.hours);
      (c.meters || []).concat(c.tiles || []).forEach(function (i) {
        if (i.view === 'graph') add(i.entity, i.hours);
      });
    });
    allPanels(l).forEach(function (p) {
      (p.items || []).forEach(function (i) {
        if (i.view === 'graph') add(i.entity, i.hours);
      });
    });
    return out;
  }

  function isEmpty(l) {
    return !l || (allCards(l).length === 0 && allPanels(l).length === 0);
  }

  /**
   * Prvni rozvrzeni sestavene z toho, co v Home Assistantu opravdu je.
   * Lepsi nez prazdna obrazovka: uzivatel hned vidi sve hodnoty a jen je
   * prejmenuje nebo vymeni.
   */
  function fromStates(states) {
    var list = [];
    for (var k in states) if (Object.prototype.hasOwnProperty.call(states, k)) list.push(states[k]);

    function pick(deviceClass, limit) {
      return list.filter(function (s) {
        return (s.attributes || {}).device_class === deviceClass
            && !isNaN(parseFloat(s.state));
      }).slice(0, limit || 4);
    }

    var l = empty();
    var page = l.pages[0];
    var temps = pick('temperature', 2);
    var hums = pick('humidity', 2);
    var bats = pick('battery', 4);

    temps.forEach(function (t, i) {
      var c = newCard();
      var sug = U.suggest(t);
      c.name = (U.name(t) || 'Teplota').toUpperCase().slice(0, 18);
      c.code = 'T' + (i + 1);
      c.tone = i === 0 ? 'cyan' : 'amber';
      c.dial.entity = t.entity_id;
      c.dial.caption = sug.caption || 'Teplota';
      c.dial.min = sug.min; c.dial.max = sug.max;
      c.dial.decimals = sug.decimals;
      c.dial.levels = sug.levels;
      if (hums[i]) {
        var m = newItem(hums[i].entity_id);
        m.name = 'Vlhkost'; m.bar = true; m.min = 0; m.max = 100;
        c.meters.push(m);
      }
      page.cards.push(c);
    });

    if (bats.length) {
      var p = newPanel();
      p.name = 'Baterie';
      p.tone = 'green';
      p.items = bats.map(function (b) {
        var it = newItem(b.entity_id);
        it.name = U.name(b);
        it.bar = true; it.min = 0; it.max = 100;
        it.levels = U.suggest(b).levels;
        return it;
      });
      page.panels.push(p);
    }

    var lights = list.filter(function (s) { return U.domain(s.entity_id) === 'light'; }).slice(0, 4);
    if (lights.length) {
      var lp = newPanel();
      lp.name = 'Světla';
      lp.tone = 'amber';
      lp.items = lights.map(function (s) {
        var it = newItem(s.entity_id);
        it.name = U.name(s);
        return it;
      });
      page.panels.push(lp);
    }

    // I v klidovem rezimu plati "barva a slovo" - stupne tedy jedou s sebou.
    function ambItem(st) {
      var sug = U.suggest(st);
      return normItem({ entity: st.entity_id, name: U.name(st), levels: sug.levels,
                        decimals: sug.decimals });
    }
    if (temps[0]) l.ambient.cells.push(ambItem(temps[0]));
    if (temps[1] || hums[0]) l.ambient.cells.push(ambItem(temps[1] || hums[0]));
    return normalize(l);
  }

  /**
   * Klidovy rezim bez vlastniho nastaveni ukaze hlavni hodnoty sekci -
   * jinak by po uspani tabletu zustaly jen hodiny.
   */
  function ambientFallback(l) {
    if (!l || !l.ambient || !l.ambient.auto) return l;
    if (l.ambient.cells && l.ambient.cells.length) return l;
    var cells = [];
    allCards(l).forEach(function (c) {
      if (!c.dial.entity || cells.length >= MAX_AMBIENT) return;
      var it = normItem({
        entity: c.dial.entity, name: c.name, unit: c.dial.unit,
        attribute: c.dial.attribute, decimals: c.dial.decimals, levels: c.dial.levels
      });
      cells.push(it);
    });
    l.ambient.cells = cells;
    return l;
  }

  return {
    VERSION: VERSION, TONES: TONES, ambientFallback: ambientFallback,
    empty: empty, newCard: newCard, newPanel: newPanel, newItem: newItem,
    normalize: normalize, entities: entities, graphed: graphed, feeds: feeds,
    isEmpty: isEmpty,
    fromStates: fromStates, id: id, newPage: newPage,
    allCards: allCards, allPanels: allPanels,
    CARD_VIEWS: CARD_VIEWS, ITEM_VIEWS: ITEM_VIEWS,
    MAX_CARDS: MAX_CARDS, MAX_PANELS: MAX_PANELS, MAX_ITEMS: MAX_ITEMS,
    MAX_METERS: MAX_METERS, MAX_TILES: MAX_TILES, MAX_AMBIENT: MAX_AMBIENT,
    MAX_PAGES: MAX_PAGES
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Layout;


/* ------------------------------------------------------------------
   Historie hodnot pro krivky.

   Home Assistant umi poslat prubeh entity za posledni hodiny jednim
   dotazem (history/history_during_period). Panel si ho vyzada jen pro
   entity, ktere maji nastaveny graf, a pak uz krivku doplnuje ze
   stejnych zmen stavu, ktere stejne chodi kvuli cislum - server se tedy
   nepta porad dokola.

   Store dostava funkci send(zprava) -> Promise, takze je jedno, jestli
   bezi v aplikaci (WebSocket) nebo v karte pro Lovelace (hass.callWS).
   ------------------------------------------------------------------ */
'use strict';

var History = (function () {

  var REFRESH_MS = 5 * 60 * 1000;   // cely prubeh znovu jednou za pet minut
  var RETRY_MS = 15 * 1000;         // po neuspechu (jeste nebylo spojeni) brzy znovu
  var MAX_POINTS = 300;             // vic bodu displej stejne nerozliseni

  function Store(send) {
    this.send = send;
    this.series = {};      // entity -> [{t, v}]
    this.want = [];        // [{entity, hours}]
    this.onData = null;    // (entity, body) -> void
    this.timer = null;
    this.retry = null;
    this.busy = false;
    this.again = false;
  }

  /** Ktere entity a jak dlouhou historii panel potrebuje. */
  Store.prototype.set = function (want) {
    this.want = (want || []).slice(0, 12);
    var keep = {};
    this.want.forEach(function (w) { keep[w.entity] = true; });
    for (var e in this.series) if (!keep[e]) delete this.series[e];
    if (this.want.length) this.refresh();
  };

  Store.prototype.start = function () {
    var self = this;
    this.stop();
    this.timer = setInterval(function () { self.refresh(); }, REFRESH_MS);
    this.refresh();
  };

  Store.prototype.stop = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.retry) { clearTimeout(this.retry); this.retry = null; }
  };

  Store.prototype.get = function (entity) {
    return this.series[entity] || null;
  };

  /**
   * Ziva zmena stavu. Bod se pripoji na konec, takze krivka roste hned,
   * ne az pri dalsim dotazu na server.
   */
  Store.prototype.push = function (entity, state, whenMs) {
    var s = this.series[entity];
    if (!s) return false;
    var v = U.num(state);
    if (isNaN(v)) return false;
    var t = whenMs || Date.now();
    var last = s[s.length - 1];
    if (last && t - last.t < 1000) { last.v = v; }
    else s.push({ t: t, v: v });
    this.trim(entity);
    return true;
  };

  /** Zahodi, co uz vypadlo z okna, a zridi pocet bodu. */
  Store.prototype.trim = function (entity) {
    var w = null;
    for (var i = 0; i < this.want.length; i++) {
      if (this.want[i].entity === entity) { w = this.want[i]; break; }
    }
    var hours = w ? w.hours : 6;
    var from = Date.now() - hours * 3600 * 1000;
    var s = this.series[entity].filter(function (p) { return p.t >= from; });
    if (s.length > MAX_POINTS * 2) {
      var step = Math.ceil(s.length / MAX_POINTS);
      var out = [];
      for (var j = 0; j < s.length; j += step) out.push(s[j]);
      if (out[out.length - 1] !== s[s.length - 1]) out.push(s[s.length - 1]);
      s = out;
    }
    this.series[entity] = s;
  };

  Store.prototype.refresh = function () {
    if (!this.send || !this.want.length) return;
    // Dotaz uz bezi: zapamatovat si, ze mezitim prisel dalsi duvod se
    // zeptat (treba zmena rozvrzeni), a zeptat se hned po dobehnuti.
    if (this.busy) { this.again = true; return; }
    var self = this;
    this.busy = true;

    // Jeden dotaz na vsechno: entity se lisi jen delkou okna, takze se
    // vezme to nejdelsi a kratsi krivky se pak jen orezou.
    var hours = this.want.reduce(function (m, w) { return Math.max(m, w.hours); }, 1);
    var ids = this.want.map(function (w) { return w.entity; });
    var start = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    function take(result) {
      if (!result) return;
      ids.forEach(function (id) {
        var raw = result[id];
        if (!raw || !raw.length) return;
        self.series[id] = parse(raw);
        self.trim(id);
        if (self.onData) { try { self.onData(id, self.series[id]); } catch (e) {} }
      });
    }

    // Dokud neni spojeni, dotaz skonci chybou - pak se zkusi za chvili
    // znovu, ne az za pet minut s prazdnymi krivkami na obrazovce.
    function settle(ok) {
      self.busy = false;
      if (self.again) {
        self.again = false;
        setTimeout(function () { self.refresh(); }, 0);
        return;
      }
      if (!ok) self.retryLater();
    }

    try {
      var p = this.send({
        type: 'history/history_during_period',
        start_time: start,
        end_time: new Date().toISOString(),
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false
      });
      if (p && p.then) {
        p.then(function (r) { take(r); settle(true); }, function () { settle(false); });
      } else {
        settle(false);
      }
    } catch (e) {
      settle(false);
    }
  };

  Store.prototype.retryLater = function () {
    if (this.retry || !this.want.length) return;
    var self = this;
    this.retry = setTimeout(function () {
      self.retry = null;
      self.refresh();
    }, RETRY_MS);
  };

  /**
   * Home Assistant posila zhustenou podobu: s = stav, lu = cas v
   * sekundach. Starsi verze posilaji plne nazvy - umime obojí.
   */
  function parse(raw) {
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var r = raw[i];
      var state = r.s !== undefined ? r.s : r.state;
      var when = r.lu !== undefined ? r.lu : (r.last_updated || r.last_changed);
      var v = U.num(state);
      if (isNaN(v)) continue;
      var t = typeof when === 'number' ? when * 1000 : Date.parse(when);
      if (isNaN(t)) continue;
      out.push({ t: t, v: v });
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  return { Store: Store, parse: parse, MAX_POINTS: MAX_POINTS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = History;


/* ------------------------------------------------------------------
   Data, ktera nejsou "stav entity": predpoved pocasi, ukoly na seznamu
   a udalosti v kalendari.

   Home Assistant je podava tremi ruznymi zpusoby a tady jsou schovane
   za jedno rozhrani:

     predpoved  weather/subscribe_forecast   - trvaly odber, chodi sama
     ukoly      todo/item/subscribe          - trvaly odber, chodi samy
     kalendar   calendar.get_events          - sluzba s odpovedi, ta se
                                               musi vyzadat (kazdych 10 min)

   Store dostava sadu funkci (send, subscribe), takze je jedno, jestli
   bezi v aplikaci (WebSocket) nebo v karte pro Lovelace (hass).
   ------------------------------------------------------------------ */
'use strict';

var Feeds = (function () {

  var CALENDAR_MS = 10 * 60 * 1000;   // kalendar se za deset minut nezmeni
  var RETRY_MS = 20 * 1000;

  function Store(api) {
    this.api = api || {};       // { subscribe(msg, cb) -> id, unsubscribe(id), events(entity, days) -> Promise }
    this.want = [];             // [{kind, entity, count, days}]
    this.data = {};             // "kind|entity" -> data
    this.subs = [];             // cisla odberu
    this.onData = null;
    this.timer = null;
  }

  function key(kind, entity) { return kind + '|' + entity; }

  Store.prototype.get = function (kind, entity) {
    return this.data[key(kind, entity)] || null;
  };

  Store.prototype.set = function (want) {
    this.want = (want || []).slice(0, 8);
    this.restart();
  };

  /** Po spojeni (a po kazdem vypadku) se odbery zridi znovu. */
  Store.prototype.restart = function () {
    this.stopSubs();
    var self = this;
    this.want.forEach(function (w) {
      if (w.kind === 'forecast') self.subForecast(w);
      else if (w.kind === 'todo') self.subTodo(w);
    });
    this.pollCalendars();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(function () { self.pollCalendars(); }, CALENDAR_MS);
  };

  Store.prototype.stop = function () {
    this.stopSubs();
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  };

  Store.prototype.stopSubs = function () {
    var self = this;
    this.subs.forEach(function (id) {
      try { if (self.api.unsubscribe) self.api.unsubscribe(id); } catch (e) {}
    });
    this.subs = [];
  };

  Store.prototype.push = function (kind, entity, value) {
    this.data[key(kind, entity)] = value;
    if (this.onData) {
      try { this.onData(kind, entity, value); } catch (e) {}
    }
  };

  /* ---------- predpoved pocasi ---------- */

  Store.prototype.subForecast = function (w) {
    if (!this.api.subscribe) return;
    var self = this;
    var id = this.api.subscribe({
      type: 'weather/subscribe_forecast',
      entity_id: w.entity,
      forecast_type: 'daily'
    }, function (ev) {
      if (!ev || !ev.forecast) return;
      self.push('forecast', w.entity, ev.forecast.slice(0, 10));
    });
    if (id > 0) this.subs.push(id);
  };

  /* ---------- ukoly ---------- */

  Store.prototype.subTodo = function (w) {
    if (!this.api.subscribe) return;
    var self = this;
    var id = this.api.subscribe({
      type: 'todo/item/subscribe',
      entity_id: w.entity
    }, function (ev) {
      if (!ev || !ev.items) return;
      self.push('todo', w.entity, ev.items);
    });
    if (id > 0) this.subs.push(id);
  };

  /* ---------- kalendar ---------- */

  Store.prototype.pollCalendars = function () {
    var self = this;
    this.want.forEach(function (w) {
      if (w.kind !== 'calendar' || !self.api.events) return;
      var days = Math.max(1, Math.min(14, w.days || 7));
      var p = self.api.events(w.entity, days);
      if (!p || !p.then) return;
      p.then(function (res) {
        var box = res && res[w.entity];
        var list = box && box.events ? box.events : [];
        self.push('calendar', w.entity, list.slice(0, 12));
      }, function () {
        // Jeste nebylo spojeni - za chvili znovu.
        setTimeout(function () { self.pollCalendars(); }, RETRY_MS);
      });
    });
  };

  /* ---------- prevody pro vykresleni ---------- */

  var DAY_SHORT = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];

  /** Predpoved -> radky {den, stav, max, min} */
  function forecastRows(forecast, count) {
    var out = [];
    (forecast || []).slice(0, count || 5).forEach(function (f) {
      var t = Date.parse(f.datetime);
      var d = isNaN(t) ? null : new Date(t);
      out.push({
        day: d ? DAY_SHORT[d.getDay()] : '—',
        date: d ? d.getDate() + '.' + (d.getMonth() + 1) + '.' : '',
        word: U.WEATHER[f.condition] || U.word(f.condition),
        hi: U.num(f.temperature),
        lo: U.num(f.templow),
        rain: U.num(f.precipitation_probability)
      });
    });
    return out;
  }

  /** Udalosti -> radky {kdy, nazev, cely den} serazene od nejblizsi */
  function eventRows(events, count) {
    var now = Date.now();
    var out = [];
    (events || []).forEach(function (e) {
      var start = e.start || '';
      var allDay = start.length === 10;            // "2026-09-20" bez casu
      var t = Date.parse(allDay ? start + 'T00:00:00' : start);
      if (isNaN(t)) return;
      var endT = Date.parse(e.end && e.end.length === 10 ? e.end + 'T23:59:59' : e.end);
      if (!isNaN(endT) && endT < now) return;      // co skoncilo, uz nezajima
      out.push({ t: t, when: whenLabel(t, allDay, now), name: e.summary || '(bez názvu)',
                 allDay: allDay, location: e.location || '' });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out.slice(0, count || 5);
  }

  /** "dnes 18:30", "zítra", "pá 14:00" */
  function whenLabel(t, allDay, now) {
    var d = new Date(t), n = new Date(now || Date.now());
    var sameDay = function (a, b) {
      return a.getDate() === b.getDate() && a.getMonth() === b.getMonth()
          && a.getFullYear() === b.getFullYear();
    };
    var time = allDay ? '' : U.clockTime(d, false);
    if (sameDay(d, n)) return allDay ? 'dnes' : 'dnes ' + time;
    if (sameDay(d, new Date(n.getTime() + 86400000))) return allDay ? 'zítra' : 'zítra ' + time;
    var day = DAY_SHORT[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.';
    return allDay ? day : day + ' ' + time;
  }

  /** Ukoly -> jen nesplnene, serazene tak, jak prisly */
  function todoRows(items, count) {
    return (items || []).filter(function (i) {
      return i.status !== 'completed';
    }).slice(0, count || 6).map(function (i) {
      return { uid: i.uid, name: i.summary || '(bez názvu)', due: i.due || '' };
    });
  }

  return {
    Store: Store, forecastRows: forecastRows, eventRows: eventRows,
    todoRows: todoRows, whenLabel: whenLabel, DAY_SHORT: DAY_SHORT
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Feeds;


/* ------------------------------------------------------------------
   Z rozvrzeni udela obrazovku a pak uz jen prepisuje hodnoty.

   Postup: build() jednou postavi prvky a ke kazdemu si poznamena, ktera
   entita ho plni (vazba). Kazda zmena stavu pak prepise jen text v tech
   nekolika prvcich - nic se neprekresluje znovu, takze panel neblika a
   na levnem tabletu nezere proud.
   ------------------------------------------------------------------ */
'use strict';

var Render = (function () {

  /* ---------- budik ---------- */
  var SEG = 56, GAP = 1.4, SPAN = 264, START = 138, R_OUT = 148, R_IN = 128;

  function dialPaths() {
    var s = '', cx = 159, cy = 159, w = SPAN / SEG;
    for (var i = 0; i < SEG; i++) {
      var a0 = (START + i * w + GAP / 2) * Math.PI / 180;
      var a1 = (START + (i + 1) * w - GAP / 2) * Math.PI / 180;
      s += '<path d="M ' + (cx + R_IN * Math.cos(a0)).toFixed(2) + ' ' + (cy + R_IN * Math.sin(a0)).toFixed(2)
        + ' L ' + (cx + R_OUT * Math.cos(a0)).toFixed(2) + ' ' + (cy + R_OUT * Math.sin(a0)).toFixed(2)
        + ' A ' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + (cx + R_OUT * Math.cos(a1)).toFixed(2) + ' ' + (cy + R_OUT * Math.sin(a1)).toFixed(2)
        + ' L ' + (cx + R_IN * Math.cos(a1)).toFixed(2) + ' ' + (cy + R_IN * Math.sin(a1)).toFixed(2)
        + ' A ' + R_IN + ' ' + R_IN + ' 0 0 0 ' + (cx + R_IN * Math.cos(a0)).toFixed(2) + ' ' + (cy + R_IN * Math.sin(a0)).toFixed(2)
        + ' Z" fill="#141d28"/>';
    }
    return s;
  }

  function setSeg(group, ratio, color) {
    var paths = group.children;
    var p = isNaN(ratio) ? 0 : Math.max(0, Math.min(1, ratio));
    var lit = Math.round(p * SEG);
    for (var i = 0; i < paths.length; i++) {
      var on = i < lit;
      paths[i].setAttribute('fill', on ? color : '#141d28');
      paths[i].style.opacity = on ? (0.65 + 0.35 * (i / Math.max(1, lit))) : 1;
    }
  }

  /* ---------- krivka ----------
     Kresli se do SVG s pevnou soustavou 0-100 v obou smerech, ktera se
     roztahne na plochu. Cary proto maji non-scaling-stroke (v CSS) a
     popisky jsou HTML vedle SVG - roztazene pismo by bylo necitelne. */
  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /**
   * Krivka. Cary se kresli do SVG s pevnou soustavou 0-100, ktera se
   * roztahne na plochu (proto non-scaling-stroke v CSS), ale bod
   * posledni hodnoty a popisky stupnice jsou HTML - v roztazenem SVG by
   * se z kolecka stal ovál a z pisma paskvil.
   */
  function makeChart(opts) {
    opts = opts || {};
    var box = el('div', 'chartbox' + (opts.scales ? ' scaled' : ''));
    var svg = svgEl('svg', { 'class': 'chart', viewBox: '0 0 100 100',
                             preserveAspectRatio: 'none' });
    var grid = svgEl('g', { 'class': 'gridlines' });
    var area = svgEl('path', { 'class': 'area', d: '' });
    var line = svgEl('path', { 'class': 'line', d: '' });
    svg.appendChild(grid); svg.appendChild(area); svg.appendChild(line);
    box.appendChild(svg);

    var dot = el('i', 'cdot');
    box.appendChild(dot);

    var ylab = null, xlab = null;
    if (opts.scales) {
      ylab = el('div', 'cy');
      xlab = el('div', 'cx');
      box.appendChild(ylab);
      box.appendChild(xlab);
    }

    /** series = [{t,v}]; vraci skutecny rozsah hodnot, nebo null */
    function draw(series, hours, decimals) {
      hours = hours || 6;
      if (!series || series.length < 2) {
        area.setAttribute('d', '');
        line.setAttribute('d', '');
        grid.innerHTML = '';
        dot.style.display = 'none';
        if (ylab) ylab.innerHTML = '';
        if (xlab) xlab.innerHTML = '';
        return null;
      }
      var t1 = Date.now(), t0 = t1 - hours * 3600000;
      var lo = Infinity, hi = -Infinity;
      series.forEach(function (p) { if (p.v < lo) lo = p.v; if (p.v > hi) hi = p.v; });
      if (hi - lo < 1e-9) { hi = lo + 1; lo = lo - 1; }

      // Stupnice na kulatych cislech - "0, 20, 40" se cte lip nez
      // "3,7 az 9,94" a cary mrizky pak neco znamenaji.
      var step = niceStep((hi - lo) / 3);
      var LO = Math.floor(lo / step) * step;
      var HI = Math.ceil(hi / step) * step;
      if (HI - LO < step) HI = LO + step;

      var y = function (v) { return 100 - (v - LO) / (HI - LO) * 100; };
      var x = function (t) { return Math.max(0, Math.min(100, (t - t0) / (t1 - t0) * 100)); };

      var lines = '', ticks = [];
      for (var g = LO; g <= HI + step / 2; g += step) {
        var gy = y(g);
        if (gy < -0.1 || gy > 100.1) continue;
        lines += '<line class="grid" x1="0" x2="100" y1="' + gy.toFixed(2) + '" y2="' + gy.toFixed(2) + '"/>';
        ticks.push({ v: g, y: gy });
      }
      grid.innerHTML = lines;

      var d = '', px = 0, py = 0;
      for (var i = 0; i < series.length; i++) {
        var cx = x(series[i].t), cy = y(series[i].v);
        d += (i ? ' L ' : 'M ') + cx.toFixed(2) + ' ' + cy.toFixed(2);
        px = cx; py = cy;
      }
      line.setAttribute('d', d);
      area.setAttribute('d', d + ' L ' + px.toFixed(2) + ' 100 L ' + x(series[0].t).toFixed(2) + ' 100 Z');

      dot.style.display = '';
      dot.style.left = px + '%';
      dot.style.top = py + '%';

      if (ylab) {
        var yh = '';
        ticks.forEach(function (t) {
          yh += '<span style="top:' + t.y.toFixed(2) + '%">' + U.fmt(t.v, tickDecimals(step, decimals)) + '</span>';
        });
        ylab.innerHTML = yh;
      }
      if (xlab) {
        var mid = new Date((t0 + t1) / 2);
        xlab.innerHTML = '<span>' + U.clockTime(new Date(t0), false) + '</span>'
          + '<span>' + U.clockTime(mid, false) + '</span>'
          + '<span>teď</span>';
      }
      return { lo: lo, hi: hi, min: LO, max: HI };
    }

    return { el: box, draw: draw };
  }

  /**
   * Nazvy entit z Home Assistanta byvaji "fire_monitored_sensors".
   * Na klidove obrazovce je z toho pres celou sirku necitelna sipa,
   * tak se podtrzitka prevedou na mezery a delsi nazev se zkrati.
   */
  function cleanLabel(name) {
    var t = String(name || '').replace(/_/g, ' ').trim();
    if (t.length > 22) t = t.slice(0, 21).trim() + '\u2026';
    return t;
  }

  /**
   * Cim vic znaku, tim mensi pismo - jinak by se "4727" do kruhu
   * neveslo a skoncilo by jako "4...".
   */
  function fitClass(text) {
    var n = String(text || '').length;
    if (n >= 7) return ' l7';
    if (n >= 6) return ' l6';
    if (n >= 5) return ' l5';
    if (n >= 4) return ' l4';
    return '';
  }

  /** Krok stupnice na kulate cislo: 1, 2, 2,5, 5 nebo 10 krat mocnina deseti. */
  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    var exp = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var f = raw / exp;
    var mult = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return mult * exp;
  }

  /** Kolik desetinnych mist ma popisek stupnice, at neni "0,00". */
  function tickDecimals(step, decimals) {
    if (step >= 10) return 0;
    if (step >= 1) return decimals === null || decimals === undefined ? 0 : Math.min(1, decimals);
    if (step >= 0.1) return 1;
    return 2;
  }

  /**
   * Vlastni mrizka: kolik oken na radek (a volitelne kolik rad).
   * Bez nastaveni zustava vychozi rozvrzeni z CSS podle poctu oken.
   */
  function applyGrid(host, grid, count, defCols) {
    grid = grid || {};
    var cols = grid.cols || 0, rows = grid.rows || 0;
    if (!cols && !rows) return;
    if (!cols) cols = Math.min(defCols, Math.ceil(count / rows) || 1);
    host.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    if (rows) {
      host.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
      host.style.gridAutoRows = '1fr';
    }
    // Pet sekci ma v CSS zvlastni rozvrzeni (3 + 2 pres pul sirky);
    // pri rucnim nastaveni by prekazelo.
    host.classList.add('fixed');
    host.dataset.cols = cols;
  }

  /**
   * Dlouhy stisk (600 ms). Musi se pustit i pri posunu prstu, jinak by
   * okno vyskocilo pri kazdem sjeti po obrazovce.
   */
  function longPress(node, fn) {
    var timer = null, sx = 0, sy = 0;
    function start(x, y) {
      sx = x; sy = y;
      clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        node.classList.remove('held');
        fn();
      }, 600);
      node.classList.add('held');
    }
    function stop() {
      clearTimeout(timer);
      timer = null;
      node.classList.remove('held');
    }
    node.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      start(t.clientX, t.clientY);
    }, { passive: true });
    node.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12) stop();
    }, { passive: true });
    node.addEventListener('touchend', stop, { passive: true });
    node.addEventListener('touchcancel', stop, { passive: true });
    node.addEventListener('mousedown', function (e) { start(e.clientX, e.clientY); });
    node.addEventListener('mouseup', stop);
    node.addEventListener('mouseleave', stop);
  }

  /* ---------- pomocnici ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function svg(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = '<svg viewBox="0 0 318 318" aria-hidden="true">' + html + '</svg>';
    return wrap.firstChild;
  }

  function toneClass(t) { return t && t !== 'cyan' ? ' t-' + t : ''; }

  /* Barvy odstinu musi byt i v JS: budik se kresli do SVG, kam se CSS
     promenna nedostane, a v okamziku stavby jeste prvek neni v dokumentu. */
  var ACCENT = { cyan: '#36d8ff', amber: '#ff8b3e', green: '#8af5bc', violet: '#c48aff', red: '#ff5369' };

  /* ------------------------------------------------------------------
     build(layout, host, ctx)
       host = #stage,  ctx = { onTap(entity), onCog() }
     Vraci { refresh(states), bindings }
     ------------------------------------------------------------------ */
  function build(layout, host, ctx) {
    ctx = ctx || {};
    var bindings = [];
    // Krivky se neplni ze stavu, ale z historie - drzi se tedy zvlast.
    var graphs = [];
    // Opakovane obnovovani snimku z kamer; pri prestavbe se rusi.
    var timers = [];
    // Sekce, ktere plni data mimo stavy entit (predpoved, kalendar, ukoly).
    var feeds = [];
    // Prvek, na kterem se prepinaji stavove tridy. V aplikaci je to <body>,
    // v karte pro Lovelace obal karty - jinam se karta sahat nesmi.
    var rootEl = ctx.root || document.body;

    function bind(entity, update) {
      if (!entity) return;
      bindings.push({ entity: entity, update: update });
    }

    host.innerHTML = '';

    /* ---------- zahlavi ---------- */
    var header = el('header', 'anim');
    var plate = el('div', 'plate' + (layout.title || layout.subtitle ? '' : ' empty'));
    plate.appendChild(el('div', 'bar'));
    var names = el('div');
    names.appendChild(el('div', 'wordmark', layout.title || ''));
    if (layout.subtitle) names.appendChild(el('div', 'subline', layout.subtitle));
    plate.appendChild(names);
    header.appendChild(plate);

    var badge = el('div', 'badge');
    badge.appendChild(el('span', 'led'));
    badge.appendChild(el('span', '', 'Spojuji'));
    header.appendChild(badge);
    header.appendChild(el('div', 'grow'));

    if (layout.weather) {
      var wx = el('div', 'wx');
      var wxT = el('b', '', '--');
      var wxW = el('span', '', '');
      wx.appendChild(wxT);
      wx.appendChild(wxW);
      header.appendChild(wx);
      bind(layout.weather, function (st) {
        var w = U.weather(st);
        if (!w) { wxT.textContent = '--'; wxW.textContent = 'nedostupné'; return; }
        wxT.textContent = isNaN(w.temp) ? '--' : U.fmt(w.temp, 1) + ' ' + w.unit;
        wxW.textContent = w.word;
      });
    }

    var clock = el('div', 'clock');
    var clockT = el('div', 't', '--:--:--');
    var clockD = el('div', 'd', '—');
    clock.appendChild(clockT); clock.appendChild(clockD);
    header.appendChild(clock);

    // Ozubene kolo jen tam, kde je editor - v karte pro Lovelace se panel
    // upravuje v konfiguraci karty.
    var cog = ctx.onCog ? el('div', 'cog') : null;
    if (cog) {
      cog.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>'
        + '<path d="M19.4 13a7.7 7.7 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L14.9 3h-3.8l-.4 2.6c-.6.2-1.2.6-1.7 1l-2.4-1-2 3.4L6.6 11a7.7 7.7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1l.4 2.6h3.8l.4-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6z"/></svg>';
      cog.addEventListener('click', function () { ctx.onCog(); });
      header.appendChild(cog);
    }
    // Ve zvetsene sekci zahlavi nepatri: hodiny, odznak spojeni i ozubene
    // kolo uz jsou vidleti na panelu pod nim a odznak by tu navic zamrzl
    // na "Spojuji" (zvetsena sekce se prekresluje jen jednou).
    if (!ctx.zoomed) host.appendChild(header);

    /* ---------- pruh upozorneni ---------- */
    var alertBar = el('div', '');
    alertBar.id = 'alert';
    alertBar.innerHTML = '<div class="al"><i></i><span class="alx">Upozornění</span></div>'
      + '<div class="at"><div class="af"></div></div>'
      + '<div class="ap"><span class="apv">0</span><small>%</small></div>'
      + '<div class="am">—</div>';
    if (!ctx.zoomed) host.appendChild(alertBar);

    if (layout.alert && layout.alert.entity) {
      var aName = alertBar.querySelector('.alx');
      var aFill = alertBar.querySelector('.af');
      var aVal = alertBar.querySelector('.apv');
      var aMeta = alertBar.querySelector('.am');
      aName.textContent = layout.alert.name || 'Upozornění';
      bind(layout.alert.entity, function (st) {
        var on = false, d = U.display(st, { attribute: layout.alert.attribute });
        if (st) {
          var raw = layout.alert.attribute ? (st.attributes || {})[layout.alert.attribute] : st.state;
          on = String(raw) === String(layout.alert.on) || (!isNaN(d.n) && d.n > 0);
        }
        rootEl.classList.toggle('alert', on);
        if (!on) return;
        if (!isNaN(d.n) && d.n <= 100 && d.n >= 0) {
          alertBar.classList.remove('text');
          aFill.style.width = d.n + '%';
          aVal.textContent = U.fmt(d.n, 0);
        } else {
          alertBar.classList.add('text');
        }
        aMeta.textContent = layout.alert.note || (st ? U.name(st, '') : '');
      });
    }

    /* ---------- stranky ----------
       Kazda stranka je jedna obrazovka panelu; prejizdi se mezi nimi
       prstem. Vsechny se postavi rovnou, takze prechod je jen posun -
       nic se pri prejeti nedopocitava. */
    var pages = layout.pages || [];
    // Okenko (.pages) se nehybe a orezava; posouva se pas uvnitr nej
    // (.pstrip). Kdyby se posouvalo okenko, odjelo by z obrazovky i s
    // obsahem a druha stranka by zustala neviditelna.
    var pagesEl = el('div', 'pages');
    var stripEl = el('div', 'pstrip');
    pagesEl.appendChild(stripEl);
    var pageEls = [];
    pages.forEach(function (page, pi) {
      var pe = el('div', 'page');
      var mid = el('div', 'mid n' + Math.min(6, page.cards.length));
      applyGrid(mid, page.grid, page.cards.length, 3);
      page.cards.forEach(function (card, idx) {
        mid.appendChild(buildCard(card, idx, bind, ctx, graphs, timers, feeds));
      });
      if (page.cards.length) pe.appendChild(mid);

      var bot = el('div', 'bot n' + Math.min(4, page.panels.length));
      applyGrid(bot, page.panelGrid, page.panels.length, 4);
      page.panels.forEach(function (p, idx) {
        bot.appendChild(buildPanel(p, idx, bind, ctx, graphs, timers));
      });
      if (page.panels.length) pe.appendChild(bot);

      pageEls.push({ el: pe, mid: mid, bot: bot, page: page });
      stripEl.appendChild(pe);
    });
    host.appendChild(pagesEl);

    /* Tecky stranek - jen kdyz je stranek vic. Zaroven slouzi jako
       tlacitka, at se da prepnout i bez prejeti prstem. */
    var dotsEl = null;
    if (pages.length > 1) {
      dotsEl = el('div', 'pdots');
      pages.forEach(function (page, i) {
        var d = el('i', '');
        d.title = page.name;
        d.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.onPage) ctx.onPage(i);
        });
        dotsEl.appendChild(d);
      });
      host.appendChild(dotsEl);
    }

    /** Prepne na stranku: posune pas a rozsviti spravnou tecku. */
    function showPage(index) {
      var n = pageEls.length;
      if (!n) return 0;
      var i = Math.max(0, Math.min(n - 1, index));
      stripEl.style.transform = 'translateX(' + (-i * 100) + '%)';
      for (var j = 0; j < pageEls.length; j++) {
        pageEls[j].el.classList.toggle('on', j === i);
      }
      if (dotsEl) {
        for (var k = 0; k < dotsEl.children.length; k++) {
          dotsEl.children[k].classList.toggle('on', k === i);
        }
      }
      return i;
    }
    showPage(0);

    /* ---------- klidova obrazovka ----------
       Az ctyri hodnoty ve velkych kruzich. Popisek je uvnitr kruhu nad
       cislem, ne nad nim - dlouhy nazev entity jinak prelezl pres budik
       vedle. V karte pro Lovelace klidovy rezim nema smysl a nestavi se. */
    var aClock = null, aDate = null;
    if (!ctx.noAmbient) {
      var cells = (layout.ambient.cells || []).slice(0, 4);
      var amb = el('div', '');
      amb.id = 'ambient';
      aClock = el('div', 'aclock', '--:--');
      aDate = el('div', 'adate', '\u2014');
      amb.appendChild(aClock);
      amb.appendChild(aDate);

      if (cells.length) {
        var arow = el('div', 'arow c' + cells.length);
        cells.forEach(function (item) {
          var cell = el('div', 'acell');
          var lab = el('div', 'alabel', cleanLabel(item.name));
          var val = el('div', 'aval', '--');
          var unit = el('div', 'aunit', '');
          var state = el('div', 'astate', '\u2014');
          cell.appendChild(lab);
          cell.appendChild(val);
          cell.appendChild(unit);
          cell.appendChild(state);
          arow.appendChild(cell);
          bind(item.entity, function (st) {
            var d = U.display(st, item);
            if (!item.name) lab.textContent = cleanLabel(U.name(st, ''));
            val.textContent = d.text;
            val.className = 'aval' + (isNaN(d.n) ? ' txt' : fitClass(d.text));
            unit.textContent = d.unit;
            var lv = U.level(d.n, item.levels);
            state.textContent = d.has ? (item.levels.length ? lv.word : (d.word || '')) : 'Nedostupn\u00e9';
            state.style.color = item.levels.length ? lv.color : '#7f9db1';
          });
        });
        amb.appendChild(arow);
      }

      (layout.ambient.line || []).forEach(function (item) {
        var line = el('div', 'aline');
        var k = el('b', '', '');
        line.appendChild(document.createTextNode(''));
        line.appendChild(k);
        amb.appendChild(line);
        bind(item.entity, function (st) {
          var d = U.display(st, item);
          line.firstChild.nodeValue = (cleanLabel(U.name(st, item.name)) || '') + ': ';
          k.textContent = d.text + (d.unit ? ' ' + d.unit : '');
        });
      });

      var tag = el('div', 'atag');
      tag.appendChild(el('i'));
      tag.appendChild(document.createTextNode('Klidov\u00fd re\u017eim'));
      amb.appendChild(tag);
      host.appendChild(amb);
    }

    /* ---------- prazdny panel ---------- */
    if (!Layout.allCards(layout).length && !Layout.allPanels(layout).length) {
      var hint = el('div', 'pane panel anim');
      hint.style.gridColumn = '1 / -1';
      var inner = el('div', 'pempty');
      inner.innerHTML = 'Panel zatím nic neukazuje.<br>Klepni na ozubené kolo vpravo nahoře a vyber entity.';
      hint.appendChild(inner);
      var wrap = el('div', 'mid n1');
      wrap.appendChild(hint);
      if (pageEls.length) pageEls[0].el.appendChild(wrap);
      else host.insertBefore(wrap, alertBar.nextSibling);
    }

    /* ---------- obnova ---------- */
    function refresh(states) {
      for (var i = 0; i < bindings.length; i++) {
        var b = bindings[i];
        try { b.update(states ? states[b.entity] : null); } catch (e) {}
      }
    }

    function refreshOne(entityId, states) {
      for (var i = 0; i < bindings.length; i++) {
        if (bindings[i].entity === entityId) {
          try { bindings[i].update(states ? states[entityId] : null); } catch (e) {}
        }
      }
    }

    /**
     * Meritko uvnitr oken se odvodi od toho, jak velke okno doopravdy
     * je. Diky tomu sedne i pri rucne nastavene mrizce a na kazdem
     * pomeru stran - CSS trida n1..n6 uz jen urcuje vychozi rozlozeni.
     */
    function scale() {
      pageEls.forEach(function (pg) {
        fitScale(pg.mid, { cols: columnsOf(pg.mid, pg.page.cards.length, 3),
                           rows: rowsOf(pg.mid, pg.page.cards.length, pg.page.grid),
                           refW: 1150, refH: 840, min: 0.34, max: 1.12 });
        fitScale(pg.bot, { cols: columnsOf(pg.bot, pg.page.panels.length, 4),
                           rows: 1, refW: 1150, refH: 0, min: 0.5, max: 1 });
      });
    }

    /** Nova data odberu (predpoved, kalendar, ukoly). */
    function setFeed(kind, entity, data) {
      for (var i = 0; i < feeds.length; i++) {
        if (feeds[i].kind !== kind || feeds[i].entity !== entity) continue;
        try { feeds[i].draw(data); } catch (e) {}
      }
    }

    /** Nova historie jedne entity - prekresli vsechny jeji krivky. */
    function setHistory(entityId, series) {
      for (var i = 0; i < graphs.length; i++) {
        if (graphs[i].entity !== entityId) continue;
        try { graphs[i].draw(series); } catch (e) {}
      }
    }

    /** Prekresleni vseho (napr. po zmene velikosti nebo pri navratu z klidu). */
    function redraw(store) {
      for (var i = 0; i < graphs.length; i++) {
        try { graphs[i].draw(store ? store.get(graphs[i].entity) : null); } catch (e) {}
      }
    }

    return {
      bindings: bindings,
      graphs: graphs,
      refresh: refresh,
      refreshOne: refreshOne,
      setHistory: setHistory,
      setFeed: setFeed,
      feeds: feeds,
      redraw: redraw,
      scale: scale,
      badge: badge,
      /** Zastavi obnovovani kamer - vola se pred prestavbou panelu. */
      destroy: function () {
        timers.forEach(function (t) { clearInterval(t); });
        timers.length = 0;
      },
      pages: pageEls.length,
      showPage: showPage,
      clock: { t: clockT, d: clockD, aTime: aClock, aDate: aDate }
    };
  }

  /* ---------- jedna sekce ----------
     Sekce ukazuje jednu hlavni hodnotu - a uzivatel si vybira, jak:
     budikem, sloupcem, krivkou nebo holym cislem. Vsechny ctyri mluvi
     stejne: velke cislo, jednotka a slovo o stavu. */
  function buildCard(card, idx, bind, ctx, graphs, timers, feeds) {
    var sec = el('section', 'pane card anim' + toneClass(card.tone));
    sec.style.animationDelay = (0.06 + idx * 0.08) + 's';

    var head = el('div', 'chead');
    if (card.code) head.appendChild(el('div', 'id', card.code));
    head.appendChild(el('div', 'nm', card.name || ''));
    var part = el('span', 'part', '');
    head.appendChild(part);
    sec.appendChild(head);

    // Klepnuti na sekci ji zvetsi pres celou obrazovku (v karte pro
    // Lovelace se nic takoveho nedeje - tam je mistem dashboard).
    if (ctx.onZoom && !ctx.zoomed) {
      sec.classList.add('zoomable');
      sec.addEventListener('click', function () { ctx.onZoom(card, sec); });
    }
    if (card.dial.entity && ctx.onDetail) {
      longPress(sec, function () { ctx.onDetail(card.dial.entity); });
    }
    bind(card.dial.entity, function (st) {
      // Jmeno entity vedle nadpisu jen tehdy, kdyz rika neco noveho -
      // dvakrat totez vedle sebe je jen sum.
      var ent = U.name(st, '') || '';
      part.textContent = ent.toLowerCase() === String(card.name || '').toLowerCase() ? '' : ent;
    });

    var accent = ACCENT[card.tone] || ACCENT.cyan;
    // Sekce bez ukazatelu a dlazdic ma jen hlavni hodnotu - at stoji
    // uprostred, ne nalepena vlevo s prazdnem vedle sebe.
    var solo = !(card.meters && card.meters.length) && !(card.tiles && card.tiles.length);
    var body = el('div', 'cbody' + (solo ? ' solo' : ''));
    body.appendChild(buildVisual(card, bind, accent, graphs, ctx, timers, feeds));

    var right = el('div', 'cright');
    (card.meters || []).forEach(function (m) {
      right.appendChild(buildMeter(m, bind, accent, graphs));
    });
    if (card.tiles && card.tiles.length) {
      var tiles = el('div', 'tiles' + (card.tiles.length % 3 === 0 && card.tiles.length > 2 ? ' t3' : ''));
      card.tiles.forEach(function (t) { tiles.appendChild(buildTile(t, bind, graphs)); });
      right.appendChild(tiles);
    }
    body.appendChild(right);
    sec.appendChild(body);
    return sec;
  }

  /* ---------- hlavni hodnota sekce ---------- */
  function buildVisual(card, bind, accent, graphs, ctx, timers, feeds) {
    var d = card.dial;
    var view = card.view || 'gauge';
    var nEl = el('div', 'n', '--');
    var uEl = el('div', 'u', '');
    var stEl = el('div', 'st', '—');
    var capEl = el('div', 'cap', d.caption || '');
    var wrap, setVisual = function () {};

    if (view === 'bar') {
      wrap = el('div', 'barw');
      var col = el('div', 'bcol');
      var segs = [];
      for (var i = 0; i < 24; i++) {
        var seg = el('i', 'bseg');
        col.appendChild(seg);
        segs.push(seg);
      }
      var side = el('div', 'bside');
      side.appendChild(capEl); side.appendChild(nEl); side.appendChild(uEl); side.appendChild(stEl);
      wrap.appendChild(col); wrap.appendChild(side);
      setVisual = function (ratio, color) {
        var lit = Math.round(Math.max(0, Math.min(1, ratio)) * segs.length);
        for (var j = 0; j < segs.length; j++) {
          segs[j].style.background = j < lit ? color : '#141d28';
          segs[j].style.opacity = j < lit ? (0.6 + 0.4 * (j / Math.max(1, lit))) : 1;
        }
      };

    } else if (view === 'graph') {
      wrap = el('div', 'graphw');
      var ghead = el('div', 'ghead');
      ghead.appendChild(capEl); ghead.appendChild(nEl); ghead.appendChild(uEl); ghead.appendChild(stEl);
      var gbox = el('div', 'gbox');
      var chart = makeChart({ scales: true });
      var gempty = el('div', 'gempty', 'zatím bez historie');
      gbox.appendChild(chart.el);
      gbox.appendChild(gempty);
      wrap.appendChild(ghead);
      wrap.appendChild(gbox);

      graphs.push({
        entity: d.entity,
        hours: card.hours || 6,
        draw: function (series) {
          var r = chart.draw(series, card.hours || 6, d.decimals);
          gempty.style.display = r ? 'none' : '';
        }
      });

    } else if (view === 'camera') {
      // Snimek z kamery. Home Assistant posila adresu i s pristupovym
      // tokenem v atributu entity_picture, takze staci obrazek nacist -
      // proud videa by na levnem tabletu jen zral proud a pamet.
      wrap = el('div', 'camw');
      var img = el('img', 'cam');
      img.alt = card.name || 'kamera';
      var camNote = el('div', 'camnote', 'čekám na snímek');
      wrap.appendChild(img);
      wrap.appendChild(camNote);
      var lastSrc = '';
      var camTimer = null;

      var refreshCam = function (st) {
        var pic = st && st.attributes ? st.attributes.entity_picture : '';
        if (!pic) { camNote.style.display = ''; img.style.display = 'none'; return; }
        var base = (ctx.baseUrl || '').replace(/\/+$/, '');
        var url = /^https?:/.test(pic) ? pic : base + pic;
        // Cache-buster: bez nej by prohlizec ukazoval porad tyz snimek.
        img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
        lastSrc = url;
      };
      img.addEventListener('load', function () {
        camNote.style.display = 'none';
        img.style.display = '';
      });
      img.addEventListener('error', function () {
        camNote.textContent = 'snímek se nenačetl';
        camNote.style.display = '';
        img.style.display = 'none';
      });

      setVisual = function () {};
      bind(d.entity, function (st) {
        if (!st) { camNote.textContent = 'entita není'; camNote.style.display = ''; return; }
        if (!lastSrc) refreshCam(st);
        if (!camTimer) {
          camTimer = setInterval(function () {
            // Prekreslovat jen kdyz je stranka videt - zhasnuty nebo
            // schovany panel nemusi tahat obrazky.
            if (document.hidden || document.body.classList.contains('oled-off')) return;
            var cur = ctx.states ? ctx.states(d.entity) : st;
            refreshCam(cur || st);
          }, Math.max(2, card.refresh || 10) * 1000);
          timers.push(camTimer);
        }
      });

    } else if (view === 'forecast' || view === 'calendar' || view === 'todo') {
      // Tri seznamy, ktere se lisi jen radkem: predpoved, kalendar, ukoly.
      wrap = el('div', 'listw v-' + view);
      var lhead = el('div', 'lhead');
      lhead.appendChild(capEl);
      lhead.appendChild(el('span', 'grow'));
      var lsum = el('span', 'lsum', '');
      lhead.appendChild(lsum);
      var rows = el('div', 'lrows');
      var lempty = el('div', 'lwait', 'čekám na data');
      wrap.appendChild(lhead);
      wrap.appendChild(rows);
      wrap.appendChild(lempty);
      if (!capEl.textContent) {
        capEl.textContent = view === 'forecast' ? 'Předpověď'
          : (view === 'calendar' ? 'Kalendář' : 'Seznam');
      }

      feeds.push({
        kind: view, entity: d.entity,
        draw: function (data) {
          rows.innerHTML = '';
          var list = view === 'forecast' ? Feeds.forecastRows(data, card.count)
            : (view === 'calendar' ? Feeds.eventRows(data, card.count)
                                   : Feeds.todoRows(data, card.count));
          lempty.style.display = list.length ? 'none' : '';
          if (!list.length && data) lempty.textContent = view === 'todo' ? 'nic nezbývá' : 'nic dalšího';
          lsum.textContent = view === 'todo' && data ? list.length + ' položek' : '';

          list.forEach(function (r) {
            var row = el('div', 'lrow');
            if (view === 'forecast') {
              row.appendChild(el('b', 'lday', r.day));
              row.appendChild(el('span', 'lname', r.word));
              var t = el('span', 'ltemp');
              t.appendChild(el('b', '', isNaN(r.hi) ? '--' : U.fmt(r.hi, 0) + '°'));
              t.appendChild(el('i', '', isNaN(r.lo) ? '' : U.fmt(r.lo, 0) + '°'));
              row.appendChild(t);
              if (!isNaN(r.rain) && r.rain > 0) {
                row.appendChild(el('span', 'lrain', U.fmt(r.rain, 0) + ' %'));
              }
            } else if (view === 'calendar') {
              row.appendChild(el('b', 'lwhen', r.when));
              row.appendChild(el('span', 'lname', r.name));
            } else {
              var box = el('i', 'lbox');
              row.appendChild(box);
              row.appendChild(el('span', 'lname', r.name));
              // Klepnuti odskrtne polozku - to je to jedine, co u seznamu
              // na zdi clovek dela.
              row.classList.add('tapable');
              row.addEventListener('click', function (e) {
                e.stopPropagation();
                if (ctx.onTodo) ctx.onTodo(d.entity, r);
                row.classList.add('done');
              });
            }
            rows.appendChild(row);
          });
        }
      });

      // Stav entity doplni cislo do zahlavi (teplota, pocet ukolu).
      bind(d.entity, function (st) {
        if (view !== 'forecast') return;
        var w = U.weather(st);
        nEl.textContent = w && !isNaN(w.temp) ? U.fmt(w.temp, 1) : '--';
        uEl.textContent = w ? w.unit : '';
        stEl.textContent = w ? w.word : '';
        stEl.style.color = '#9fb6c4';
      });
      if (view === 'forecast') {
        lhead.insertBefore(stEl, lsum);
        lhead.insertBefore(uEl, stEl);
        lhead.insertBefore(nEl, uEl);
      }

    } else if (view === 'number') {
      wrap = el('div', 'numw');
      wrap.appendChild(capEl); wrap.appendChild(nEl); wrap.appendChild(uEl); wrap.appendChild(stEl);

    } else {
      wrap = el('div', 'gw');
      var g = svg('<circle class="dial-frame" cx="159" cy="159" r="156"/>'
        + '<circle class="dial-ticks" cx="159" cy="159" r="153"/>'
        + '<circle class="dial-core" cx="159" cy="159" r="120"/>'
        + '<g class="seg">' + dialPaths() + '</g>'
        + '<text class="dial-caption" x="159" y="300" text-anchor="middle">'
        + d.min + ' — ' + d.max + '</text>');
      wrap.appendChild(g);
      var gv = el('div', 'gv');
      gv.appendChild(capEl); gv.appendChild(nEl); gv.appendChild(uEl); gv.appendChild(stEl);
      wrap.appendChild(gv);
      var segGroup = g.querySelector('.seg');
      setVisual = function (ratio, color) { setSeg(segGroup, ratio, color); };
    }

    // Seznamy si cislo v zahlavi plni samy (teplota, pocet polozek) -
    // spolecna vazba by jim ho prepsala stavem entity ("Partlycloudy").
    var listView = ['forecast', 'calendar', 'todo'].indexOf(view) >= 0;
    if (!listView) bind(d.entity, function (st) {
      var disp = U.display(st, d);
      nEl.textContent = disp.text;
      nEl.classList.toggle('txt', isNaN(disp.n));
      uEl.textContent = disp.unit;
      var lv = U.level(disp.n, d.levels);
      var hasLevels = d.levels && d.levels.length;
      stEl.textContent = disp.has ? (hasLevels ? lv.word : (disp.word || '')) : 'Nedostupné';
      stEl.style.color = hasLevels ? lv.color : '#7f8b99';
      stEl.style.display = stEl.textContent && stEl.textContent !== '—' ? '' : 'none';
      var ratio = isNaN(disp.n) ? (disp.has && String(st.state) === 'on' ? 1 : 0)
                                : (disp.n - d.min) / (d.max - d.min);
      setVisual(ratio, hasLevels ? lv.color : accent);
    });

    // Cerstve pridana sekce jeste entitu nema - at je videt proc, misto
    // aby budik nekonecne ukazoval dve pomlcky.
    if (!d.entity) {
      nEl.textContent = '—';
      nEl.classList.add('txt');
      stEl.textContent = 'Vyber entitu';
      stEl.style.color = '#7f8b99';
    }
    return wrap;
  }

  /* ---------- ukazatel vedle hlavni hodnoty ---------- */
  function buildMeter(item, bind, accent, graphs) {
    var m = el('div', 'meter');
    var lbl = el('div', 'lbl');
    var k = el('span', 'k');
    var kText = document.createTextNode(item.name || '');
    var kState = el('b', '', '');
    k.appendChild(kText);
    k.appendChild(kState);
    var v = el('span', 'v', '--');
    lbl.appendChild(k); lbl.appendChild(v);
    m.appendChild(lbl);

    var fill = null, spark = null;
    if (item.view === 'bar') {
      var track = el('div', 'track');
      fill = el('div', 'fill');
      track.appendChild(fill);
      m.appendChild(track);
    } else if (item.view === 'graph') {
      spark = addSpark(m, item, graphs);
    }

    bind(item.entity, function (st) {
      var d = U.display(st, item);
      if (!item.name) kText.nodeValue = U.name(st, '');
      v.textContent = d.text + (d.unit ? ' ' + d.unit : '');
      var lv = U.level(d.n, item.levels);
      var has = item.levels && item.levels.length;
      kState.textContent = has && d.has ? lv.word : '';
      kState.style.color = lv.color;
      if (fill) {
        fill.style.width = U.pct(d.n, item.min, item.max) + '%';
        fill.style.background = has ? lv.color : accent;
      }
      v.style.color = has && d.has ? lv.color : '';
    });
    return m;
  }

  /** Mala krivka bez stupnic - do dlazdice i do ukazatele. */
  function addSpark(host, item, graphs) {
    var box = el('div', 'spark');
    var chart = makeChart();
    box.appendChild(chart.el);
    host.appendChild(box);
    if (graphs) {
      graphs.push({
        entity: item.entity,
        hours: item.hours || 6,
        draw: function (series) { chart.draw(series, item.hours || 6, item.decimals); }
      });
    }
    return chart;
  }

  /**
   * Nahled kamery v dlazdici. Stejne jako u sekce jen snimek, ktery se
   * sam obnovuje - klepnutim se zvetsi.
   */
  function addCamTile(host, item, ctx, timers) {
    var box = el('div', 'camthumb');
    var img = el('img', '');
    img.alt = item.name || 'kamera';
    box.appendChild(img);
    host.appendChild(box);

    function refresh() {
      if (document.hidden || document.body.classList.contains('oled-off')) return;
      var st = ctx.states ? ctx.states(item.entity) : null;
      var pic = st && st.attributes ? st.attributes.entity_picture : '';
      if (!pic) return;
      var base = (ctx.baseUrl || '').replace(/\/+$/, '');
      var url = /^https?:/.test(pic) ? pic : base + pic;
      img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
    }
    refresh();
    var timer = setInterval(refresh, Math.max(5, item.hours || 10) * 1000);
    if (timers) timers.push(timer);
    img.refresh = refresh;
    return img;
  }

  /* ---------- mala dlazdice v sekci ---------- */
  function buildTile(item, bind, graphs) {
    var t = el('div', 'tile');
    var k = el('div', 'k', item.name || '');
    var v = el('div', 'v', '--');
    t.appendChild(k); t.appendChild(v);
    if (item.view === 'graph') addSpark(t, item, graphs);
    bind(item.entity, function (st) {
      var d = U.display(st, item);
      if (!item.name) k.textContent = U.name(st, '');
      v.textContent = '';
      v.classList.toggle('txt', isNaN(d.n));
      v.appendChild(document.createTextNode(d.text));
      if (d.unit) {
        var s = el('small', '', d.unit);
        v.appendChild(s);
      }
      var lv = U.level(d.n, item.levels);
      v.style.color = (item.levels && item.levels.length && d.has) ? lv.color : '';
    });
    return t;
  }

  /* ---------- spodni panel ---------- */
  function buildPanel(panel, idx, bind, ctx, graphs, timers) {
    var accent = ACCENT[panel.tone] || ACCENT.green;
    var sec = el('section', 'pane panel anim' + toneClass(panel.tone));
    sec.style.animationDelay = (0.2 + idx * 0.08) + 's';

    var head = el('div', 'chead2');
    head.appendChild(el('div', 'ptitle', panel.name || ''));
    var src = el('div', 'psrc', '');
    head.appendChild(src);
    sec.appendChild(head);

    // Pri jedne nebo dvou dlazdicich by se roztahly pres cely panel a
    // cisla by plavala v prazdnu - drzime tedy aspon tri sloupce.
    var row = el('div', 'prow' + (panel.items.length > 4 ? ' wrap'
      : (panel.items.length <= 3 ? ' c3' : '')));
    if (!panel.items.length) {
      row.appendChild(el('div', 'pempty', 'zatím prázdné'));
    }
    panel.items.forEach(function (item) {
      row.appendChild(buildPanelItem(item, bind, ctx, accent, graphs, timers));
    });
    sec.appendChild(row);
    return sec;
  }

  function buildPanelItem(item, bind, ctx, accent, graphs, timers) {
    // Znacka "tohle jde prepnout" patri jen tomu, co se opravdu prepina.
    // Karta v Lovelace navic necha klepnout na cokoli - u cidla se otevre
    // podrobnost, jak je v Home Assistantu zvykem.
    var tappable = item.tap === 'toggle' || item.tap === 'detail'
                || (item.tap === 'auto' && U.switchable(item.entity));
    var clickable = tappable || (ctx.tapAll && item.entity && item.tap !== 'none');
    var t = el('div', 'lt' + (tappable ? ' act' : ''));
    var lk = el('div', 'lk');
    var name = el('span', '', item.name || '');
    var stWord = el('span', 'lst', '');
    lk.appendChild(name); lk.appendChild(stWord);
    var lv = el('div', 'lv', '--');
    t.appendChild(lk); t.appendChild(lv);

    var fill = null, camImg = null;
    if (item.view === 'bar') {
      var track = el('div', 'track');
      fill = el('div', 'fill');
      track.appendChild(fill);
      t.appendChild(track);
    } else if (item.view === 'graph') {
      addSpark(t, item, graphs);
    } else if (item.view === 'camera') {
      t.classList.add('camtile');
      camImg = addCamTile(t, item, ctx, timers);
    }
    var note = el('div', 'lr', item.entity ? '' : 'bez entity');
    t.appendChild(note);

    if (clickable) {
      t.addEventListener('click', function () {
        if (ctx.onTap) ctx.onTap(item.entity, item);
      });
    }
    // Dlouhy stisk otevre okno s ovladanim - stejny zvyk jako v Home
    // Assistantu, takze u nej clovek nemusi nic hledat.
    if (item.entity && ctx.onDetail) longPress(t, function () { ctx.onDetail(item.entity); });

    bind(item.entity, function (st) {
      var d = U.display(st, item);
      if (!item.name) name.textContent = U.name(st, '');
      lv.textContent = '';
      lv.classList.toggle('txt', isNaN(d.n));
      lv.appendChild(document.createTextNode(d.text));
      if (d.unit) lv.appendChild(el('small', '', d.unit));

      var level = U.level(d.n, item.levels);
      var has = item.levels && item.levels.length;
      stWord.textContent = has && d.has ? level.word : '';
      stWord.style.color = level.color;
      lv.style.color = has && d.has ? level.color : '';

      if (fill) {
        fill.style.width = U.pct(d.n, item.min, item.max) + '%';
        fill.style.background = has ? level.color : (accent || ACCENT.green);
      }
      // Prvni snimek az ve chvili, kdy je znamy stav kamery - adresa
      // se bere z jeho atributu.
      if (camImg && st && !camImg.src) camImg.refresh();
      var on = st && (st.state === 'on' || st.state === 'open' || st.state === 'playing'
                   || st.state === 'unlocked' || st.state === 'cleaning');
      t.classList.toggle('on', !!on);
      note.textContent = st ? U.ago(st.last_changed) : (item.entity ? 'entita v Home Assistantu není' : 'bez entity');
    });
    return t;
  }


  /* Kolik sloupcu mrizka opravdu ma - bud rucne nastavenych, nebo tolik,
     kolik jich CSS poskladalo. */
  function columnsOf(host, count, max) {
    if (!host) return 1;
    if (host.dataset && host.dataset.cols) return parseInt(host.dataset.cols, 10) || 1;
    try {
      var tpl = getComputedStyle(host).gridTemplateColumns;
      var n = tpl ? tpl.split(' ').filter(function (x) { return x && x !== 'none'; }).length : 0;
      if (n) return n;
    } catch (e) {}
    return Math.min(max, count || 1);
  }

  function rowsOf(host, count, grid) {
    if (grid && grid.rows) return grid.rows;
    var cols = columnsOf(host, count, 3);
    return Math.max(1, Math.ceil((count || 1) / cols));
  }

  function fitScale(host, o) {
    if (!host || !host.clientWidth) return;
    var gap = 16;
    var w = (host.clientWidth - gap * (o.cols - 1)) / o.cols;
    var k = w / o.refW;
    if (o.refH) {
      var h = (host.clientHeight - gap * (o.rows - 1)) / o.rows;
      k = Math.min(k, h / o.refH);
    }
    if (!isFinite(k) || k <= 0) return;
    host.style.setProperty('--k', Math.max(o.min, Math.min(o.max, k)).toFixed(3));
  }

  return { build: build, setSeg: setSeg, dialPaths: dialPaths, fitScale: fitScale,
           makeChart: makeChart };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Render;


/* ------------------------------------------------------------------
   Karta pro Lovelace: stejné budíky jako v aplikaci, ale uvnitř
   dashboardu Home Assistantu.

   Karta nic nestahuje - hodnoty bere z objektu `hass`, který jí Lovelace
   podává, takže funguje i v prohlížeči na počítači a v mobilní aplikaci
   Home Assistanta.

   Celý panel má pevný návrhový prostor (2400 px na šířku, 1400 px v úzkém
   sloupci) a jen se zmenší na šířku karty. Proto vypadá stejně na tabletu
   i na telefonu a čísla si drží poměry.
   ------------------------------------------------------------------ */

var CARD_TYPE = 'ha-panel-card';

/** Konfigurace karty (YAML) -> vnitřní rozvržení panelu. */
function cardLayout(config) {
  if (config && config.layout) {
    // Rozvržení vyexportované z aplikace se dá vložit rovnou.
    return Layout.normalize(config.layout);
  }
  var page = {
    name: config.title || 'Panel',
    // columns/rows: kolik sekci na radek a kolik rad. Bez nich se
    // rozvrzeni poradi samo podle poctu sekci.
    grid: { cols: config.columns || 0, rows: config.rows || 0 },
    panelGrid: { cols: config.panel_columns || 0 },
    cards: [], panels: []
  };
  var out = {
    title: config.title || '',
    subtitle: config.subtitle || '',
    weather: config.weather || '',
    pages: [page], ambient: {}, alert: config.alert || null
  };
  (config.sections || config.cards || []).forEach(function (s) {
    page.cards.push({
      id: s.id, name: s.name, code: s.code, tone: s.tone,
      // view: gauge (vychozi) | bar | graph | number | camera
      view: s.view, hours: s.hours, refresh: s.refresh,
      dial: {
        entity: s.entity, caption: s.caption, unit: s.unit, attribute: s.attribute,
        decimals: s.decimals, min: s.min, max: s.max, levels: s.levels
      },
      meters: s.meters, tiles: s.tiles
    });
  });
  (config.panels || []).forEach(function (p) { page.panels.push(p); });
  return Layout.normalize(out);
}

/**
 * Co uživatel v konfiguraci nevyplnil, doplní se podle druhu čidla -
 * rozsah budíku, stupně i popisek. Bez toho by karta s jedinou řádkou
 * `entity:` ukazovala budík od 0 do 100 a bez jediného slova.
 */
function fillFromHass(layout, states) {
  Layout.allCards(layout).forEach(function (c) {
    if (!c.dial.entity) return;
    if (c.view === 'camera') return;
    var st = states[c.dial.entity];
    if (!st) return;
    // Rozsah budíku nikdo nezadal - vezmi rozumný podle druhu čidla.
    if (c.dial.min === 0 && c.dial.max === 100) {
      var s = U.suggest(st);
      if (s.min !== 0 || s.max !== 100) { c.dial.min = s.min; c.dial.max = s.max; }
      if (!c.dial.levels.length) c.dial.levels = s.levels;
      if (!c.dial.caption) c.dial.caption = s.caption;
    }
    (c.meters || []).forEach(function (m) {
      if (!m.entity || m.levels.length) return;
      var mst = states[m.entity];
      if (!mst) return;
      var ms = U.suggest(mst);
      if (m.min === 0 && m.max === 100 && (ms.min !== 0 || ms.max !== 100)) {
        m.min = ms.min; m.max = ms.max;
      }
      m.levels = ms.levels;
    });
  });
  return layout;
}

class HaPanelCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._view = null;
    this._hass = null;
    this._timer = null;
    this._ro = null;
    this._history = null;
    this._feeds = null;
    this._unsub = {};
    this._subSeq = 0;
  }

  /* ---------- Lovelace rozhraní ---------- */

  setConfig(config) {
    if (!config) throw new Error('Karta nemá konfiguraci.');
    if (!config.sections && !config.panels && !config.cards && !config.layout) {
      throw new Error('Doplň aspoň jednu sekci (sections) nebo panel (panels).');
    }
    this._config = config;
    this._layout = cardLayout(config);
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._view) return;
    if (!this._filled) {
      fillFromHass(this._layout, hass.states);
      this._filled = true;
      this._build();
      return;
    }
    this._view.refresh(hass.states);
    this._pushHistory();
    this._fit();
  }

  getCardSize() {
    var rows = 1;
    if (!this._layout) return rows;
    Layout.allCards(this._layout).forEach(function () { rows += 6; });
    Layout.allPanels(this._layout).forEach(function () { rows += 3; });
    return rows;
  }

  static getStubConfig(hass) {
    var pick = function (dc) {
      for (var id in hass.states) {
        var a = hass.states[id].attributes || {};
        if (a.device_class === dc && !isNaN(parseFloat(hass.states[id].state))) return id;
      }
      return '';
    };
    var teplota = pick('temperature');
    var stub = { type: 'custom:' + CARD_TYPE, title: '', sections: [], panels: [] };
    if (teplota) {
      stub.sections.push({ name: 'TEPLOTA', code: 'T1', tone: 'cyan', entity: teplota });
    }
    return stub;
  }

  /* ---------- stavba ---------- */

  _build() {
    var self = this;
    if (this._view && this._view.destroy) this._view.destroy();
    var sr = this.shadowRoot;
    sr.innerHTML = '<style>' + CARD_CSS + '</style>'
      + '<div class="panel-root mode-live">'
      + '<div class="bg"></div><div class="scan"></div>'
      + '<div id="stage"></div></div>';

    this._root = sr.querySelector('.panel-root');
    this._stage = sr.querySelector('#stage');

    this._view = Render.build(this._layout, this._stage, {
      root: this._root,
      noCog: true,
      noAmbient: true,
      tapAll: true,
      onTap: function (entityId, item) { self._tap(entityId, item); },
      // Dlouhy stisk (a dlazdice nastavena na "Okno s ovladanim") otevre
      // vlastni okno Home Assistanta - v dashboardu je doma a umi vic
      // nez cokoli, co by karta nakreslila sama.
      onDetail: function (entityId) { self._moreInfo(entityId); },
      onTodo: function (entity, row) {
        if (!self._hass) return;
        self._hass.callService('todo', 'update_item',
          { entity_id: entity, item: row.uid || row.name, status: 'completed' });
      },
      // Kamera: obrazek z Home Assistanta je na stejnem puvodu jako
      // dashboard, takze staci adresa z entity_picture.
      states: function (id) { return self._hass ? self._hass.states[id] : null; }
    });

    // Odznak spojení v aplikaci hlásí WebSocket; v Lovelace je spojení
    // věcí Home Assistanta, takže tu odznak jen říká, odkud data jsou.
    if (this._view.badge) {
      this._view.badge.className = 'badge';
      this._view.badge.lastChild.textContent = 'Home Assistant';
    }
    if (this._config.clock === false && this._view.clock.t) {
      this._view.clock.t.parentNode.style.display = 'none';
    }

    this._tick();
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(function () { self._tick(); }, 1000);

    if (this._hass) this._view.refresh(this._hass.states);
    this._startHistory();
    this._startFeeds();
    this._fit();

    if (!this._ro && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self._fit(); });
      this._ro.observe(this);
    }
  }

  _tick() {
    if (!this._view || !this._view.clock.t) return;
    var d = new Date();
    this._view.clock.t.textContent = U.clockTime(d, true);
    this._view.clock.d.textContent = U.clockDate(d);
  }

  /**
   * Panel se vykreslí v pevném prostoru a celý se zmenší na šířku karty.
   * V úzkém sloupci se přepne na svislé rozvržení, stejně jako aplikace
   * na tabletu otočeném na výšku.
   */
  _fit() {
    if (!this._stage) return;
    var width = this.clientWidth || this.offsetWidth;
    if (!width) return;
    var narrow = width < 700;
    this._root.classList.toggle('is-portrait', narrow);
    var design = narrow ? 1400 : 2400;
    this._stage.style.width = design + 'px';
    var scale = width / design;
    this._stage.style.transform = 'scale(' + scale + ')';
    // Písma uvnitř oken se řídí tím, jak velká okna doopravdy jsou.
    if (this._view && this._view.scale) this._view.scale();
    // Výška se měří až po vykreslení - panel je tak vysoký, kolik potřebuje.
    var h = this._stage.scrollHeight || (narrow ? 2000 : 1080);
    this._root.style.height = Math.round(h * scale) + 'px';
  }

  /* ---------- krivky ----------
     Prubeh hodnot si karta vyzada pres hass.callWS - stejnym prikazem,
     jakym ho cte historie v Home Assistantu. */
  /* Predpoved, kalendar a ukoly - v karte pres spojeni, ktere uz
     Home Assistant ma otevrene. */
  _startFeeds() {
    var self = this;
    var want = Layout.feeds(this._layout);
    if (!want.length) {
      if (this._feeds) { this._feeds.stop(); this._feeds = null; }
      return;
    }
    if (!this._feeds) {
      this._feeds = new Feeds.Store({
        subscribe: function (msg, cb) {
          if (!self._hass || !self._hass.connection) return -1;
          var key = ++self._subSeq;
          self._hass.connection.subscribeMessage(cb, msg).then(function (off) {
            self._unsub[key] = off;
          }, function () {});
          return key;
        },
        unsubscribe: function (key) {
          var off = self._unsub[key];
          if (off) { try { off(); } catch (e) {} delete self._unsub[key]; }
        },
        events: function (entity, days) {
          if (!self._hass) return Promise.reject(new Error('bez hass'));
          var d = new Date();
          function p(n) { return n < 10 ? '0' + n : '' + n; }
          var start = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
            + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':00';
          return self._hass.callWS({
            type: 'call_service', domain: 'calendar', service: 'get_events',
            service_data: { start_date_time: start, duration: { days: days } },
            target: { entity_id: entity }, return_response: true
          }).then(function (r) { return r && r.response ? r.response : null; });
        }
      });
      this._feeds.onData = function (kind, entity, data) {
        if (self._view) self._view.setFeed(kind, entity, data);
      };
    }
    this._feeds.set(want);
  }

  _startHistory() {
    var self = this;
    var want = Layout.graphed(this._layout);
    if (!want.length) {
      if (this._history) { this._history.stop(); this._history = null; }
      return;
    }
    if (!this._history) {
      this._history = new History.Store(function (msg) {
        return self._hass ? self._hass.callWS(msg) : Promise.reject(new Error('bez hass'));
      });
      this._history.onData = function (entity, series) {
        if (self._view) self._view.setHistory(entity, series);
      };
    }
    this._history.set(want);
    this._history.start();
  }

  /** Kazda nova hodnota posune krivku, nez prijde dalsi cele nacteni. */
  _pushHistory() {
    if (!this._history || !this._hass) return;
    var self = this;
    Layout.graphed(this._layout).forEach(function (w) {
      var st = self._hass.states[w.entity];
      if (!st) return;
      if (self._history.push(w.entity, st.state, Date.parse(st.last_updated || st.last_changed))) {
        self._view.setHistory(w.entity, self._history.get(w.entity));
      }
    });
  }

  _tap(entityId, item) {
    if (!this._hass || !entityId) return;
    if (item && item.tap === 'detail') { this._moreInfo(entityId); return; }
    var st = this._hass.states[entityId];
    var svc = U.tapService(entityId, st ? st.state : '');
    if (!svc) { this._moreInfo(entityId); return; }
    this._hass.callService(svc.domain, svc.service, { entity_id: entityId });
  }

  /** Podrobnosti o entitě - stejné okno, jaké otevírají ostatní karty. */
  _moreInfo(entityId) {
    var ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId: entityId };
    this.dispatchEvent(ev);
  }

  disconnectedCallback() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    if (this._history) this._history.stop();
    if (this._feeds) this._feeds.stop();
    if (this._view && this._view.destroy) this._view.destroy();
  }

  connectedCallback() {
    var self = this;
    if (this._view && !this._timer) {
      this._timer = setInterval(function () { self._tick(); }, 1000);
    }
    if (this._view && !this._ro && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self._fit(); });
      this._ro.observe(this);
    }
    if (this._history) this._history.start();
    this._fit();
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, HaPanelCard);
}

/* Aby se karta nabídla i ve vizuálním výběru karet. */
window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: 'HA Panel',
  description: 'Velké budíky a dlaždice pro tablet na zdi - stejný vzhled jako aplikace HA Panel.',
  preview: false,
  documentationURL: 'https://github.com/joshuaaaaa/HA-repo'
});

console.info('%c HA-PANEL-CARD %c ' + CARD_VERSION + ' ', 'background:#36d8ff;color:#04121a', 'background:#08131d;color:#cfe4f2');


})();

