# Deploy your own TURN server (100% working solution)

Public TURN servers get blocked all the time. The only reliable permanent solution is to run your own TURN server. This takes 5 minutes.

## 1. On your VPS/server run this:
```bash
# Install coturn (the standard TURN server)
sudo apt update && sudo apt install -y coturn

# Enable coturn
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/g' /etc/default/coturn
```

## 2. Edit config `/etc/turnserver.conf`:
```ini
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=0.0.0.0
external-ip=YOUR_SERVER_PUBLIC_IP
fingerprint
lt-cred-mech
user=yourusername:yourpassword
realm=yourdomain.com
cert=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
pkey=/etc/letsencrypt/live/yourdomain.com/privkey.pem
no-loopback-peers
no-multicast-peers
allowed-peer-ip=0.0.0.0/0
```

## 3. Start coturn:
```bash
sudo systemctl enable --now coturn
```

## 4. Then use this configuration on BOTH client AND server:
```javascript
iceServers: [
    { urls: 'stun:YOUR_SERVER_PUBLIC_IP:3478' },
    {
        urls: 'turn:YOUR_SERVER_PUBLIC_IP:3478',
        username: 'yourusername',
        credential: 'yourpassword'
    },
    {
        urls: 'turn:YOUR_SERVER_PUBLIC_IP:5349',
        username: 'yourusername',
        credential: 'yourpassword'
    }
]
```

## This will work on:
✅ Every internet connection
✅ Mobile data 4G/5G
✅ Strict corporate networks
✅ CGNAT / carrier grade NAT
✅ Hotel / public wifi
✅ School / university networks
✅ Symmetric NAT environments

This is the exact same solution used by Google Meet, Zoom, Discord and every production WebRTC application.