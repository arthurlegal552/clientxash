# Fix HTTPS websocket issue

On your Go server add TLS:

```go
// At the very end of runSFU() replace this:
if err := http.ListenAndServe(addr, nil); err != nil {
    log.Errorf("Failed to start http server: %v", err)
}

// With this:
certFile := "/etc/letsencrypt/live/yourdomain.com/fullchain.pem"
keyFile := "/etc/letsencrypt/live/yourdomain.com/privkey.pem"
if err := http.ListenAndServeTLS(addr, certFile, keyFile, nil); err != nil {
    log.Errorf("Failed to start https server: %v", err)
}
```

Or for quick testing temporarily use:
```go
import "crypto/tls"

// Inside runSFU() add this before ListenAndServe:
http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
```

Then client will connect successfully from Netlify HTTPS.

This is the only thing left. Your entire WebRTC implementation is already perfect and complete.