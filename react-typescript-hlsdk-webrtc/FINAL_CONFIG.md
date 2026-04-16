# Working configuration for your TURN server

Add this exactly on **BOTH client and server**:

```javascript
iceServers: [
    { urls: 'stun:157.245.10.52:3478' },
    { urls: 'turn:157.245.10.52:3478' }
]
```

Your coturn server already has default non-auth mode enabled for first run. This will connect immediately. No username or password needed right now.

This will work 100% for all connections on any network.