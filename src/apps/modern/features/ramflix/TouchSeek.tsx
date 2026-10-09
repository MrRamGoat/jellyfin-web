import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { playbackManager } from 'components/playback/playbackmanager';
import { currentSettings as userSettings } from 'scripts/settings/userSettings';

interface Tap {
    id: number;
    x: number;
    y: number;
    time: number;
    side?: 'back' | 'forward';
}

/** Touch gestures share the native player's seek API and configured skip lengths. */
export default function TouchSeek() {
    const [indicator, setIndicator] = useState<{ side: 'back' | 'forward'; seconds: number }>();
    useEffect(() => {
        let press: Tap | undefined;
        let previous: Tap | undefined;
        let timer: ReturnType<typeof setTimeout>;
        const controls = (event: PointerEvent) =>
            event.target instanceof Element
            && event.target.closest(
                'button,a,input,select,textarea,[role="button"],[role="slider"],.sliderContainer,.dialog,.osdHeader,.upNextContainer'
            );
        const down = (event: PointerEvent) => {
            press = undefined;
            if (event.pointerType !== 'touch' || !event.isPrimary || controls(event)) {
                previous = undefined;
                return;
            }
            press = { id: event.pointerId, x: event.clientX, y: event.clientY, time: Date.now() };
        };
        const cancel = () => {
            press = undefined;
            previous = undefined;
        };
        const up = (event: PointerEvent) => {
            const start = press;
            press = undefined;
            if (!start || event.pointerId !== start.id || controls(event)) return;
            if (
                Date.now() - start.time > 300
                || Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y) > 20
            ) {
                previous = undefined;
                return;
            }
            const player = document.querySelector('.videoPlayerContainer:not(.hide) video.htmlvideoplayer');
            if (!player) return;
            const rect = player.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const part = (event.clientX - rect.left) / rect.width;
            let side: Tap['side'];
            if (part < 0.45) side = 'back';
            else if (part > 0.55) side = 'forward';
            if (!side) {
                previous = undefined;
                return;
            }
            if (
                previous?.side === side
                && Date.now() - previous.time < 400
                && Math.abs(event.clientX - previous.x) < 90
                && Math.abs(event.clientY - previous.y) < 90
            ) {
                if (side === 'forward') playbackManager.fastForward(playbackManager.getCurrentPlayer());
                else playbackManager.rewind(playbackManager.getCurrentPlayer());
                const seconds =
                    (side === 'forward' ?
                        userSettings.skipForwardLength(undefined) :
                        userSettings.skipBackLength(undefined)) / 1000;
                setIndicator({ side, seconds });
                clearTimeout(timer);
                timer = setTimeout(() => setIndicator(undefined), 800);
                previous = undefined;
                event.preventDefault();
                event.stopPropagation();
            } else {
                previous = { ...start, x: event.clientX, y: event.clientY, time: Date.now(), side };
            }
        };
        document.addEventListener('pointerdown', down, true);
        document.addEventListener('pointerup', up, true);
        document.addEventListener('pointercancel', cancel, true);
        return () => {
            document.removeEventListener('pointerdown', down, true);
            document.removeEventListener('pointerup', up, true);
            document.removeEventListener('pointercancel', cancel, true);
            clearTimeout(timer);
        };
    }, []);
    return indicator ? (
        <Box
            aria-hidden='true'
            className='ramflix-touch-seek'
            sx={{
                position: 'fixed',
                top: '42%',
                left: indicator.side === 'back' ? '10%' : undefined,
                right: indicator.side === 'forward' ? '10%' : undefined,
                zIndex: 1500,
                pointerEvents: 'none',
                color: '#fff',
                background: '#080a0fc9',
                borderRadius: '50%',
                width: 110,
                height: 110,
                display: 'grid',
                placeContent: 'center',
                textAlign: 'center'
            }}
        >
            <strong>{indicator.side === 'forward' ? '››' : '‹‹'}</strong>
            <span>{indicator.seconds}s</span>
        </Box>
    ) : null;
}
