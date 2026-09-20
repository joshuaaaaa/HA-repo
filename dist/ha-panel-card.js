/*! HA Panel Card 1.0.0 - https://github.com/joshuaaaaa/HA-repo
    Soubor je SESTAVENÝ. Needituj ho - uprav src/card/card.js nebo
    android/app/src/main/assets/js/*.js a spusť: node tools/build-card.mjs */

(function () {

'use strict';

var CARD_VERSION = "1.0.0";

var CARD_CSS = "/* ------------------------------------------------------------------\n   Panel pro Home Assistant - jeden vizualni system pro vsechny stavy.\n\n   Navrhovy prostor je pevny (2400 x 1080 na sirku, 1400 x 2000 na vysku)\n   a cela plocha se jen zvetsi na displej tabletu - proto jsou vsechny\n   rozmery v pixelech a na kazdem zarizeni vypadaji stejne.\n\n   Dve pravidla, ktera drzi cely vzhled pohromade:\n     1) Stav nese barvu I SLOVO - nikdy jen barvu.\n     2) Cisla jsou velka natolik, aby se dala precist pres pokoj.\n   ------------------------------------------------------------------ */\n:host{\n --a1:#36d8ff;--a2:#ff8b3e;--a3:#8af5bc;--a4:#c48aff;--a5:#ff5369;\n --good:#8af5bc;--warning:#ffd064;--serious:#ff9863;--critical:#ff5369;\n --void:#000;--pane:#080e14;--rail:#263541;--rail2:#455c6e;\n --ink:#f2f8ff;--ink2:#c0cfda;--muted:#90a5b6;\n --display:'Bahnschrift Condensed','Bahnschrift','Roboto Condensed','Arial Narrow',sans-serif;\n --mono:'Cascadia Mono','Consolas',ui-monospace,monospace;\n}\n*{box-sizing:border-box;margin:0;padding:0}\n\nbody{background:var(--void);color:var(--ink);font-family:var(--display);-webkit-font-smoothing:antialiased;\n -webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}\n.bg,.scan{position:absolute;inset:0;pointer-events:none}\n.bg{z-index:0;background:radial-gradient(ellipse at 15% 35%,#06364b80,transparent 48%),radial-gradient(ellipse at 90% 40%,#48200c60,transparent 48%),#020507}\n.scan{z-index:0;opacity:.18;background-image:linear-gradient(#47728c35 1px,transparent 1px),linear-gradient(90deg,#47728c35 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(transparent,#000,transparent)}\n\n/* ---------- plocha ---------- */\n#stage{position:absolute;top:0;left:0;width:2400px;height:1080px;transform-origin:top left;z-index:2;\n display:grid;grid-template-rows:84px 1fr auto;gap:16px;padding:24px 32px}\n.panel-root.is-portrait #stage{width:1400px;height:2000px;grid-template-rows:84px 1fr auto}\n\nheader{display:flex;align-items:center;gap:32px;position:relative;border-bottom:1px solid #324652;padding-bottom:10px}\nheader::after{content:'';position:absolute;bottom:-1px;left:0;width:220px;height:3px;background:var(--a1);box-shadow:0 0 18px #36d8ff60}\n.plate{display:flex;align-items:center;gap:18px;min-width:0}\n.plate .bar{width:48px;height:48px;flex:none;background:linear-gradient(135deg,var(--a1) 0 30%,transparent 30% 42%,var(--a1) 42% 61%,transparent 61% 73%,var(--a2) 73%);clip-path:polygon(18% 0,100% 0,82% 100%,0 100%)}\n.wordmark{font-size:43px;line-height:1;font-weight:800;letter-spacing:6px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.subline{font:16px var(--mono);letter-spacing:3px;color:var(--muted);margin-top:6px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.plate.empty{display:none}\n.badge{display:flex;align-items:center;gap:10px;border:1px solid #3b6358;background:#0c211d;padding:9px 14px;flex:none}\n.badge .led{width:8px;height:8px;background:var(--good);box-shadow:0 0 12px #8af5bc80}\n.badge span{font:18px var(--mono);color:var(--good);letter-spacing:2px;white-space:nowrap}\n.badge.warn{border-color:#6b5426;background:#211a0c}\n.badge.warn .led{background:var(--warning);box-shadow:0 0 12px #ffd06480;animation:breath 1.6s ease-in-out infinite}\n.badge.warn span{color:var(--warning)}\n.badge.bad{border-color:#6b2f34;background:#210d0f}\n.badge.bad .led{background:var(--critical);box-shadow:0 0 12px #ff536980}\n.badge.bad span{color:var(--critical)}\nheader .grow{flex:1}\n.clock .t{font:46px/1 var(--mono);letter-spacing:-2px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}\n.clock .d{font-size:18px;color:var(--muted);letter-spacing:1px;margin-top:5px;text-align:right;white-space:nowrap}\n/* Ozubene kolo: jedina cesta do editoru. Zamerne male a v rohu - panel\n   ma ukazovat data, ne ovladaci prvky. */\n.cog{flex:none;width:52px;height:52px;border:1px solid var(--rail);background:#0a141c;color:#6f8798;\n display:flex;align-items:center;justify-content:center;border-radius:4px}\n.cog svg{width:26px;height:26px;fill:currentColor}\n.cog:active{background:#12212c;color:var(--a1)}\n\n/* ---------- sekce s budikem ---------- */\n.mid{display:grid;grid-template-columns:1fr 1fr;gap:16px;min-height:0}\n.mid.one{grid-template-columns:1fr}\n.panel-root.is-portrait .mid{grid-template-columns:1fr;grid-auto-rows:1fr}\n.pane{position:relative;min-height:0;border:1px solid var(--rail);background:var(--pane);border-radius:4px 28px 4px 4px;overflow:hidden}\n.card{--accent:var(--a1);--rgb:54,216,255;display:flex;flex-direction:column;padding:20px 28px 14px;\n border-color:rgba(var(--rgb),.42);background:radial-gradient(ellipse at 22% 48%,rgba(var(--rgb),.13),transparent 62%),linear-gradient(120deg,#0b141d,#05090d 80%)}\n.card.t-amber{--accent:var(--a2);--rgb:255,139,62}\n.card.t-green{--accent:var(--a3);--rgb:138,245,188}\n.card.t-violet{--accent:var(--a4);--rgb:196,138,255}\n.card.t-red{--accent:var(--a5);--rgb:255,83,105}\n.card::before{content:'';position:absolute;top:0;left:0;width:48%;height:4px;background:var(--accent);box-shadow:0 0 24px rgba(var(--rgb),.6)}\n.card::after{content:'';position:absolute;right:18px;bottom:15px;width:68px;height:9px;background:repeating-linear-gradient(120deg,var(--accent) 0 4px,transparent 4px 10px);opacity:.45}\n.chead{display:flex;align-items:center;gap:16px;height:65px;flex:none;border-bottom:1px solid rgba(var(--rgb),.19);padding-bottom:12px}\n.chead .id{font:19px var(--mono);color:var(--accent);border:1px solid rgba(var(--rgb),.4);padding:8px 10px;background:rgba(var(--rgb),.06)}\n.chead .nm{font-size:44px;font-weight:800;letter-spacing:5px;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.chead .part{margin-left:auto;max-width:52%;font-size:22px;letter-spacing:1px;text-transform:uppercase;color:#b6c8d6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.cbody{display:flex;align-items:center;gap:24px;flex:1;min-height:0}\n.gw{position:relative;flex:none;width:520px;height:520px;color:var(--accent)}\n.panel-root.is-portrait .gw{width:430px;height:430px}\n.gw::before{content:'';position:absolute;inset:48px;border-radius:50%;background:radial-gradient(circle,rgba(var(--rgb),.08),transparent 69%);box-shadow:inset 0 0 36px rgba(var(--rgb),.06)}\n.gw svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}\n.gw .dial-frame{fill:none;stroke:var(--accent);stroke-width:.6;opacity:.35}\n.gw .dial-ticks{fill:none;stroke:var(--accent);stroke-width:3;stroke-dasharray:.6 9.5;opacity:.5}\n.gw .dial-core{fill:none;stroke:var(--accent);stroke-width:.6;opacity:.2}\n.gw .dial-caption{font:10px var(--mono);letter-spacing:2px;fill:var(--accent);opacity:.75}\n.gv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:9px}\n.gv .cap{font:19px var(--mono);letter-spacing:5px;color:#99b2c4;margin-bottom:20px;text-transform:uppercase}\n.gv .n{font:700 216px/.85 var(--display);letter-spacing:-10px;color:#d6e1e8;font-variant-numeric:tabular-nums}\n.gv .n.txt{font-size:92px;letter-spacing:-2px;text-align:center;padding:0 24px;line-height:1.05}\n.panel-root.is-portrait .gv .n{font-size:180px}\n.gv .u{font:28px var(--mono);color:var(--accent);margin-top:14px;letter-spacing:1px;min-height:28px}\n.gv .st{font-size:23px;font-weight:700;letter-spacing:2px;margin-top:19px;padding:5px 12px;background:#020609b0;border:1px solid currentColor}\n.cright{flex:1;min-width:0;display:flex;flex-direction:column;gap:30px;padding:0 0 12px}\n\n/* ---------- ukazatele a dlazdice ---------- */\n.meter .lbl{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:12px;white-space:nowrap}\n.meter .k{font-size:26px;letter-spacing:1px;color:var(--muted);overflow:hidden;text-overflow:ellipsis}\n.meter .k b{margin-left:14px;font:700 20px var(--display);letter-spacing:2px;text-transform:uppercase}\n.meter .v{font:500 50px var(--display);letter-spacing:-1px;font-variant-numeric:tabular-nums}\n.track{height:24px;position:relative;background:#010406;border:1px solid #344753;padding:3px;overflow:hidden}\n.fill{height:100%;width:0;transition:width .5s ease;mask-image:repeating-linear-gradient(90deg,#000 0 10px,transparent 10px 15px);-webkit-mask-image:repeating-linear-gradient(90deg,#000 0 10px,transparent 10px 15px)}\n.mnote{display:flex;justify-content:space-between;align-items:baseline;gap:14px;margin-top:11px;font:20px var(--mono);color:#829baa;white-space:nowrap}\n.mnote span{overflow:hidden;text-overflow:ellipsis}\n.tiles{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:4px}\n.tiles.t3{grid-template-columns:1fr 1fr 1fr}\n.tiles .tile{border-top:1px solid rgba(var(--rgb),.3);background:linear-gradient(rgba(var(--rgb),.06),transparent);padding:18px 8px 10px 12px;min-width:0}\n.tile .k{font-size:24px;letter-spacing:1px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.tile .v{font:600 57px/1.1 var(--display);letter-spacing:-1px;margin-top:8px;white-space:nowrap;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}\n.tile .v.txt{font-size:38px}\n.tile .v small{font-size:25px;font-weight:400;color:var(--muted);margin-left:8px;letter-spacing:0}\n\n/* ---------- spodni panely ---------- */\n.bot{display:grid;grid-template-columns:1fr 1fr;gap:16px;min-height:0}\n.bot.one{grid-template-columns:1fr}\n.panel-root.is-portrait .bot{grid-template-columns:1fr}\n.panel{display:flex;flex-direction:column;padding:18px 26px 16px;background:linear-gradient(120deg,#0b151b,#050a0e);min-height:268px}\n.panel-root.is-portrait .panel{min-height:220px}\n.ptitle{font:500 21px var(--display);color:#adc0cf;letter-spacing:3px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.ptitle::before{content:'';display:inline-block;width:5px;height:16px;background:var(--accent,var(--a3));margin-right:12px;vertical-align:-1px}\n.chead2{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px}\n.panel{--accent:var(--a3);--rgb:138,245,188}\n.panel.t-cyan{--accent:var(--a1);--rgb:54,216,255}\n.panel.t-amber{--accent:var(--a2);--rgb:255,139,62}\n.panel.t-violet{--accent:var(--a4);--rgb:196,138,255}\n.panel.t-red{--accent:var(--a5);--rgb:255,83,105}\n.psrc{font:18px var(--mono);letter-spacing:2px;color:var(--muted);white-space:nowrap}\n.prow{flex:1;min-height:0;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:22px;align-content:start}\n.prow.c3{grid-auto-flow:row;grid-template-columns:repeat(3,1fr)}\n.prow.wrap{grid-auto-flow:row;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}\n.lt{position:relative;border-top:1px solid rgba(var(--rgb),.3);background:linear-gradient(rgba(var(--rgb),.06),transparent);padding:12px 12px 6px;min-width:0}\n.lt.act{border-top-width:3px}\n.lt.act::after{content:'';position:absolute;right:10px;top:10px;width:9px;height:9px;background:var(--accent);opacity:.5}\n.lt.on{background:linear-gradient(rgba(var(--rgb),.22),rgba(var(--rgb),.04))}\n.lt:active{background:rgba(var(--rgb),.3)}\n.lt .lk{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:24px;letter-spacing:1px;color:var(--muted);white-space:nowrap}\n.lt .lk span{overflow:hidden;text-overflow:ellipsis}\n.lt .lst{flex:none;font-size:19px;font-weight:700;letter-spacing:2px;text-transform:uppercase}\n.lt .lv{font:600 62px/1.05 var(--display);letter-spacing:-1px;margin:2px 0 6px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.lt .lv.txt{font-size:40px;letter-spacing:0}\n.lt .lv small{font-size:24px;font-weight:400;color:var(--muted);margin-left:8px;letter-spacing:1px}\n.lt .track{height:18px}\n.lt .lr{font:20px var(--mono);color:#829baa;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.pempty{flex:1;display:flex;align-items:center;justify-content:center;font:22px var(--mono);letter-spacing:2px;color:#5f7686;text-align:center;padding:12px}\n\n/* ---------- pruh upozorneni (misto zahlavi) ---------- */\n#alert{position:absolute;top:24px;left:32px;right:32px;height:84px;z-index:6;display:flex;align-items:center;gap:24px;\n padding:15px 26px;background:linear-gradient(100deg,#103448,#08131d);border:1px solid #36d8ff80;border-left:5px solid var(--a1);\n transform:translateY(-150%);opacity:0;transition:transform .5s ease,opacity .4s;pointer-events:none}\n.panel-root.alert #alert{transform:none;opacity:1}\n.panel-root.alert header{visibility:hidden}\n#alert .al{display:flex;align-items:center;gap:12px;white-space:nowrap;font-size:26px;letter-spacing:2px;font-weight:700;color:var(--a1);text-transform:uppercase}\n#alert .al i{width:10px;height:10px;background:var(--a1);animation:breath 1.6s ease-in-out infinite}\n#alert .at{flex:1;min-width:40px;height:18px;background:#030b11;position:relative;overflow:hidden}\n#alert .af{width:0;height:100%;background:var(--a1);transition:width .45s;mask-image:repeating-linear-gradient(90deg,#000 0 10px,transparent 10px 15px)}\n#alert .ap{font:600 43px var(--display);min-width:140px;text-align:right;white-space:nowrap}\n#alert .ap small{font-size:23px;margin-left:6px;color:var(--muted)}\n#alert.text .at,#alert.text .ap{display:none}\n#alert .am{font-size:24px;color:var(--ink2);white-space:nowrap;text-align:right;overflow:hidden;text-overflow:ellipsis}\n\n/* ---------- klidovy rezim ---------- */\n#organism{position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:0;transition:opacity 1.8s}\n.panel-root.mode-ambient #organism{opacity:.28}\n#ambient{position:absolute;inset:0;z-index:4;display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 80px 36px}\n.panel-root.mode-ambient #ambient{display:flex;opacity:.5;animation:ambIn 1.2s ease both,ambientTravel 173s ease-in-out infinite alternate}\n.panel-root.mode-ambient header,.panel-root.mode-ambient .mid,.panel-root.mode-ambient .bot,.panel-root.mode-ambient #alert{display:none}\n.panel-root.mode-ambient .bg,.panel-root.mode-ambient .scan{display:none}\n#ambient .aclock{font:500 190px/1 var(--display);letter-spacing:1px;color:#eef7ff;font-variant-numeric:tabular-nums}\n#ambient .adate{font-size:32px;letter-spacing:6px;color:#7f9db1;margin-top:8px;text-transform:uppercase}\n#ambient .arow{display:flex;gap:220px;margin-top:30px}\n#ambient .acell{--accent:var(--a1);--rgb:54,216,255;position:relative;width:460px;height:460px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle,rgba(var(--rgb),.08),#02070bb0 57%,transparent 68%)}\n#ambient .acell:nth-child(2){--accent:var(--a2);--rgb:255,139,62}\n#ambient .acell::before{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid rgba(var(--rgb),.3);border-top:5px solid var(--accent);border-bottom:5px solid var(--accent);transform:rotate(-35deg);box-shadow:0 0 35px rgba(var(--rgb),.1),inset 0 0 35px rgba(var(--rgb),.08)}\n#ambient .acell::after{content:'';position:absolute;inset:16px;border-radius:50%;border:1px dashed rgba(var(--rgb),.4);pointer-events:none}\n#ambient .alabel{font-size:30px;font-weight:700;letter-spacing:8px;color:var(--accent);margin-bottom:12px;text-transform:uppercase}\n#ambient .aval{font:700 215px/.9 var(--display);letter-spacing:-8px;color:#d6e1e8;font-variant-numeric:tabular-nums}\n#ambient .aval.txt{font-size:80px;letter-spacing:0;text-align:center;padding:0 30px}\n#ambient .aunit{font:31px var(--mono);color:var(--accent);margin-top:8px;min-height:31px}\n#ambient .astate{font-size:23px;letter-spacing:3px;margin-top:16px;text-transform:uppercase}\n#ambient .aline{margin-top:26px;font:26px var(--mono);letter-spacing:2px;color:#7f9db1;white-space:nowrap}\n#ambient .aline b{font-weight:500;color:#cfe0ea}\n#ambient .atag{font:22px var(--mono);letter-spacing:4px;color:#8ca9bc;margin-top:30px;display:flex;align-items:center;gap:14px;text-transform:uppercase}\n#ambient .atag i{width:8px;height:8px;background:var(--a1);box-shadow:0 0 12px var(--a1);animation:breath 3s ease-in-out infinite}\n\n/* ---------- prekryvy stavu ---------- */\n.overlay{position:absolute;inset:0;z-index:70;display:none;flex-direction:column;align-items:center;justify-content:center;padding:5vmin;text-align:center}\n.panel-root.mode-down .ov-down,.panel-root.mode-setup .ov-setup{display:flex}\n.panel-root.mode-down #stage,.panel-root.mode-setup #stage{visibility:hidden;opacity:0}\n.panel-root.mode-down .bg,.panel-root.mode-down .scan{display:none}\n.state-kicker{font:clamp(10px,2.4vmin,25px) var(--mono);letter-spacing:.3em;text-transform:uppercase}\n.ov-down{background:radial-gradient(ellipse at 50% 45%,#35200d,#020405 70%)}\n.ov-down .state-kicker{color:var(--a2);margin-bottom:3vmin}\n.signal-mark{display:flex;align-items:center;justify-content:center;gap:1.3vmin;width:19vmin;height:19vmin;border:1px solid #986032;background:#29190b;clip-path:polygon(20% 0,100% 0,100% 80%,80% 100%,0 100%,0 20%);margin-bottom:3vmin}\n.signal-mark i{width:1.6vmin;background:var(--a2);animation:breath 1.8s ease-in-out infinite}\n.signal-mark i:nth-child(1){height:4vmin}.signal-mark i:nth-child(2){height:8vmin;animation-delay:.2s}.signal-mark i:nth-child(3){height:12vmin;animation-delay:.4s}\n.ov-down h2{font-size:8vmin;letter-spacing:.08em;text-transform:uppercase;color:#ffc28b}\n.ov-down p{font-size:3vmin;max-width:85vw;color:#c5ad97;margin-top:2vmin}\n.ov-down .state-note{font:2.3vmin var(--mono);color:#ac815a;letter-spacing:.08em;border-top:1px solid #604124;padding-top:3vmin;margin-top:4vmin}\n.ov-setup{background:radial-gradient(ellipse at 50% 40%,#0a2b3b,#020508 68%)}\n.ov-setup .state-kicker{color:var(--a1);margin-bottom:3vmin}\n.ov-setup h2{font-size:6vmin;letter-spacing:.08em;text-transform:uppercase;color:#cfe9f6}\n.ov-setup p{font-size:2.8vmin;max-width:80vw;color:#9fc0d2;margin-top:2vmin;line-height:1.5}\n.bigbtn{margin-top:5vmin;padding:2.2vmin 5vmin;font:3vmin var(--display);letter-spacing:.2em;text-transform:uppercase;\n color:#04121a;background:var(--a1);border:none;border-radius:3px}\n.bigbtn.ghost{background:transparent;color:var(--a1);border:1px solid var(--a1)}\n\n/* ---------- start ---------- */\n#boot{position:absolute;inset:0;z-index:90;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4vmin;background:radial-gradient(ellipse at 50% 35%,#0a2b3b,#020508 65%);overflow:hidden}\n#boot::before,#boot::after{content:'';position:absolute;left:50%;top:43%;width:69vmin;height:69vmin;border:1px solid #36d8ff25;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}\n#boot::after{width:83vmin;height:83vmin;border-style:dashed;border-color:#36d8ff15}\n#boot.done{animation:bootOut .7s ease forwards}\n#boot .boot-emblem{position:relative;width:15vmin;height:15vmin;border:2px solid var(--a1);border-left-color:transparent;border-right-color:var(--a2);border-radius:50%;margin-bottom:1vmin;box-shadow:0 0 7vmin #36d8ff20;animation:reactorIn 1.8s ease both}\n#boot .boot-emblem::before{content:'';position:absolute;inset:3vmin;background:linear-gradient(135deg,var(--a1) 0 32%,transparent 32% 44%,var(--a1) 44% 62%,transparent 62% 74%,var(--a2) 74%);clip-path:polygon(20% 0,100% 0,80% 100%,0 100%)}\n#boot .boot-kicker{font:2.2vmin var(--mono);letter-spacing:.3em;text-transform:uppercase;color:#75b3cf;z-index:1}\n#boot .bl{width:54vw;max-width:900px;height:1.3vmin;background:#142833;margin-top:2vmin;z-index:1;overflow:hidden}\n#boot .bl i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--a1) 70%,#fff);transition:width .35s;mask-image:repeating-linear-gradient(90deg,#000 0 12px,transparent 12px 17px)}\n#boot .bt{font:2.6vmin var(--mono);height:4vmin;color:#b3cfdd;letter-spacing:.1em;z-index:1}\n#boot .boot-steps{display:flex;gap:2vmin;z-index:1}\n#boot .boot-steps i{width:5vmin;height:.4vmin;background:#284052}\n#boot .boot-steps i.active{background:var(--a1)}\n\n/* ---------- drobnosti ---------- */\n#pulse{position:absolute;inset:0;z-index:60;pointer-events:none;opacity:0;background:linear-gradient(100deg,transparent 20%,#36d8ff30 48%,#ff8b3e20 52%,transparent 80%)}\n#pulse.go{animation:shock 1.1s ease-out forwards}\n#toast{position:absolute;left:50%;bottom:6vmin;transform:translateX(-50%) translateY(20px);z-index:95;opacity:0;\n padding:14px 28px;background:#08131de6;border:1px solid #34576c;color:#cfe4f2;font:2.2vmin var(--mono);letter-spacing:1px;\n transition:opacity .3s,transform .3s;pointer-events:none;max-width:80vw;text-align:center}\n#toast.show{opacity:1;transform:translateX(-50%)}\n\n/* Cerna, dokud Android dokoncuje sve zhasinani - pod ni nesmi nic bezet. */\n.panel-root.oled-off{background:#000}\n.panel-root.oled-off > *{visibility:hidden!important;pointer-events:none!important}\n.panel-root.oled-off *{animation:none!important}\n\n@keyframes breath{0%,100%{opacity:.35}50%{opacity:1}}\n@keyframes spin{to{transform:rotate(360deg)}}\n@keyframes shock{0%{opacity:0;transform:translateX(-100%)}30%{opacity:1}100%{opacity:0;transform:translateX(100%)}}\n@keyframes reactorIn{from{opacity:0;transform:rotate(-160deg) scale(.6)}to{opacity:1;transform:rotate(0) scale(1)}}\n@keyframes bootOut{to{opacity:0;visibility:hidden;filter:blur(5px)}}\n@keyframes rise{from{opacity:0;transform:translateY(24px);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}\n.anim{animation:rise .7s cubic-bezier(.2,.75,.3,1) backwards}\n@keyframes ambIn{from{opacity:0}to{opacity:.5}}\n@keyframes ambientTravel{0%{transform:translate(-140px,-20px)}33%{transform:translate(100px,12px)}66%{transform:translate(-60px,20px)}100%{transform:translate(140px,-12px)}}\n@media(prefers-reduced-motion:reduce){\n *,*::before,*::after{animation:none!important;transition:none!important}\n #organism,#boot{display:none}\n}\n\n:host{display:block;position:relative;contain:content}\n.panel-root{position:relative;width:100%;overflow:hidden;border-radius:12px;background:#020507;color:#f2f8ff}\n#stage{position:absolute;top:0;left:0;transform-origin:top left;height:auto;min-height:0}\n#boot,#organism,#pulse,#toast,#editor,#picker,.overlay,#vhProbe{display:none!important}\n.bg,.scan{position:absolute;inset:0}\n";

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

  return {
    DAYS: DAYS, MONTHS: MONTHS, TONES: TONES, WORDS: WORDS, BINARY: BINARY, SUGGEST: SUGGEST,
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
    return { v: VERSION, title: '', subtitle: '', cards: [], panels: [],
             ambient: emptyAmbient(), alert: null, control: { screen: '', brightness: '' } };
  }

  function emptyAmbient() {
    return { left: null, right: null, line: [] };
  }

  function newCard() {
    return {
      id: id('card'), name: 'Nová sekce', code: '', tone: 'cyan',
      dial: { entity: '', caption: '', unit: '', min: 0, max: 100, decimals: null, levels: [] },
      meters: [], tiles: []
    };
  }

  function newPanel() {
    return { id: id('panel'), name: 'Nový panel', tone: 'green', items: [] };
  }

  function newItem(entity) {
    return { entity: entity || '', name: '', unit: '', attribute: '', decimals: null,
             tap: 'auto', bar: false, min: 0, max: 100, levels: [] };
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
      tap: ['auto', 'none', 'toggle'].indexOf(r.tap) >= 0 ? r.tap : 'auto',
      bar: !!r.bar,
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
      dial: {
        entity: str(d.entity, ''),
        caption: str(d.caption, ''),
        unit: str(d.unit, ''),
        attribute: str(d.attribute, ''),
        decimals: (d.decimals === null || d.decimals === undefined || d.decimals === '') ? null : Math.max(0, Math.min(3, nOr(d.decimals, 0))),
        min: min, max: max,
        levels: normLevels(d.levels)
      },
      meters: (Array.isArray(r.meters) ? r.meters : []).slice(0, 4).map(function (m) {
        var it = normItem(m); it.bar = true; return it;
      }),
      tiles: (Array.isArray(r.tiles) ? r.tiles : []).slice(0, 6).map(normItem)
    };
  }

  function normPanel(raw) {
    var r = raw || {};
    return {
      id: str(r.id, id('panel')),
      name: str(r.name, 'Panel'),
      tone: tone(r.tone, 'green'),
      items: (Array.isArray(r.items) ? r.items : []).slice(0, 8).map(normItem)
    };
  }

  /** Jediny vstupni bod: cokoli prijde, odejde platne rozvrzeni. */
  function normalize(raw) {
    var r = raw || {};
    if (typeof r === 'string') {
      try { r = JSON.parse(r); } catch (e) { r = {}; }
    }
    var out = {
      v: VERSION,
      title: str(r.title, ''),
      subtitle: str(r.subtitle, ''),
      cards: (Array.isArray(r.cards) ? r.cards : []).slice(0, 2).map(normCard),
      panels: (Array.isArray(r.panels) ? r.panels : []).slice(0, 2).map(normPanel),
      ambient: emptyAmbient(),
      alert: null,
      // Ovladani tabletu z Home Assistantu: prepinac pro displej a
      // cislo pro jas. Panel je jen posloucha, sam je nemeni.
      control: {
        screen: str((r.control || {}).screen, ''),
        brightness: str((r.control || {}).brightness, '')
      }
    };
    var a = r.ambient || {};
    out.ambient.left = a.left && a.left.entity ? normItem(a.left) : null;
    out.ambient.right = a.right && a.right.entity ? normItem(a.right) : null;
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
    return out;
  }

  /** Vsechny entity, na kterych rozvrzeni stoji - pro kontrolu dostupnosti. */
  function entities(l) {
    var out = [];
    function add(e) { if (e && out.indexOf(e) < 0) out.push(e); }
    (l.cards || []).forEach(function (c) {
      add(c.dial.entity);
      (c.meters || []).forEach(function (m) { add(m.entity); });
      (c.tiles || []).forEach(function (t) { add(t.entity); });
    });
    (l.panels || []).forEach(function (p) {
      (p.items || []).forEach(function (i) { add(i.entity); });
    });
    if (l.ambient) {
      if (l.ambient.left) add(l.ambient.left.entity);
      if (l.ambient.right) add(l.ambient.right.entity);
      (l.ambient.line || []).forEach(function (i) { add(i.entity); });
    }
    if (l.alert) add(l.alert.entity);
    if (l.control) { add(l.control.screen); add(l.control.brightness); }
    return out;
  }

  function isEmpty(l) {
    return !l || ((l.cards || []).length === 0 && (l.panels || []).length === 0);
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
      l.cards.push(c);
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
      l.panels.push(p);
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
      l.panels.push(lp);
    }

    // I v klidovem rezimu plati "barva a slovo" - stupne tedy jedou s sebou.
    function ambItem(st) {
      var sug = U.suggest(st);
      return normItem({ entity: st.entity_id, name: U.name(st), levels: sug.levels,
                        decimals: sug.decimals });
    }
    if (temps[0]) l.ambient.left = ambItem(temps[0]);
    if (temps[1] || hums[0]) l.ambient.right = ambItem(temps[1] || hums[0]);
    return normalize(l);
  }

  return {
    VERSION: VERSION, TONES: TONES,
    empty: empty, newCard: newCard, newPanel: newPanel, newItem: newItem,
    normalize: normalize, entities: entities, isEmpty: isEmpty, fromStates: fromStates,
    id: id
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Layout;


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
    host.appendChild(header);

    /* ---------- pruh upozorneni ---------- */
    var alertBar = el('div', '');
    alertBar.id = 'alert';
    alertBar.innerHTML = '<div class="al"><i></i><span class="alx">Upozornění</span></div>'
      + '<div class="at"><div class="af"></div></div>'
      + '<div class="ap"><span class="apv">0</span><small>%</small></div>'
      + '<div class="am">—</div>';
    host.appendChild(alertBar);

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

    /* ---------- sekce s budikem ---------- */
    var mid = el('div', 'mid' + (layout.cards.length === 1 ? ' one' : ''));
    layout.cards.forEach(function (card, idx) {
      mid.appendChild(buildCard(card, idx, bind, ctx));
    });
    if (layout.cards.length) host.appendChild(mid);

    /* ---------- spodni panely ---------- */
    var bot = el('div', 'bot' + (layout.panels.length === 1 ? ' one' : ''));
    layout.panels.forEach(function (p, idx) {
      bot.appendChild(buildPanel(p, idx, bind, ctx));
    });
    if (layout.panels.length) host.appendChild(bot);

    /* ---------- klidova obrazovka ---------- */
    // V karte pro Lovelace klidovy rezim nema smysl - dashboard nikdy
    // nezhasina - a tak se ani nestavi.
    var aClock = null, aDate = null;
    if (!ctx.noAmbient) {
      var amb = el('div', '');
      amb.id = 'ambient';
      aClock = el('div', 'aclock', '--:--');
      aDate = el('div', 'adate', '—');
      amb.appendChild(aClock);
      amb.appendChild(aDate);

      var arow = el('div', 'arow');
      [layout.ambient.left, layout.ambient.right].forEach(function (item) {
        if (!item) return;
        var cell = el('div', 'acell');
        var lab = el('div', 'alabel', item.name || '');
        var val = el('div', 'aval', '--');
        var unit = el('div', 'aunit', '');
        var state = el('div', 'astate', '—');
        cell.appendChild(lab);
        cell.appendChild(val);
        cell.appendChild(unit);
        cell.appendChild(state);
        arow.appendChild(cell);
        bind(item.entity, function (st) {
          var d = U.display(st, item);
          if (!lab.textContent) lab.textContent = U.name(st, item.name);
          val.textContent = d.text;
          val.classList.toggle('txt', isNaN(d.n));
          unit.textContent = d.unit;
          var lv = U.level(d.n, item.levels);
          state.textContent = d.has ? (item.levels.length ? lv.word : (d.word || '')) : 'Nedostupné';
          state.style.color = item.levels.length ? lv.color : '#7f9db1';
        });
      });
      if (arow.children.length) amb.appendChild(arow);

      (layout.ambient.line || []).forEach(function (item) {
        var line = el('div', 'aline');
        var k = el('b', '', '');
        line.appendChild(document.createTextNode(''));
        line.appendChild(k);
        amb.appendChild(line);
        bind(item.entity, function (st) {
          var d = U.display(st, item);
          line.firstChild.nodeValue = (U.name(st, item.name) || '') + ': ';
          k.textContent = d.text + (d.unit ? ' ' + d.unit : '');
        });
      });

      var tag = el('div', 'atag');
      tag.appendChild(el('i'));
      tag.appendChild(document.createTextNode('Klidový režim'));
      amb.appendChild(tag);
      host.appendChild(amb);
    }


    /* ---------- prazdny panel ---------- */
    if (!layout.cards.length && !layout.panels.length) {
      var hint = el('div', 'pane panel anim');
      hint.style.gridColumn = '1 / -1';
      var inner = el('div', 'pempty');
      inner.innerHTML = 'Panel zatím nic neukazuje.<br>Klepni na ozubené kolo vpravo nahoře a vyber entity.';
      hint.appendChild(inner);
      var wrap = el('div', 'mid one');
      wrap.appendChild(hint);
      host.insertBefore(wrap, alertBar.nextSibling);
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

    return {
      bindings: bindings,
      refresh: refresh,
      refreshOne: refreshOne,
      badge: badge,
      clock: { t: clockT, d: clockD, aTime: aClock, aDate: aDate }
    };
  }

  /* ---------- jedna sekce ---------- */
  function buildCard(card, idx, bind, ctx) {
    var sec = el('section', 'pane card anim' + toneClass(card.tone));
    sec.style.animationDelay = (0.06 + idx * 0.08) + 's';

    var head = el('div', 'chead');
    if (card.code) head.appendChild(el('div', 'id', card.code));
    head.appendChild(el('div', 'nm', card.name || ''));
    var part = el('span', 'part', '');
    head.appendChild(part);
    sec.appendChild(head);

    var body = el('div', 'cbody');
    var gw = el('div', 'gw');
    var g = svg('<circle class="dial-frame" cx="159" cy="159" r="156"/>'
      + '<circle class="dial-ticks" cx="159" cy="159" r="153"/>'
      + '<circle class="dial-core" cx="159" cy="159" r="120"/>'
      + '<g class="seg">' + dialPaths() + '</g>'
      + '<text class="dial-caption" x="159" y="300" text-anchor="middle">'
      + card.dial.min + ' — ' + card.dial.max + '</text>');
    gw.appendChild(g);

    var gv = el('div', 'gv');
    var cap = el('div', 'cap', card.dial.caption || '');
    var nEl = el('div', 'n', '--');
    var uEl = el('div', 'u', '');
    var stEl = el('div', 'st', '—');
    gv.appendChild(cap); gv.appendChild(nEl); gv.appendChild(uEl); gv.appendChild(stEl);
    gw.appendChild(gv);
    body.appendChild(gw);

    var seg = g.querySelector('.seg');
    var accent = ACCENT[card.tone] || ACCENT.cyan;

    bind(card.dial.entity, function (st) {
      var d = U.display(st, card.dial);
      // Jmeno entity vedle nadpisu jen tehdy, kdyz rika neco noveho -
      // dvakrat totez vedle sebe je jen sum.
      var ent = U.name(st, '') || '';
      part.textContent = ent.toLowerCase() === String(card.name || '').toLowerCase() ? '' : ent;
      nEl.textContent = d.text;
      nEl.classList.toggle('txt', isNaN(d.n));
      uEl.textContent = d.unit;
      var lv = U.level(d.n, card.dial.levels);
      var hasLevels = card.dial.levels && card.dial.levels.length;
      stEl.textContent = d.has ? (hasLevels ? lv.word : (d.word || '')) : 'Nedostupné';
      stEl.style.color = hasLevels ? lv.color : '#7f8b99';
      stEl.style.display = stEl.textContent && stEl.textContent !== '—' ? '' : 'none';
      var ratio = isNaN(d.n) ? (d.has && String(st.state) === 'on' ? 1 : 0)
                             : (d.n - card.dial.min) / (card.dial.max - card.dial.min);
      setSeg(seg, ratio, hasLevels ? lv.color : accent);
    });

    // Cerstve pridana sekce jeste entitu nema - at je videt proc, misto
    // aby budik nekonecne ukazoval dve pomlcky.
    if (!card.dial.entity) {
      nEl.textContent = '—';
      nEl.classList.add('txt');
      stEl.textContent = 'Vyber entitu';
      stEl.style.color = '#7f8b99';
    }

    var right = el('div', 'cright');
    (card.meters || []).forEach(function (m) {
      right.appendChild(buildMeter(m, bind, accent));
    });
    if (card.tiles && card.tiles.length) {
      var tiles = el('div', 'tiles' + (card.tiles.length % 3 === 0 && card.tiles.length > 2 ? ' t3' : ''));
      card.tiles.forEach(function (t) { tiles.appendChild(buildTile(t, bind)); });
      right.appendChild(tiles);
    }
    body.appendChild(right);
    sec.appendChild(body);
    return sec;
  }

  /* ---------- ukazatel s pruhem ---------- */
  function buildMeter(item, bind, accent) {
    var m = el('div', 'meter');
    var lbl = el('div', 'lbl');
    var k = el('span', 'k');
    var kText = document.createTextNode(item.name || '');
    var kState = el('b', '', '');
    k.appendChild(kText);
    k.appendChild(kState);
    var v = el('span', 'v', '--');
    lbl.appendChild(k); lbl.appendChild(v);
    var track = el('div', 'track');
    var fill = el('div', 'fill');
    track.appendChild(fill);
    m.appendChild(lbl); m.appendChild(track);

    bind(item.entity, function (st) {
      var d = U.display(st, item);
      if (!item.name) kText.nodeValue = U.name(st, '');
      v.textContent = d.text + (d.unit ? ' ' + d.unit : '');
      var lv = U.level(d.n, item.levels);
      var has = item.levels && item.levels.length;
      kState.textContent = has && d.has ? lv.word : '';
      kState.style.color = lv.color;
      fill.style.width = U.pct(d.n, item.min, item.max) + '%';
      fill.style.background = has ? lv.color : accent;
      v.style.color = has && d.has ? lv.color : '';
    });
    return m;
  }

  /* ---------- mala dlazdice v sekci ---------- */
  function buildTile(item, bind) {
    var t = el('div', 'tile');
    var k = el('div', 'k', item.name || '');
    var v = el('div', 'v', '--');
    t.appendChild(k); t.appendChild(v);
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
  function buildPanel(panel, idx, bind, ctx) {
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
      row.appendChild(buildPanelItem(item, bind, ctx, accent));
    });
    sec.appendChild(row);
    return sec;
  }

  function buildPanelItem(item, bind, ctx, accent) {
    // Znacka "tohle jde prepnout" patri jen tomu, co se opravdu prepina.
    // Karta v Lovelace navic necha klepnout na cokoli - u cidla se otevre
    // podrobnost, jak je v Home Assistantu zvykem.
    var tappable = item.tap === 'toggle' || (item.tap === 'auto' && U.switchable(item.entity));
    var clickable = tappable || (ctx.tapAll && item.entity && item.tap !== 'none');
    var t = el('div', 'lt' + (tappable ? ' act' : ''));
    var lk = el('div', 'lk');
    var name = el('span', '', item.name || '');
    var stWord = el('span', 'lst', '');
    lk.appendChild(name); lk.appendChild(stWord);
    var lv = el('div', 'lv', '--');
    t.appendChild(lk); t.appendChild(lv);

    var fill = null;
    if (item.bar) {
      var track = el('div', 'track');
      fill = el('div', 'fill');
      track.appendChild(fill);
      t.appendChild(track);
    }
    var note = el('div', 'lr', item.entity ? '' : 'bez entity');
    t.appendChild(note);

    if (clickable) {
      t.addEventListener('click', function () {
        if (ctx.onTap) ctx.onTap(item.entity);
      });
    }

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
      var on = st && (st.state === 'on' || st.state === 'open' || st.state === 'playing'
                   || st.state === 'unlocked' || st.state === 'cleaning');
      t.classList.toggle('on', !!on);
      note.textContent = st ? U.ago(st.last_changed) : 'entita v Home Assistantu není';
    });
    return t;
  }

  return { build: build, setSeg: setSeg, dialPaths: dialPaths };
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
  var out = {
    title: config.title || '',
    subtitle: config.subtitle || '',
    cards: [], panels: [], ambient: {}, alert: config.alert || null
  };
  (config.sections || config.cards || []).forEach(function (s) {
    out.cards.push({
      id: s.id, name: s.name, code: s.code, tone: s.tone,
      dial: {
        entity: s.entity, caption: s.caption, unit: s.unit, attribute: s.attribute,
        decimals: s.decimals, min: s.min, max: s.max, levels: s.levels
      },
      meters: s.meters, tiles: s.tiles
    });
  });
  (config.panels || []).forEach(function (p) { out.panels.push(p); });
  return Layout.normalize(out);
}

/**
 * Co uživatel v konfiguraci nevyplnil, doplní se podle druhu čidla -
 * rozsah budíku, stupně i popisek. Bez toho by karta s jedinou řádkou
 * `entity:` ukazovala budík od 0 do 100 a bez jediného slova.
 */
function fillFromHass(layout, states) {
  (layout.cards || []).forEach(function (c) {
    if (!c.dial.entity) return;
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
    this._fit();
  }

  getCardSize() {
    var rows = 1;
    (this._layout ? this._layout.cards : []).forEach(function () { rows += 6; });
    (this._layout ? this._layout.panels : []).forEach(function () { rows += 3; });
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
      onTap: function (entityId) { self._tap(entityId); }
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
    // Výška se měří až po vykreslení - panel je tak vysoký, kolik potřebuje.
    var h = this._stage.scrollHeight || (narrow ? 2000 : 1080);
    this._root.style.height = Math.round(h * scale) + 'px';
  }

  _tap(entityId) {
    if (!this._hass || !entityId) return;
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

