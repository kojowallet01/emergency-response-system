@echo off
echo ========================================
echo Adding Windows Firewall Rule for Port 3000
echo ========================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
    echo.
    
    REM Add firewall rule
    netsh advfirewall firewall add rule name="Next.js Dev Server (Port 3000)" dir=in action=allow protocol=TCP localport=3000
    
    echo.
    echo ========================================
    echo SUCCESS! Firewall rule added.
    echo ========================================
    echo.
    echo Your iPhone can now connect to:
    echo http://172.20.10.6:3000/responder
    echo.
    echo Press any key to close...
    pause >nul
) else (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    echo Press any key to close...
    pause >nul
)
