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

        this.peer = new RTCPeerConnection()
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
                e.channel.onmessage = (ee) => {
                    const packet: Packet = {
                        ip: [127, 0, 0, 1],
                        port: 8080,
                        data: ee.data
                    }
                    if (ee.data.arrayBuffer) {
                        ee.data.arrayBuffer().then((data: Int8Array) => {
                            packet.data = data;
                            (this.net as Net).incoming.enqueue(packet)
                        })
                    } else {
                        (this.net as Net).incoming.enqueue(packet)
                    }
                }
            }
            e.channel.onopen = () => {
                channelsCount += 1
                if (e.channel.label === 'read') {
                    this.channel = e.channel
                }
                if (channelsCount === 2) {
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
            const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.ws = new WebSocket(`${wsProtocol}//${location.host}/websocket`);

            this.ws.onopen = () => {
                console.log('🟢 WebSocket conectado - iniciando sinalização...');
                this.initConnection(stream);
            };

            this.ws.onerror = (error) => {
                console.error('🔴 Erro WebSocket:', error);
                // Note: error.target.readyState is not available in TypeScript for WebSocket
                // Checking ws readyState directly
                if (this.ws?.readyState === WebSocket.CLOSED) {
                    alert('Não foi possível conectar ao servidor. Verifique:\n' +
                          '1. Você está usando https:// na página?\n' +
                          '2. O endereço WebSocket está correto?\n' +
                          '3. O servidor está online?');
                }
            };

            this.ws.onclose = (event) => {
                if (event.code === 1008) {
                    console.error('🔴 Conexão rejeitada: origem não permitida');
                    alert('Erro de segurança: o domínio desta página não está autorizado ' +
                          '\n          a conectar ao servidor. Contate o administrador.');
                } else if (event.code !== 1000) {
                    console.warn(`🟡 Conexão fechada (${event.code}): ${event.reason}`);
                    setTimeout(() => this.connect(), 3000);
                }
            };

            const handler = async (e: MessageEvent) => {
                const parsed = JSON.parse(e.data)
                if (parsed.event === 'offer') {
                    await this.peer!.setRemoteDescription(JSON.parse(parsed.data))
                    const answer = await this.peer!.createAnswer()
                    await this.peer!.setLocalDescription(answer)
                    this.ws!.send(JSON.stringify({
                        event: 'answer',
                        data: JSON.stringify(answer)
                    }))
                }
                if (parsed.event === 'candidate') {
                    await this.peer!.addIceCandidate(JSON.parse(parsed.data))
                }
            };

            this.ws.addEventListener('message', handler);
        })
    }

    sendto(packet: Packet) {
        if (!this.channel) return
        this.channel.send(packet.data)
    }
}