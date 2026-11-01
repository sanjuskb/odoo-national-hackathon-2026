# Brightloop Application Launcher (PowerShell)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Brightloop Subscription Management System" -ForegroundColor White
Write-Host "  Odoo National-Level Hackathon 2026" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nServers launched in background windows:" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend:  http://localhost:5000/api/v1" -ForegroundColor White
Write-Host "`nVerified Supabase Demo Accounts:" -ForegroundColor Cyan
Write-Host "  - Admin:    smoke-admin@example.com   / Admin2026!"
Write-Host "  - Customer: customer@brightloop.io    / Customer2026!"
Write-Host "========================================================" -ForegroundColor Cyan

