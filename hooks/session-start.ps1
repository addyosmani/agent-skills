# agent-skills session start hook for native Windows
# Injects the using-agent-skills meta-skill into every new session

$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 otherwise uses the active console code page when stdout
# is redirected, which can corrupt the Unicode flowchart in the meta-skill.
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

function Write-HookPayload {
    param(
        [Parameter(Mandatory = $true)]
        [string] $AdditionalContext
    )

    $payload = [ordered]@{
        hookSpecificOutput = [ordered]@{
            hookEventName    = 'SessionStart'
            additionalContext = $AdditionalContext
        }
    }

    [Console]::Out.WriteLine(($payload | ConvertTo-Json -Compress))
}

try {
    $pluginRoot = Split-Path -Parent $PSScriptRoot
    $metaSkill = Join-Path $pluginRoot 'skills/using-agent-skills/SKILL.md'

    if (Test-Path -LiteralPath $metaSkill -PathType Leaf) {
        $content = [System.IO.File]::ReadAllText(
            $metaSkill,
            [System.Text.Encoding]::UTF8
        )
        $message = "agent-skills loaded. Use the skill discovery flowchart to find the right skill for your task.`n`n$content"
        Write-HookPayload -AdditionalContext $message
    }
    else {
        Write-HookPayload `
            -AdditionalContext 'agent-skills: using-agent-skills meta-skill not found. Skills may still be available individually.'
    }
}
catch {
    Write-HookPayload `
        -AdditionalContext 'agent-skills: the session-start hook could not load the meta-skill. Skills remain available individually.'
}
