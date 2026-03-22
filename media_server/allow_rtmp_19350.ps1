# Run as Administrator
New-NetFirewallRule -DisplayName "Allow RTMP 19350" -Direction Inbound -LocalPort 19350 -Protocol TCP -Action Allow
