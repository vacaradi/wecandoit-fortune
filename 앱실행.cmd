@echo off
chcp 65001 >nul
cd /d "c:\Users\ÄÜÅÙÃ÷¸¶ÄÉÆÃº»ºÎ2\Desktop\À§ÄµµÎÀÕ¿À´ÃÀÇ¿î¼¼¿Í¸í¾ð ±×¸®°í ºÎÀû"
start "" /min python -m http.server 8080
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/web/index.html"
exit