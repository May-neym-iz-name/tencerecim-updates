@echo off
REM Oturum basinda codebase-memory indeksini tazeletir.
REM NEDEN HOOK DOGRUDAN INDEKSLEMIYOR: harici CLI (codebase-memory-mcp cli
REM index_repository) baska bir Claude oturumunun sunucusu ayni proje DB'sini
REM acik tuttugunda COKUYOR. Sadece oturumun kendi MCP sunucusu uzerinden
REM index_repository cagrisi guvenilir. Bu yuzden hook is yapmaz, isi Claude'a
REM yaptirir.
echo INDEKS GOREVI (bu proje icin kalici emir):
echo Bu oturumda ilk grafik sorgusundan ONCE asagidaki 5 kapsami MCP
echo index_repository ile tazele. CLI KULLANMA.
echo   tencerecim-uygulama        -^> .                    (mode=full)
echo   tencerecim-urun-eslestirme -^> URUN-ESLESTIRME      (moderate)
echo   tencerecim-reklam          -^> REKLAM-KAMPANYALARI  (moderate)
echo   tencerecim-faturalar       -^> FATURALAR            (moderate)
echo   tencerecim-lava            -^> _lava-calisma        (moderate)
echo DIKKAT: kapsamlar arasi 2 bag grafikte GORUNMEZ - CLAUDE.md'deki tabloya bak.
echo Is bittiginde hafizayi (memory/) sormadan guncelle ve MEMORY.md'ye isle.
