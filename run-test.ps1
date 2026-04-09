$p = Start-Process -FilePath "node" -ArgumentList "index.js","blank space","5","1" -NoNewWindow -Wait -PassThru -RedirectStandardInput "input.txt" -RedirectStandardOutput "output.txt" -RedirectStandardError "error.txt"
Get-Content output.txt
Get-Content error.txt