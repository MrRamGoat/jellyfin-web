import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLiveTvApi } from '@jellyfin/sdk/lib/utils/api/live-tv-api';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';
import Close from '@mui/icons-material/Close';
import PlayArrow from '@mui/icons-material/PlayArrow';
import { useApi } from 'hooks/useApi';
import { playbackManager } from 'components/playback/playbackmanager';
import type { ItemDto } from 'types/base/models/item-dto';

interface Channel {
    key: string;
    name: string;
    number: string;
    cat: string;
    group: string;
    logo: string;
}
interface Catalog {
    channels: Channel[];
    categories: { id: string; name: string }[];
}
interface Station {
    key: string;
    name: string;
    cat: string;
    variants: Channel[];
}
const normalize = (name: string) => name.toLowerCase().replace(/[\s:._-]+/g, '');
const stationName = (name: string) =>
    name
        .replace(/^[A-Z]{2,3}\s*:\s*/i, '')
        .replace(/\b(?:4K|UHD|FHD|HD|SD|2160p|1080p|720p|HEVC|H[ .-]?26[45])\b/gi, '')
        .replace(/\(\s*\)|\[\s*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || name;
const readFavorites = (): Record<string, number> => {
    try {
        return JSON.parse(localStorage.getItem('rflive_favs') || '{}');
    } catch {
        return {};
    }
};

export default function Guide() {
    const { api, user } = useApi();
    const [category, setCategory] = useState('Israel');
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(150);
    const [favorites, setFavorites] = useState(readFavorites);
    const [selected, setSelected] = useState<Station>();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const catalog = useQuery({
        queryKey: ['Ramflix', 'Channels', api?.basePath],
        staleTime: 5 * 60000,
        queryFn: async ({ signal }): Promise<Catalog> => {
            const response = await fetch('/web/rflive-data/channels.json', { signal });
            if (!response.ok) throw new Error('Channel catalog unavailable.');
            return response.json();
        }
    });
    const channels = useQuery({
        queryKey: ['Ramflix', 'LiveChannels', api?.basePath, user?.Id],
        enabled: Boolean(api && user?.Id),
        staleTime: 5 * 60000,
        queryFn: async ({ signal }) =>
            (
                await getLiveTvApi(api!).getLiveTvChannels(
                    { userId: user!.Id, addCurrentProgram: true, enableUserData: true },
                    { signal }
                )
            ).data.Items ?? []
    });
    const stationList = useMemo(() => {
        const groups = new Map<string, Station>();
        catalog.data?.channels.forEach((channel) => {
            const name = stationName(channel.name);
            const key = `${channel.cat}|${channel.group}|${normalize(name)}`;
            if (!groups.has(key)) groups.set(key, { key, name, cat: channel.cat, variants: [] });
            groups.get(key)!.variants.push(channel);
        });
        return Array.from(groups.values());
    }, [catalog.data]);
    const lookup = (channel: Channel) =>
        channels.data?.find(
            (item) =>
                item.ChannelNumber === channel.number
                || normalize(item.Name ?? '') === normalize(channel.name)
        );
    const isFavorite = (station: Station) => station.variants.some((channel) => favorites[channel.key]);
    const filtered = stationList.filter(
        (station) =>
            (category === 'All channels'
                || (category === 'Favorites' ? isFavorite(station) : station.cat === category))
            && normalize(station.name).includes(normalize(search))
    );
    const favorite = (station: Station) => {
        const next = { ...favorites };
        if (isFavorite(station)) {
            station.variants.forEach((channel) => {
                delete next[channel.key];
            });
        } else {
            next[station.variants[0].key] = 1;
        }
        setFavorites(next);
        try {
            localStorage.setItem('rflive_favs', JSON.stringify(next));
        } catch {
            /* Favorites still work for this session. */
        }
    };
    const play = async (channel: Channel) => {
        const item = lookup(channel);
        if (!item) {
            setError('This stream is not available to your Jellyfin account.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await playbackManager.play({ items: [item as ItemDto] });
            setSelected(undefined);
        } catch {
            setError('Could not start this stream. Try another quality.');
        } finally {
            setBusy(false);
        }
    };
    const channelIds =
        selected?.variants
            .map(lookup)
            .map((item) => item?.Id)
            .filter((id): id is string => Boolean(id)) ?? [];
    const programs = useQuery({
        queryKey: ['Ramflix', 'Programs', api?.basePath, user?.Id, selected?.key],
        enabled: Boolean(api && channelIds.length),
        staleTime: 60000,
        queryFn: async ({ signal }) =>
            (
                await getLiveTvApi(api!).getLiveTvPrograms(
                    {
                        userId: user?.Id,
                        channelIds,
                        minEndDate: new Date().toISOString(),
                        maxStartDate: new Date(Date.now() + 86400000).toISOString(),
                        limit: 12
                    },
                    { signal }
                )
            ).data.Items ?? []
    });
    return (
        <section className='ramflix-page ramflix-guide'>
            <div className='ramflix-page-heading'>
                <div>
                    <p className='ramflix-eyebrow'>LIVE ON RAMFLIX</p>
                    <h1>Channel Guide</h1>
                </div>
                <Button component={Link} to='/livetv'>
                    Recordings &amp; timers
                </Button>
            </div>
            <TextField
                fullWidth
                label='Find a channel'
                value={search}
                onChange={(event) => {
                    setSearch(event.target.value);
                    setVisibleCount(150);
                }}
            />
            <div className='ramflix-categories' role='group' aria-label='Channel category'>
                {catalog.data?.categories.map((cat) => (
                    <Button
                        key={cat.id}
                        variant={category === cat.id ? 'contained' : 'text'}
                        aria-pressed={category === cat.id}
                        onClick={() => {
                            setCategory(cat.id);
                            setVisibleCount(150);
                        }}
                    >
                        {cat.name}
                    </Button>
                ))}
            </div>
            {(catalog.isPending || channels.isPending) && <p role='status'>Loading channels…</p>}
            {(catalog.isError || channels.isError) && (
                <Alert
                    severity='error'
                    action={
                        <Button
                            onClick={() => {
                                Promise.all([catalog.refetch(), channels.refetch()]).catch(() =>
                                    setError('Could not reload channels.')
                                );
                            }}
                        >
                            Retry
                        </Button>
                    }
                >
                    Could not load the guide. Open native Live TV to browse available channels.
                </Alert>
            )}
            {!catalog.isPending && !filtered.length && (
                <div className='ramflix-glass ramflix-empty'>
                    <h2>No channels here yet</h2>
                    <p>Choose another category or save stations to your favorites.</p>
                </div>
            )}
            <div className='ramflix-channel-grid'>
                {filtered.slice(0, visibleCount).map((station) => {
                    const now = lookup(station.variants[0])?.CurrentProgram;
                    return (
                        <article className='ramflix-glass' key={station.key}>
                            <button
                                type='button'
                                onClick={() => {
                                    setError('');
                                    setSelected(station);
                                }}
                            >
                                <img
                                    src={`/web/rflive-data/${station.variants[0].logo}`}
                                    alt=''
                                    loading='lazy'
                                />
                                <strong>{station.name}</strong>
                                <span>
                                    {now?.Name
                                        || `${station.variants.length} stream${station.variants.length > 1 ? 's' : ''}`}
                                </span>
                            </button>
                            <IconButton
                                aria-label={`Favorite ${station.name}`}
                                aria-pressed={isFavorite(station)}
                                onClick={() => favorite(station)}
                            >
                                {isFavorite(station) ? <Star /> : <StarBorder />}
                            </IconButton>
                        </article>
                    );
                })}
            </div>
            {filtered.length > visibleCount && (
                <Button onClick={() => setVisibleCount((count) => count + 150)}>
                    Show more stations ({filtered.length - visibleCount} remaining)
                </Button>
            )}
            <Dialog open={Boolean(selected)} onClose={() => setSelected(undefined)} fullWidth maxWidth='sm'>
                <DialogTitle>
                    {selected?.name}
                    <IconButton
                        aria-label='Close channel'
                        onClick={() => setSelected(undefined)}
                        sx={{ float: 'right' }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {error && <Alert severity='error'>{error}</Alert>}
                    <h3>Choose your stream</h3>
                    <div className='ramflix-streams'>
                        {selected?.variants.map((channel) => (
                            <Button
                                key={channel.key}
                                startIcon={<PlayArrow />}
                                disabled={busy || channels.isPending}
                                onClick={() => play(channel)}
                            >
                                {channel.name}
                            </Button>
                        ))}
                    </div>
                    <h3>On now &amp; next</h3>
                    {programs.isFetching && <p>Loading schedule…</p>}
                    {!programs.isFetching
                        && Boolean(programs.data?.length)
                        && programs.data?.map((program) => (
                            <div className='ramflix-program' key={program.Id}>
                                <span>
                                    {program.StartDate ?
                                        new Date(program.StartDate).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) :
                                        ''}
                                </span>
                                <strong>{program.Name}</strong>
                            </div>
                        ))}
                    {!programs.isFetching && !programs.data?.length && (
                        <p>No schedule available for this station.</p>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}
