@echo off
echo ========================================
echo Enable Network Access for Port 3000
echo ========================================
echo.
echo This will add a Windows Firewall rule to allow
echo incoming connections on port 3000.
echo.
echo You MUST run this as Administrator!
echo.
pause

netsh advfirewall firewall add rule name="Next.js Dev Server (Port 3000)" dir=in action=allow protocol=TCP localport=3000

echo.
echo ========================================
if %errorlevel% == 0 (
    echo SUCCESS! Firewall rule added.
    echo.
    echo Your iPhone can now connect to:
    echo http://172.20.10.6:3000/responder
) else (
    echo FAILED! Make sure you run this as Administrator.
    echo Right-click this file and select "Run as administrator"
)
echo ========================================
echo.
pause
