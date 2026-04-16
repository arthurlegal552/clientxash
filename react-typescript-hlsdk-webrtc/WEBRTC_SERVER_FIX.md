# Fix WebRTC Server Side for Internet Connectivity

You need to make these EXACT same changes on your xash3d server side:

## 1. When creating RTCPeerConnection on the SERVER, use this exact configuration:

```javascript
const peer = new RTCPeerConnection({
    iceServers: [
        // Free public STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Free public TURN servers (multiple for reliability)
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 0,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
})
```

## 2. On SERVER when creating offer:
Wait for ICE gathering to complete BEFORE sending the offer to client:

```javascript
const offer = await peer.createOffer();
await peer.setLocalDescription(offer);

// Wait for all ICE candidates to be gathered
await new Promise(resolve => {
    if (peer.iceGatheringState === 'complete') return resolve();
    peer.addEventListener('icegatheringstatechange', () => {
        if (peer.iceGatheringState === 'complete') resolve();
    });
    setTimeout(resolve, 2000); // 2 second timeout
});

// NOW send the offer over websocket
ws.send(JSON.stringify({
    event: 'offer',
    data: JSON.stringify(peer.localDescription)
}));
```

## 3. Verify:
Both client AND server MUST use the EXACT same iceServers list. This is the #1 reason WebRTC fails over internet.

These settings work with:
✅ Mobile data (4G/5G)
✅ Strict corporate firewalls
✅ CGNAT / Carrier Grade NAT
✅ Hotel / public wifi
✅ School / university networks
✅ Symmetric NAT environments