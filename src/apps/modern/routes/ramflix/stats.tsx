import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Link } from 'react-router-dom';
import { useApi } from 'hooks/useApi';
import { serviceRequest } from '../../features/ramflix/service';

interface Wrapped {
    user: string;
    me: {
        secs: number;
        // eslint-disable-next-line @typescript-eslint/naming-convention -- Existing feature service JSON contract.
        live_secs: number;
        episodes: number;
        movies: number;
        sessions: number;
        streak: number;
        shows: { name: string; secs: number }[];
        films: { name: string; secs: number }[];
        clients: { name: string; secs: number }[];
        devices: { name: string; secs: number }[];
        days: number;
    };
    board: { uid: string; user: string; secs: number; episodes: number; movies: number }[];
    house: { secs: number; sessions: number; people: number; shows: { name: string; secs: number }[] };
    awards: { key: string; title: string; user: string; detail: string }[];
}

interface LiveSessions {
    ok: boolean;
    reason?: string;
    sessions: {
        id: string;
        user: string;
        item: string;
        name: string;
        series: string;
        paused: boolean;
        device: string;
        pos: number;
        runtime: number;
    }[];
}

export default function Stats() {
    const { api, user, __legacyApiClient__: client } = useApi();
    const [range, setRange] = useState('30d');
    const [section, setSection] = useState('personal');
    const query = useQuery({
        queryKey: ['Ramflix', 'Stats', api?.basePath, user?.Id, range],
        enabled: Boolean(client && user?.Id),
        staleTime: 60000,
        queryFn: () => serviceRequest<Wrapped>('rfstats', `/api/wrapped?range=${range}`, client!)
    });
    const live = useQuery({
        queryKey: ['Ramflix', 'LiveStats', api?.basePath, user?.Id],
        enabled: Boolean(client && user?.Id && section === 'live'),
        refetchInterval: section === 'live' ? 20000 : false,
        queryFn: () => serviceRequest<LiveSessions>('rfstats', '/api/live', client!)
    });
    const topTitles = section === 'household' ? query.data?.house.shows : query.data?.me.shows;
    return (
        <section className='ramflix-page'>
            <div className='ramflix-page-heading'>
                <div>
                    <p className='ramflix-eyebrow'>YOUR WATCHING STORY</p>
                    <h1>RamFLIX Wrapped</h1>
                </div>
            </div>
            <Tabs
                value={section}
                onChange={(_event, value: string) => setSection(value)}
                aria-label='Stats section'
            >
                <Tab value='personal' label='Your story' />
                <Tab value='household' label='Household' />
                <Tab value='live' label='Watching now' />
            </Tabs>
            <div className='ramflix-periods' role='group' aria-label='Viewing period'>
                {[
                    ['7d', 'This week'],
                    ['30d', 'This month'],
                    ['90d', '90 days'],
                    ['ytd', 'This year'],
                    ['all', 'All time']
                ].map(([value, label]) => (
                    <Button
                        key={value}
                        variant={range === value ? 'contained' : 'text'}
                        onClick={() => setRange(value)}
                        aria-pressed={range === value}
                    >
                        {label}
                    </Button>
                ))}
            </div>
            {query.isPending && <p role='status'>Loading your watching story…</p>}
            {query.isError && (
                <Alert severity='error' action={<Button onClick={() => query.refetch()}>Retry</Button>}>
                    {query.error.message}
                </Alert>
            )}
            {query.data && section !== 'live' && (
                <>
                    <div className='ramflix-stat-grid'>
                        {[
                            [`${(query.data.me.secs / 3600).toFixed(1)}h`, 'Time watching'],
                            [query.data.me.episodes, 'Episodes'],
                            [query.data.me.movies, 'Movies'],
                            [query.data.me.streak, 'Longest day streak']
                        ].map(([value, label]) => (
                            <div className='ramflix-glass' key={label}>
                                <strong>{value ?? 0}</strong>
                                <p>{label}</p>
                            </div>
                        ))}
                    </div>
                    {section === 'personal' && (
                        <>
                            <h2>Your favorites by watching time</h2>
                            <div className='ramflix-glass ramflix-leaderboard'>
                                {topTitles?.length ? (
                                    topTitles.map((title) => (
                                        <div key={title.name}>
                                            <strong>{title.name}</strong>
                                            <span>{(title.secs / 3600).toFixed(1)} hours</span>
                                        </div>
                                    ))
                                ) : (
                                    <p>No shows watched in this period.</p>
                                )}
                            </div>
                            <h2>Movies you watched</h2>
                            <div className='ramflix-glass ramflix-leaderboard'>
                                {query.data.me.films.length ? (
                                    query.data.me.films.map((title) => (
                                        <div key={title.name}>
                                            <strong>{title.name}</strong>
                                            <span>{(title.secs / 3600).toFixed(1)} hours</span>
                                        </div>
                                    ))
                                ) : (
                                    <p>No movies watched in this period.</p>
                                )}
                            </div>
                        </>
                    )}
                    {section === 'household' && (
                        <>
                            <h2>Household highlights</h2>
                            <p>
                                {query.data.house.people} viewers ·{' '}
                                {(query.data.house.secs / 3600).toFixed(1)} hours ·{' '}
                                {query.data.house.sessions} sessions
                            </p>
                            <div className='ramflix-list-grid'>
                                {query.data.awards.map((award) => (
                                    <div className='ramflix-glass ramflix-award' key={award.key}>
                                        <h2>{award.title}</h2>
                                        <strong>{award.user}</strong>
                                        <p>{award.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <h2>Household leaderboard</h2>
                    <div className='ramflix-glass ramflix-leaderboard'>
                        {query.data.board.length ? (
                            query.data.board.map((person, index) => (
                                <div key={person.uid}>
                                    <span>{index + 1}</span>
                                    <strong>{person.user}</strong>
                                    <span>{(person.secs / 3600).toFixed(1)} hours</span>
                                </div>
                            ))
                        ) : (
                            <p>No viewing activity in this period yet.</p>
                        )}
                    </div>
                </>
            )}
            {section === 'live' && (
                <div className='ramflix-live-stats'>
                    {live.isFetching && !live.data && <p role='status'>Loading active viewers…</p>}
                    {live.isError && (
                        <Alert
                            severity='error'
                            action={<Button onClick={() => live.refetch()}>Retry</Button>}
                        >
                            {live.error.message}
                        </Alert>
                    )}
                    {live.data && !live.data.ok && (
                        <Alert severity='info'>
                            Live viewing information is unavailable. Check the Stats service’s server
                            permissions.
                        </Alert>
                    )}
                    {live.data?.ok && !live.data.sessions.length && (
                        <div className='ramflix-glass ramflix-empty'>
                            <h2>No one is watching right now</h2>
                            <p>Come back while a movie or show is playing.</p>
                        </div>
                    )}
                    <div className='ramflix-list-grid'>
                        {live.data?.sessions.map((session) => (
                            <div className='ramflix-glass ramflix-award' key={session.id}>
                                <p>
                                    {session.user} · {session.paused ? 'Paused' : 'Watching'}
                                </p>
                                <h2>{session.series || session.name}</h2>
                                <p>
                                    {session.series && session.name}
                                    <br />
                                    {session.device}
                                </p>
                                <Button component={Link} to={`/details?id=${session.item}`}>
                                    Open title
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
