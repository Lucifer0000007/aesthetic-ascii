import { useEffect, useRef, useState } from 'react';

export function useWebcam() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    // Track the stream separately to avoid stale-ref cleanup issues
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        // 720p is plenty — the shader grid-snaps down to 50-150 cells anyway.
                        // 1080p wastes GPU bandwidth decoding unused pixels.
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 },
                    },
                    audio: false,
                });

                if (cancelled) {
                    // Component unmounted before getUserMedia resolved (StrictMode double-mount)
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Camera access denied:', err);
                    setError('Camera access denied. Please allow permissions.');
                }
            }
        }

        setupCamera();

        return () => {
            cancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, []);

    return { videoRef, error };
}