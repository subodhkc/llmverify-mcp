# Error Guide & Troubleshooting

Complete guide to resolving llmverify errors.

---

## Quick Error Reference

| Error Code | What It Means | Quick Fix |
|------------|---------------|-----------|
| ECONNREFUSED | Server not running | `npm run serve` |
| EADDRINUSE | Port 9009 in use | `npm run serve:force` |
| SERVER_NOT_RUNNING | Server stopped | Restart server |
| CONNECTION_TIMEOUT | Server too slow | Check content size |
| REQUEST_TIMEOUT | Took >10 seconds | Verify smaller sections |
| EMPTY_RESPONSE | No data returned | Restart server |
| PARSE_ERROR | Invalid response | Update llmverify |
| MODULE_NOT_FOUND | Package missing | `npm install` |

---

## Server Errors

### ECONNREFUSED: Cannot Connect to Server

**What happened:**
The monitor cannot connect to the llmverify server.

**Why:**
- Server is not running
- Server crashed
- Wrong port

**Solution:**
```bash
# Terminal 1
npm run serve

# Wait for: "Running on http://localhost:9009"

# Terminal 2
npm run monitor
```

**Still not working?**
```bash
# Check if something is on port 9009
netstat -ano | findstr :9009

# Force start (kills existing process)
npm run serve:force
```

---

### EADDRINUSE: Port Already in Use

**What happened:**
Another process is using port 9009.

**Why:**
- Previous server didn't stop cleanly
- Another application uses port 9009
- Multiple server instances running

**Solution:**
```bash
# Automatic fix
npm run serve:force
```

**Manual fix:**
```powershell
# Windows
$proc = Get-NetTCPConnection -LocalPort 9009 | Select-Object -ExpandProperty OwningProcess -Unique
Stop-Process -Id $proc -Force
npm run serve
```

```bash
# Linux/Mac
lsof -ti:9009 | xargs kill -9
npm run serve
```

---

### SERVER_NOT_RUNNING

**What happened:**
Server was running but stopped responding.

**Why:**
- Server crashed
- Out of memory
- Network issue

**Solution:**
```bash
# Check Terminal 1 for error messages
# Restart server
npm run serve:force

# Restart monitor
npm run monitor
```

---

## Verification Errors

### CONNECTION_TIMEOUT

**What happened:**
Server didn't respond within 10 seconds.

**Why:**
- Content too large
- Server overloaded
- Slow system

**Solution:**
```bash
# 1. Try smaller content
#    Copy only part of the AI response

# 2. Check server is responsive
curl http://localhost:9009/health

# 3. Restart if needed
npm run serve:force
```

---

### REQUEST_TIMEOUT

**What happened:**
Verification took longer than 10 seconds.

**Why:**
- Very long content (>10,000 words)
- Complex analysis required
- System resources low

**Solution:**
```
1. Break content into smaller sections
2. Verify each section separately
3. Increase timeout (advanced):
   - Edit monitor.js
   - Change timeout: 10000 to timeout: 30000
```

---

### EMPTY_RESPONSE

**What happened:**
Server returned no data.

**Why:**
- Server error
- Invalid request
- Server restarting

**Solution:**
```bash
# 1. Check server logs in Terminal 1
# 2. Restart server
npm run serve:force

# 3. Try verification again
```

---

### PARSE_ERROR

**What happened:**
Server response couldn't be parsed.

**Why:**
- Server version mismatch
- Corrupted response
- Network issue

**Solution:**
```bash
# 1. Update llmverify
npm update llmverify

# 2. Restart server
npm run serve:force

# 3. If still failing, reinstall
npm uninstall llmverify
npm install llmverify
```

---

## Installation Errors

### MODULE_NOT_FOUND

**What happened:**
Required package is missing.

**Why:**
- Incomplete installation
- Deleted node_modules
- Wrong directory

**Solution:**
```bash
# 1. Ensure you're in the right directory
cd path/to/your/project

# 2. Install dependencies
npm install

# 3. If still failing, clean install
rm -rf node_modules package-lock.json
npm install
```

---

### PERMISSION_DENIED

**What happened:**
Cannot access files or ports.

**Why:**
- Insufficient permissions
- Antivirus blocking
- Admin rights needed

**Solution:**
```bash
# Windows: Run as Administrator
# Right-click terminal -> Run as Administrator

# Linux/Mac: Use sudo (if needed)
sudo npm run serve
```

---

## Monitor Errors

### Clipboard Access Failed

**What happened:**
Cannot read clipboard.

**Why:**
- PowerShell not available (Windows)
- Clipboard permissions denied
- No clipboard content

**Solution:**
```bash
# Windows: Ensure PowerShell is available
powershell -command "Get-Clipboard"

# If that works, restart monitor
npm run monitor
```

---

### No Scores Appearing

**What happened:**
Monitor running but no verification scores show.

**Why:**
- Content too short (<50 characters)
- Not copying (Ctrl+C)
- Server not responding

**Solution:**
```
1. Ensure content is >50 characters
2. Use Ctrl+C to copy (not right-click)
3. Check Terminal 1 - server running?
4. Test with: "This is a test message for llmverify verification system"
```

---

## API Errors

### 400 Bad Request

**What happened:**
Invalid request sent to API.

**Why:**
- Missing content field
- Invalid JSON
- Wrong endpoint

**Solution:**
```javascript
// Correct format
const response = await fetch('http://localhost:9009/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Your text here' })
});
```

---

### 500 Internal Server Error

**What happened:**
Server encountered an error.

**Why:**
- Invalid content
- Server bug
- Resource exhaustion

**Solution:**
```bash
# 1. Check server logs
# 2. Restart server
npm run serve:force

# 3. Report issue with:
#    - Content that caused error
#    - Server logs
#    - llmverify version
```

---

## Performance Issues

### Slow Verification

**What happened:**
Takes >5 seconds to verify.

**Why:**
- Large content
- Complex analysis
- System resources low

**Solution:**
```
1. Verify smaller sections
2. Close other applications
3. Check system resources:
   - CPU usage
   - Memory usage
   - Disk space
```

---

### High Memory Usage

**What happened:**
Server using too much RAM.

**Why:**
- Large content being verified
- Memory leak
- Multiple verifications

**Solution:**
```bash
# Restart server periodically
npm run serve:force

# For production, use process manager
pm2 start start-server.js
pm2 restart start-server
```

---

## Network Errors

### ETIMEDOUT

**What happened:**
Network request timed out.

**Why:**
- Firewall blocking
- Network issue
- Server not responding

**Solution:**
```bash
# 1. Check firewall allows localhost:9009
# 2. Test connection
curl http://localhost:9009/health

# 3. Disable VPN if active
# 4. Check antivirus settings
```

---

### ECONNRESET

**What happened:**
Connection was reset.

**Why:**
- Server crashed mid-request
- Network interruption
- Timeout

**Solution:**
```bash
# Restart everything
npm run serve:force
npm run monitor
```

---

## Platform-Specific Errors

### Windows

**PowerShell Execution Policy**
```powershell
# If scripts won't run
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Port Already in Use**
```powershell
# Find and kill process
netstat -ano | findstr :9009
taskkill /PID <process_id> /F
```

---

### Linux/Mac

**Port Permission Denied**
```bash
# Use port >1024 or run with sudo
# Edit start-server.js to use port 9009 (already >1024)
```

**Node Not Found**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Advanced Troubleshooting

### Enable Debug Mode

```bash
# Set environment variable
export DEBUG=llmverify:*

# Run server with debug
npm run serve
```

### Check Server Health

```bash
# Health check
curl http://localhost:9009/health

# Expected response
{"ok":true,"service":"llmverify","version":"1.4.0"}
```

### Test Verification

```bash
# Test with curl
curl -X POST http://localhost:9009/verify \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message"}'
```

### View Server Logs

```bash
# Server logs appear in Terminal 1
# Look for:
# - Error messages
# - Stack traces
# - Request details
```

---

## Getting Help

### Before Reporting Issues

1. **Check this guide** - Solution might be here
2. **Update llmverify** - `npm update llmverify`
3. **Restart everything** - `npm run serve:force && npm run monitor`
4. **Test with simple content** - "Hello world"

### When Reporting Issues

Include:
1. **Error message** - Exact text
2. **llmverify version** - `npm list llmverify`
3. **Node version** - `node --version`
4. **Operating system** - Windows/Linux/Mac
5. **Steps to reproduce** - What you did
6. **Server logs** - From Terminal 1
7. **Content** - What you were verifying (if not sensitive)

### Where to Report

- **GitHub Issues**: https://github.com/subodhkc/llmverify-npm/issues
- **Include**: All information from "When Reporting Issues"
- **Search first**: Issue might already be reported

---

## Prevention Tips

### Avoid Common Errors

1. **Always start server first**
   ```bash
   npm run serve  # Terminal 1
   npm run monitor  # Terminal 2
   ```

2. **Use serve:force if unsure**
   ```bash
   npm run serve:force  # Kills conflicts automatically
   ```

3. **Keep llmverify updated**
   ```bash
   npm update llmverify
   ```

4. **Don't verify huge content**
   - Keep under 10,000 words
   - Break large content into sections

5. **Restart periodically**
   - Server: Every few hours
   - Monitor: If it stops responding

---

## Quick Fixes Checklist

When something goes wrong, try these in order:

- [ ] Is server running? Check Terminal 1
- [ ] Restart server: `npm run serve:force`
- [ ] Restart monitor: `npm run monitor`
- [ ] Update llmverify: `npm update llmverify`
- [ ] Test with simple content: "Test message"
- [ ] Check firewall/antivirus
- [ ] Reinstall: `npm uninstall llmverify && npm install llmverify`
- [ ] Check this guide for specific error
- [ ] Report issue on GitHub

---

## Summary

**Most common issues:**
1. Server not running → `npm run serve`
2. Port conflict → `npm run serve:force`
3. Content too large → Verify smaller sections
4. Server crashed → Restart with `serve:force`

**Remember:**
- Server must run before monitor
- Port 9009 must be available
- Content should be <10,000 words
- Restart fixes most issues

**For more help:**
- See [QUICK-START.md](../QUICK-START.md) for setup
- See [README.md](../README.md) for usage
- See [FINDINGS-EXPLAINED.md](FINDINGS-EXPLAINED.md) for findings
- Report issues on GitHub
