# Add Windows Firewall Rule for Next.js Dev Server
# Run this script as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Adding Windows Firewall Rule for Port 3000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Running with Administrator privileges..." -ForegroundColor Green
    Write-Host ""
    
    try {
        # Add firewall rule
        New-NetFirewallRule -DisplayName "Next.js Dev Server (Port 3000)" `
                            -Direction Inbound `
                            -LocalPort 3000 `
                            -Protocol TCP `
                            -Action Allow `
                            -ErrorAction Stop
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS! Firewall rule added." -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your iPhone can now connect to:" -ForegroundColor Yellow
        Write-Host "http://172.20.10.6:3000/responder" -ForegroundColor White
        Write-Host ""
        
        # Verify the rule was created
        $rule = Get-NetFirewallRule -DisplayName "Next.js Dev Server (Port 3000)" -ErrorAction SilentlyContinue
        if ($rule) {
            Write-Host "Firewall rule verified:" -ForegroundColor Green
            Write-Host "  Name: $($rule.DisplayName)" -ForegroundColor White
            Write-Host "  Enabled: $($rule.Enabled)" -ForegroundColor White
            Write-Host "  Direction: $($rule.Direction)" -ForegroundColor White
            Write-Host "  Action: $($rule.Action)" -ForegroundColor White
        }
    }
    catch {
        Write-Host ""
        Write-Host "ERROR: Failed to add firewall rule" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host ""
        Write-Host "The rule might already exist. Try removing it first:" -ForegroundColor Yellow
        Write-Host 'Remove-NetFirewallRule -DisplayName "Next.js Dev Server (Port 3000)"' -ForegroundColor White
    }
}
else {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
