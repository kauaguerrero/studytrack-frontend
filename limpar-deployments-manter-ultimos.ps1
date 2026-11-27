<#
.SYNOPSIS
    Limpa deployments da Vercel do projeto studytrack-frontend, mantendo apenas os N mais recentes.

.DESCRIPTION
    Diferente de deletar-deployments-antigos.ps1 (que corta por idade de 30 dias),
    este script ordena TODOS os deployments por data de criacao e mantem somente
    os $ManterUltimos mais novos -> tudo o resto entra na fila de exclusao.

    Fluxo:
      1. Le o token de VERCEL_API_TOKEN em .env.local (e VERCEL_TEAM_ID, opcional).
      2. Descobre o projectId real via GET /v9/projects/studytrack-frontend.
         Guarda tambem o id do deployment de producao ativo (targets.production.id)
         para NUNCA apaga-lo, mesmo que ele nao esteja entre os N mais recentes.
      3. Lista TODOS os deployments via GET /v6/deployments, paginando com "until"
         enquanto houver proxima pagina.
      4. Ordena por "created" (epoch em ms) desc e separa:
           - MANTER : os $ManterUltimos mais recentes  (+ o de producao ativo)
           - APAGAR : todos os demais
      5. Imprime as duas listas (uid, url, data) e a contagem a apagar.
      6. Pede confirmacao explicita (Read-Host). NADA e apagado sem isso -> dry-run por padrao.
      7. So se a resposta for exatamente "CONFIRMAR" (case-sensitive), roda
         DELETE /v13/deployments/{uid} para cada item da fila, com log por item.

    Validacao:
      - Rodar sem digitar CONFIRMAR: nao apaga nada.
      - Rodar e digitar CONFIRMAR: apaga exatamente os deployments da lista APAGAR
        (nunca os N mantidos, nunca o de producao ativo).
#>

$ErrorActionPreference = 'Stop'

# ----------------------------------------------------------------------------
# Configuracao
# ----------------------------------------------------------------------------
$ProjectName   = 'studytrack-frontend'
$ManterUltimos = 5
$EnvPath       = Join-Path $PSScriptRoot '.env.local'

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

Write-Host "Projeto alvo      : $ProjectName" -ForegroundColor Cyan
Write-Host "Manter os ultimos : $ManterUltimos deployments" -ForegroundColor Cyan
if ($TeamId) { Write-Host "Team ID           : $TeamId" -ForegroundColor Cyan }

# ----------------------------------------------------------------------------
# 2. Descobrir o projectId real + deployment de producao ativo
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

$ProdId = $null
if ($proj.targets -and $proj.targets.production) {
    $ProdId = $proj.targets.production.id
}

Write-Host "Project ID        : $ProjectId" -ForegroundColor Cyan
if ($ProdId) { Write-Host "Producao ativa    : $ProdId (nunca sera apagado)" -ForegroundColor Cyan }
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
# 4. Ordenar por data desc e separar MANTER x APAGAR
# ----------------------------------------------------------------------------
$ordenados = $todos |
    ForEach-Object {
        [pscustomobject]@{
            uid    = $_.uid
            url    = $_.url
            estado = $_.state
            alvo   = $_.target
            criado = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$_.created).LocalDateTime
            _ms    = [int64]$_.created
        }
    } |
    Sort-Object -Property _ms -Descending

$ordenados = @($ordenados)

# uids que ficam protegidos: os N mais recentes + o de producao ativo
$manterUids = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($d in ($ordenados | Select-Object -First $ManterUltimos)) { [void]$manterUids.Add($d.uid) }
if ($ProdId) { [void]$manterUids.Add($ProdId) }

$manter = @($ordenados | Where-Object { $manterUids.Contains($_.uid) })
$apagar = @($ordenados | Where-Object { -not $manterUids.Contains($_.uid) })

# ----------------------------------------------------------------------------
# 5. Imprimir as duas listas + contagem ANTES de qualquer DELETE
# ----------------------------------------------------------------------------
Write-Host "==== MANTIDOS ($($manter.Count)) ====" -ForegroundColor Green
$manter |
    Select-Object `
        @{ n = 'uid'; e = { $_.uid } },
        @{ n = 'url'; e = { $_.url } },
        @{ n = 'criado'; e = { '{0:yyyy-MM-dd HH:mm:ss}' -f $_.criado } },
        @{ n = 'alvo'; e = { $_.alvo } },
        @{ n = 'estado'; e = { $_.estado } } |
    Format-Table -AutoSize | Out-Host

Write-Host "==== A APAGAR ($($apagar.Count)) ====" -ForegroundColor Yellow
$apagar |
    Select-Object `
        @{ n = 'uid'; e = { $_.uid } },
        @{ n = 'url'; e = { $_.url } },
        @{ n = 'criado'; e = { '{0:yyyy-MM-dd HH:mm:ss}' -f $_.criado } },
        @{ n = 'alvo'; e = { $_.alvo } },
        @{ n = 'estado'; e = { $_.estado } } |
    Format-Table -AutoSize | Out-Host

Write-Host ("TOTAL A APAGAR: {0} deployments (mantendo {1})" -f $apagar.Count, $manter.Count) -ForegroundColor Yellow
Write-Host ''

if ($apagar.Count -eq 0) {
    Write-Host "Nada a apagar: o projeto tem $($todos.Count) deployment(s) e todos estao protegidos." -ForegroundColor Green
    return
}

# ----------------------------------------------------------------------------
# 6. Confirmacao explicita (dry-run por padrao)
# ----------------------------------------------------------------------------
$resposta = Read-Host "Digite CONFIRMAR para apagar $($apagar.Count) deployments"

# 7. So apaga se a resposta for EXATAMENTE "CONFIRMAR" (case-sensitive)
if ($resposta -cne 'CONFIRMAR') {
    Write-Host ''
    Write-Host "Confirmacao nao recebida (resposta: '$resposta'). Nenhum deployment foi apagado (dry-run)." -ForegroundColor Green
    return
}

# ----------------------------------------------------------------------------
# DELETE de cada deployment da fila
# ----------------------------------------------------------------------------
Write-Host ''
Write-Host "Apagando $($apagar.Count) deployments..." -ForegroundColor Magenta
Write-Host ''

$ok  = 0
$err = 0

foreach ($d in $apagar) {
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
Write-Host ("Concluido. Sucesso: {0}  |  Erros: {1}  |  Total processado: {2}" -f $ok, $err, $apagar.Count) -ForegroundColor Magenta
