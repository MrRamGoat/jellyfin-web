/* eslint-disable compat/compat -- Recording APIs are feature-detected; unsupported clients retain typed commands. */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Mic from '@mui/icons-material/Mic';
import Stop from '@mui/icons-material/Stop';
import { useApi } from 'hooks/useApi';
import { useUserViews } from 'hooks/api/useUserViews';
import { appRouter } from 'components/router/appRouter';
import { serviceRequest } from '../../features/ramflix/service';

interface VoiceResult {
    ok: boolean;
    message?: string;
    text?: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Existing feature service JSON contract.
    client_action?: string;
    item?: string;
}

export default function Voice() {
    const { __legacyApiClient__: client } = useApi();
    const navigate = useNavigate();
    const { data: views } = useUserViews();
    const vod = views?.Items?.find((view) => /vod/i.test(view.Name ?? ''));
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [recording, setRecording] = useState(false);
    const [requestingMic, setRequestingMic] = useState(false);
    const [result, setResult] = useState<VoiceResult>();
    const recorder = useRef<MediaRecorder>();
    const stream = useRef<MediaStream>();
    const timer = useRef<ReturnType<typeof setTimeout>>();
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            clearTimeout(timer.current);
            if (recorder.current?.state === 'recording') recorder.current.stop();
            stream.current?.getTracks().forEach((track) => {
                track.stop();
            });
        };
    }, []);
    const send = async (body: string | FormData) => {
        if (!client) return;
        setBusy(true);
        setResult(undefined);
        try {
            const data = await serviceRequest<VoiceResult>(
                'rfvoice',
                typeof body === 'string' ? '/api/text' : '/api/voice',
                client,
                {
                    method: 'POST',
                    ...(typeof body === 'string' ?
                        {
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: body, device: client.deviceId() })
                        } :
                        { body })
                }
            );
            if (!mounted.current) return;
            setResult(data);
            const destination = {
                live: '/ramflix/guide',
                stats: '/ramflix/stats',
                vod: vod ?
                    appRouter.getRouteUrl(vod, { context: vod.CollectionType }).substring(1) :
                    '/movies'
            }[data.client_action ?? ''];
            if (destination) navigate(destination);
            if (data.client_action === 'open_item' && data.item) {
                navigate(`/details?id=${encodeURIComponent(data.item)}`);
            }
        } catch (error) {
            if (mounted.current) {
                setResult({
                    ok: false,
                    message: error instanceof Error ? error.message : 'Could not reach the voice service.'
                });
            }
        } finally {
            if (mounted.current) setBusy(false);
        }
    };
    const toggleMic = async () => {
        if (requestingMic) return;
        if (recording) {
            clearTimeout(timer.current);
            recorder.current?.stop();
            return;
        }
        setRequestingMic(true);
        try {
            const media = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!mounted.current) {
                media.getTracks().forEach((track) => {
                    track.stop();
                });
                return;
            }
            stream.current = media;
            const rec = new MediaRecorder(media);
            recorder.current = rec;
            const chunks: Blob[] = [];
            rec.ondataavailable = (event) => {
                if (event.data.size) chunks.push(event.data);
            };
            rec.onstop = () => {
                clearTimeout(timer.current);
                media.getTracks().forEach((track) => {
                    track.stop();
                });
                if (!mounted.current) return;
                setRecording(false);
                const body = new FormData();
                body.append(
                    'audio',
                    new Blob(chunks, { type: rec.mimeType }),
                    rec.mimeType.includes('mp4') ? 'clip.mp4' : 'clip.webm'
                );
                body.append('device', client?.deviceId() ?? '');
                send(body).catch(() => setResult({ ok: false, message: 'Could not send recording.' }));
            };
            rec.start();
            setRecording(true);
            timer.current = setTimeout(() => {
                if (rec.state === 'recording') rec.stop();
            }, 30000);
        } catch {
            stream.current?.getTracks().forEach(track => {
                track.stop();
            });
            setResult({
                ok: false,
                message:
                    'Microphone unavailable or blocked. You can type here or use your keyboard’s dictation button.'
            });
        } finally {
            if (mounted.current) setRequestingMic(false);
        }
    };
    const micAvailable =
        window.isSecureContext
        && Boolean(navigator.mediaDevices?.getUserMedia)
        && typeof MediaRecorder !== 'undefined';
    return (
        <section className='ramflix-page ramflix-voice'>
            <p className='ramflix-eyebrow'>JUST ASK RAMFLIX</p>
            <h1>What would you like to watch?</h1>
            <p>
                Search for a title, start playback, or open your guide and stats. English and Hebrew commands
                are supported.
            </p>
            <form
                className='ramflix-glass'
                onSubmit={(event) => {
                    event.preventDefault();
                    send(text.trim()).catch(() =>
                        setResult({ ok: false, message: 'Could not send command.' })
                    );
                }}
            >
                <TextField
                    fullWidth
                    label='Type or dictate a command'
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    disabled={busy || recording}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                />
                <div>
                    <Button variant='contained' type='submit' disabled={busy || recording || !text.trim()}>
                        Send
                    </Button>
                    <Button
                        startIcon={recording ? <Stop /> : <Mic />}
                        onClick={() => toggleMic()}
                        disabled={busy || requestingMic || !micAvailable}
                    >
                        {recording ? 'Stop & send' : 'Use microphone'}
                    </Button>
                </div>
            </form>
            {!micAvailable && (
                <p>Use the secure RamFLIX address for microphone access, or dictate with your keyboard.</p>
            )}
            {recording && <p role='status'>Listening… Tap Stop &amp; send when you finish.</p>}
            {busy && <p role='status'>Working on your request…</p>}
            {result && (
                <Alert severity={result.ok ? 'success' : 'error'}>
                    {result.text && <strong>“{result.text}” </strong>}
                    {result.message || (result.ok ? 'Done.' : 'That request could not be completed.')}
                </Alert>
            )}
        </section>
    );
}
/* eslint-enable compat/compat */
