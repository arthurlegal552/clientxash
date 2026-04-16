import React, {FC, useRef} from 'react';
import filesystemURL from 'xash3d-fwgs/filesystem_stdio.wasm'
import xashURL from 'xash3d-fwgs/xash.wasm'
import menuURL from 'xash3d-fwgs/cl_dll/menu_emscripten_wasm32.wasm'
import clientURL from 'hlsdk-portable/cl_dll/client_emscripten_wasm32.wasm'
import serverURL from 'hlsdk-portable/dlls/hl_emscripten_wasm32.wasm'
import gles3URL from 'xash3d-fwgs/libref_gles3compat.wasm'
import extrasURL from 'xash3d-fwgs/extras.pk3'
import {loadAsync} from 'jszip'
import {Xash3DWebRTC} from "./webrtc";
import './App.css';

const App: FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    return (
        <>
            <button className="Input" onClick={async () => {
                const x = new Xash3DWebRTC({
                    canvas: canvasRef.current!,
                    arguments: ['-windowed'],
                    libraries: {
                        filesystem: filesystemURL,
                        xash: xashURL,
                        menu: menuURL,
                        server: serverURL,
                        client: clientURL,
                        render: {
                            gles3compat: gles3URL,
                        }
                    }
                });

                const [zip, extras] = await Promise.all([
                    (async () => {
                        const res = await fetch('valve.zip');
                        if (!res.ok) {
                            throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        const contentType = res.headers.get('content-type');
                        console.log(`Content-Type of valve.zip: ${contentType}`);
                        const arrayBuffer = await res.arrayBuffer();
                        if (arrayBuffer.byteLength === 0) {
                            throw new Error('Downloaded valve.zip is empty');
                        }
                        console.log(`Size of valve.zip: ${arrayBuffer.byteLength} bytes`);
                        return await loadAsync(arrayBuffer);
                    })(),
                    (async () => {
                        const res = await fetch(extrasURL);
                        return await res.arrayBuffer()
                    })(),
                    x.init(),
                ])

                if (x.exited) return

                await Promise.all(Object.entries(zip.files).map(async ([filename, file]) => {
                    if (file.dir) return;

                    const path = '/rodir/' + filename;
                    const dir = path.split('/').slice(0, -1).join('/');

                    x.em.FS.mkdirTree(dir);
                    x.em.FS.writeFile(path, await file.async("uint8array"));
                }))

                x.em.FS.writeFile('/rodir/valve/extras.pk3', new Uint8Array(extras))

                x.em.FS.chdir('/rodir')
                x.main()
            }}>
                Start
            </button>
            <canvas id="canvas" ref={canvasRef}/>
        </>
    );
}

export default App;
