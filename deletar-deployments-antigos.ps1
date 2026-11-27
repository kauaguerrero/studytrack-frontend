<#
.SYNOPSIS
    Apaga deployments da Vercel mais antigos que 30 dias para o projeto studytrack-frontend.

.DESCRIPTION
    Fluxo:
      1. Le o token de VERCEL_API_TOKEN em .env.local (raiz do projeto).
      2. Descobre o projectId real via GET /v9/projects/studytrack-frontend.
      3. Lista TODOS os deployments via GET /v6/deployments, paginando com "until"
         enquanto houver proxima pagina (nao apenas os primeiros 100).
      4. Filtra os deployments cujo campo "created" (epoch em ms) e mais antigo que 30 dias.
      5. Imprime a lista filtrada (uid, url, data formatada) e a contagem total.
      6. Pede confirmacao explicita (Read-Host). NADA e apagado sem isso -> dry-run por padrao.
      7. So se a resposta for exatamente "CONFIRMAR" (case-sensitive), roda
         DELETE /v13/deployments/{uid} para cada item da lista, com log por item.

    Validacao:
      - Rodar sem digitar CONFIRMAR: nao apaga nada.
      - Rodar e digitar CONFIRMAR: apaga exatamente os deployments listados e nenhum outro.

.NOTES
    Opcional: defina VERCEL_TEAM_ID em .env.local se o projeto pertencer a um time.
#>

$ErrorActionPreference = 'Stop'

# ----------------------------------------------------------------------------
# Configuracao
# ----------------------------------------------------------------------------
$ProjectName = 'studytrack-frontend'
$DiasLimite  = 30
$EnvPath     = Join-Path $PSScriptRoot '.env.local'

# ----------------------------------------------------------------------------
# 1. Ler token (e teamId opcional) de .env.local
# ----------------------------------------------------------------------------
if (-not (Test-Path $EnvPath)) {
    throw "Arquivo .env.local nao encontrado em: $EnvPath"
}

function Get-EnvValue {
    param([string]$Nome)
    foreach ($linha in Get-Content -LiteralPath $EnvPath) {
        if ($linha -match "^\s*$([regex]::Escape($Nome))\s*=\s*(.*?)\s*$") {
            return $matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return $null
}

$Token  = Get-EnvValue 'VERCEL_API_TOKEN'
$TeamId = Get-EnvValue 'VERCEL_TEAM_ID'

if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "VERCEL_API_TOKEN nao encontrado (ou vazio) em .env.local"
}

$Headers = @{ Authorization = "Bearer $Token" }
$TeamQS  = if ([string]::IsNullOrWhiteSpace($TeamId)) { '' } else { "&teamId=$TeamId" }
$TeamQS1 = if ([string]::IsNullOrWhiteSpace($TeamId)) { '' } else { "?teamId=$TeamId" }

Write-Host "Projeto alvo : $ProjectName" -ForegroundColor Cyan
if ($TeamId) { Write-Host "Team ID      : $TeamId" -ForegroundColor Cyan }

# ----------------------------------------------------------------------------
# 2. Descobrir o projectId real
# ----------------------------------------------------------------------------
try {
    $proj = Invoke-RestMethod -Method Get -Headers $Headers `
        -Uri "https://api.vercel.com/v9/projects/$ProjectName$TeamQS1"
}
catch {
    throw "Falha ao buscar o projeto '$ProjectName' na Vercel: $($_.Exception.Message)"
}

$ProjectId = $proj.id
if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    throw "Nao foi possivel resolver o projectId a partir da resposta da API."
}
Write-Host "Project ID   : $ProjectId" -ForegroundColor Cyan
Write-Host ''

# ----------------------------------------------------------------------------
# 3. Listar TODOS os deployments (paginando com 'until')
# ----------------------------------------------------------------------------
Write-Host "Buscando todos os deployments (paginando)..." -ForegroundColor Cyan

$todos = New-Object System.Collections.Generic.List[object]
$until = $null
$pagina = 0

do {
    $pagina++
    $uri = "https://api.vercel.com/v6/deployments?projectId=$ProjectId&limit=100$TeamQS"
    if ($until) { $uri += "&until=$until" }

    try {
        $resp = Invoke-RestMethod -Method Get -Headers $Headers -Uri $uri
    }
    catch {
        throw "Falha ao listar deployments (pagina $pagina): $($_.Exception.Message)"
    }

    if ($resp.deployments) {
        foreach ($d in $resp.deployments) { $todos.Add($d) }
    }

    $until = $resp.pagination.next
    Write-Host ("  pagina {0,-3} -> acumulado: {1} deployments" -f $pagina, $todos.Count)
} while ($until)

Write-Host "Total de deployments no projeto: $($todos.Count)" -ForegroundColor Cyan
Write-Host ''

# ----------------------------------------------------------------------------
# 4. Filtrar os mais antigos que 30 dias
# ----------------------------------------------------------------------------
$corteMs = [DateTimeOffset]::UtcNow.AddDays(-$DiasLimite).ToUnixTimeMilliseconds()
$corteLocal = [DateTimeOffset]::FromUnixTimeMilliseconds($corteMs).LocalDateTime

$antigos = foreach ($d in $todos) {
    $criadoMs = [int64]$d.created
    if ($criadoMs -lt $corteMs) {
        [pscustomobject]@{
            uid     = $d.uid
            url     = $d.url
            criado  = [DateTimeOffset]::FromUnixTimeMilliseconds($criadoMs).LocalDateTime
            estado  = $d.state
        }
    }
}

$antigos = @($antigos | Sort-Object criado)

# ----------------------------------------------------------------------------
# 5. Imprimir lista filtrada + contagem ANTES de qualquer DELETE
# ----------------------------------------------------------------------------
Write-Host ("Corte: deployments criados antes de {0:yyyy-MM-dd HH:mm:ss} ({1} dias atras)" -f $corteLocal, $DiasLimite) -ForegroundColor Yellow
Write-Host ''

if ($antigos.Count -eq 0) {
    Write-Host "Nenhum deployment mais antigo que $DiasLimite dias. Nada a fazer." -ForegroundColor Green
    return
}

$antigos |
    Select-Object `
        @{ n = 'uid'; e = { $_.uid } },
        @{ n = 'url'; e = { $_.url } },
        @{ n = 'criado'; e = { '{0:yyyy-MM-dd HH:mm:ss}' -f $_.criado } },
        @{ n = 'estado'; e = { $_.estado } } |
    Format-Table -AutoSize | Out-Host

Write-Host ("TOTAL A APAGAR: {0} deployments" -f $antigos.Count) -ForegroundColor Yellow
Write-Host ''

# ----------------------------------------------------------------------------
# 6. Confirmacao explicita (dry-run por padrao)
# ----------------------------------------------------------------------------
$resposta = Read-Host "Digite CONFIRMAR para apagar $($antigos.Count) deployments"

# 7. So apaga se a resposta for EXATAMENTE "CONFIRMAR" (case-sensitive)
if ($resposta -cne 'CONFIRMAR') {
    Write-Host ''
    Write-Host "Confirmacao nao recebida (resposta: '$resposta'). Nenhum deployment foi apagado (dry-run)." -ForegroundColor Green
    return
}

# ----------------------------------------------------------------------------
# DELETE de cada deployment da lista
# ----------------------------------------------------------------------------
Write-Host ''
Write-Host "Apagando $($antigos.Count) deployments..." -ForegroundColor Magenta
Write-Host ''

$ok  = 0
$err = 0

foreach ($d in $antigos) {
    $uri = "https://api.vercel.com/v13/deployments/$($d.uid)$TeamQS1"
    try {
        Invoke-RestMethod -Method Delete -Headers $Headers -Uri $uri | Out-Null
        $ok++
        Write-Host ("  OK    {0}  {1}  ({2:yyyy-MM-dd})" -f $d.uid, $d.url, $d.criado) -ForegroundColor Green
    }
    catch {
        $err++
        Write-Host ("  ERRO  {0}  {1}  ->  {2}" -f $d.uid, $d.url, $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ''
Write-Host ("Concluido. Sucesso: {0}  |  Erros: {1}  |  Total processado: {2}" -f $ok, $err, $antigos.Count) -ForegroundColor Magenta
