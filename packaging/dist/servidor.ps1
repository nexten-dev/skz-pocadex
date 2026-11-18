# SKZ Pocadex - servidor local simples (sem Node.js).
# Serve a pasta "app" em http://localhost:4173 e abre o navegador.
# Usado pelo abrir.bat do pacote Dist. Para encerrar, feche a janela.
param([int]$Port = 4173)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = [System.IO.Path]::GetFullPath((Join-Path $root 'app'))
$sepChar = [string][System.IO.Path]::DirectorySeparatorChar
if (-not $app.EndsWith($sepChar)) { $app += $sepChar }

if (-not (Test-Path (Join-Path $app 'index.html'))) {
    Write-Host "[ERRO] Pasta 'app' nao encontrada ao lado deste arquivo." -ForegroundColor Red
    exit 1
}

$mime = @{
    '.html'        = 'text/html; charset=utf-8'
    '.js'          = 'text/javascript; charset=utf-8'
    '.mjs'         = 'text/javascript; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.json'        = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.png'         = 'image/png'
    '.jpg'         = 'image/jpeg'
    '.svg'         = 'image/svg+xml'
    '.ico'         = 'image/x-icon'
    '.txt'         = 'text/plain; charset=utf-8'
    '.woff2'       = 'font/woff2'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
    $listener.Start()
} catch {
    Write-Host ""
    Write-Host "[ERRO] Nao foi possivel usar a porta $Port." -ForegroundColor Red
    Write-Host "       Talvez o Pocadex ja esteja aberto em outra janela."
    Write-Host "       Abra http://localhost:$Port no navegador ou feche a outra janela."
    Start-Process "http://localhost:$Port/"
    exit 1
}

Write-Host ""
Write-Host " ========================================="
Write-Host "   SKZ Pocadex rodando em http://localhost:$Port"
Write-Host "   Para encerrar, feche esta janela."
Write-Host " ========================================="
Write-Host ""
Start-Process "http://localhost:$Port/"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
        $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
        if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
        $rel = $rel.Replace('/', $sepChar)
        $full = [System.IO.Path]::GetFullPath((Join-Path $app $rel))

        if (-not $full.StartsWith($app, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
            $res.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('Nao encontrado')
            $res.ContentType = 'text/plain; charset=utf-8'
        } else {
            $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
            $type = $mime[$ext]
            if (-not $type) { $type = 'application/octet-stream' }
            $res.ContentType = $type
            # A base de dados e as paginas sempre buscam a versao mais nova
            $res.Headers.Add('Cache-Control', 'no-cache')
            $bytes = [System.IO.File]::ReadAllBytes($full)
        }
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
        try { $res.StatusCode = 500 } catch {}
    } finally {
        $res.Close()
    }
}
