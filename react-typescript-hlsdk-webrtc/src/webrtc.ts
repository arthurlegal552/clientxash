import {Packet, Xash3D, Xash3DOptions, Net} from "xash3d-fwgs";

export class Xash3DWebRTC extends Xash3D {
    private channel?: RTCDataChannel
    private resolve?: (value?: unknown) => void
    private ws?: WebSocket
    private peer?: RTCPeerConnection

    constructor(opts?: Xash3DOptions) {
        super(opts);
        this.net = new Net(this)
    }

    async init() {
        await Promise.all([
            super.init(),
            this.connect()
        ]);
    }

    initConnection(stream: MediaStream) {
        if (this.peer) return

        this.peer = new RTCPeerConnection({
    iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
})

this.peer.onconnectionstatechange = () => {
    console.log("PC STATE:", this.peer?.connectionState)
}

this.peer.oniceconnectionstatechange = () => {
    console.log("ICE STATE:", this.peer?.iceConnectionState)
}

this.peer.onsignalingstatechange = () => {
    console.log("SIGNAL STATE:", this.peer?.signalingState)
}
        this.peer.onicecandidate = e => {
            if (!e.candidate) {
                return
            }
            this.ws!.send(JSON.stringify({
                event: 'candidate',
                data: JSON.stringify(e.candidate.toJSON())
            }))
        }
        stream?.getTracks()?.forEach(t => {
            this.peer!.addTrack(t, stream)
        })
        let channelsCount = 0
        this.peer.ondatachannel = (e) => {
    if (e.channel.label === 'write') {
        e.channel.onmessage = async (ee) => {
            const data = await ee.data.arrayBuffer()
            const packet: Packet = {
                ip: [127, 0, 0, 1],
                port: 8080,
                data: new Int8Array(data)
            }
            ;(this.net as Net).incoming.enqueue(packet)
        }
    }

    e.channel.onopen = () => {
        console.log("DC OPEN:", e.channel.label)

        if (e.channel.label === "read") {
            this.channel = e.channel

            if (this.resolve) {
                const r = this.resolve
                this.resolve = undefined
                r()
            }
        }
    }
}
    }

    async connect() {
        const stream = new MediaStream()
        return new Promise(resolve => {
            this.resolve = resolve;
            this.ws = new WebSocket("wss://gld-src-emscripten.onrender.com/websocket")

this.ws.onopen = () => console.log("WS OPEN")
this.ws.onclose = () => console.log("WS CLOSED")
this.ws.onerror = (e) => console.log("WS ERROR", e)
            const handler = async (e: MessageEvent) => {
    this.initConnection(stream)

    const parsed = JSON.parse(e.data)

    console.log("WS MESSAGE:", parsed.event)

    if (parsed.event === "offer") {
        const offer = JSON.parse(parsed.data)

        console.log("offer recebido")
        console.log("estado antes:", this.peer!.signalingState)

        // evita responder duas vezes
        if (this.peer!.signalingState !== "stable") {
            console.log("offer ignorado")
            return
        }

        await this.peer!.setRemoteDescription(offer)

        console.log("estado depois:", this.peer!.signalingState)

        const answer = await this.peer!.createAnswer()

        await this.peer!.setLocalDescription(answer)

        this.ws!.send(JSON.stringify({
            event: "answer",
            data: JSON.stringify(answer)
        }))

        console.log("answer enviado")
    }

    if (parsed.event === "candidate") {
        try {
            await this.peer!.addIceCandidate(JSON.parse(parsed.data))
            console.log("ICE candidate added")
        } catch (err) {
            console.error("ICE ERROR", err)
        }
    }
}
            this.ws.addEventListener('message', handler)
        })
    }

    sendto(packet: Packet) {
        if (!this.channel) return
        this.channel.send(packet.data)
    }
}
