import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import PlayArrow from '@mui/icons-material/PlayArrow';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Favorite from '@mui/icons-material/Favorite';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Alert from '@mui/material/Alert';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getUserDataApi } from '@jellyfin/sdk/lib/utils/api/user-data-api';
import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';
import { useFeatured } from './useFeatured';

export function useItemImage() {
    const { __legacyApiClient__: client } = useApi();
    return (item: ItemDto, type: string, width: number) =>
        item.Id ?
            (client?.getImageUrl(item.Id, {
                type,
                index: 0,
                maxWidth: width,
                tag: type === 'Backdrop' ? item.BackdropImageTags?.[0] : item.ImageTags?.[type]
            }) ?? '') :
            '';
}

export function CinematicHero({
    parentId,
    type,
    onArtworkChange
}: Readonly<{ parentId?: string; type?: BaseItemKind; onArtworkChange?: (url: string) => void }>) {
    const { data: featured = [], isPending } = useFeatured(parentId, type);
    const items = featured.slice(0, 8);
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const image = useItemImage();
    const [index, setIndex] = useState(0);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [savingFavorite, setSavingFavorite] = useState(false);
    const item = items[index % Math.max(items.length, 1)];
    const backdropUrl = item ? image(item, 'Backdrop', 2560) : '';
    useEffect(() => {
        onArtworkChange?.(backdropUrl);
    }, [backdropUrl, onArtworkChange]);
    useEffect(() => {
        setIndex(0);
        setError('');
    }, [parentId, type]);
    const move = (step: number) => setIndex((value) => (value + step + items.length) % items.length);
    const play = async () => {
        setBusy(true);
        setError('');
        try {
            await playbackManager.play({ items: [item] });
        } catch {
            setError('Could not start playback. Open the title for available playback options.');
        } finally {
            setBusy(false);
        }
    };
    const favorite = async () => {
        if (!item?.Id || !api || !user?.Id || savingFavorite) return;
        setSavingFavorite(true);
        setError('');
        try {
            const params = { userId: user.Id, itemId: item.Id };
            const endpoint = getUserDataApi(api);
            const response = item.UserData?.IsFavorite ? await endpoint.unmarkFavoriteItem(params) : await endpoint.markFavoriteItem(params);
            queryClient.setQueriesData<ItemDto[]>(
                { queryKey: ['Ramflix', 'Featured', api.basePath, user.Id] },
                (cached) =>
                    cached?.map((title) =>
                        title.Id === item.Id ?
                            {
                                ...title,
                                UserData: response.data
                            } :
                            title
                    )
            );
            await queryClient.invalidateQueries({ queryKey: ['User', user.Id, 'Items'] });
        } catch {
            setError('Could not update favorites. Please try again.');
        } finally {
            setSavingFavorite(false);
        }
    };
    if (!item && !isPending) return null;
    return (
        <section className={`ramflix-hero ${isPending ? 'loading' : ''}`} aria-label='Featured title'>
            {item && (
                <>
                    <img
                        className='ramflix-hero-art'
                        src={image(item, 'Backdrop', 2560)}
                        alt=''
                        fetchPriority='high'
                    />
                    <div className='ramflix-hero-scrim' />
                    <div className='ramflix-hero-copy'>
                        {item.ImageTags?.Logo ? (
                            <img
                                className='ramflix-title-art'
                                src={image(item, 'Logo', 700)}
                                alt={item.Name ?? ''}
                            />
                        ) : (
                            <h1>{item.Name}</h1>
                        )}
                        <div className='ramflix-hero-meta'>
                            {item.CommunityRating ? <span>★ {item.CommunityRating.toFixed(1)}</span> : null}
                            <span>{item.ProductionYear}</span>
                            <span>{item.Genres?.slice(0, 2).join(' · ')}</span>
                            {item.OfficialRating && <span>{item.OfficialRating}</span>}
                        </div>
                        <p>{item.Overview}</p>
                        <div className='ramflix-hero-actions'>
                            <Button
                                variant='contained'
                                startIcon={<PlayArrow />}
                                onClick={play}
                                disabled={busy}
                            >
                                Play
                            </Button>
                            <IconButton
                                aria-label={
                                    item.UserData?.IsFavorite ? 'Remove from favorites' : 'Add to favorites'
                                }
                                onClick={favorite}
                                disabled={savingFavorite}
                            >
                                {item.UserData?.IsFavorite ? <Favorite /> : <FavoriteBorder />}
                            </IconButton>
                            <IconButton
                                component={Link}
                                to={`/details?id=${item.Id}`}
                                aria-label={`Details for ${item.Name}`}
                            >
                                <InfoOutlined />
                            </IconButton>
                        </div>
                        {error && <Alert severity='error'>{error}</Alert>}
                    </div>
                    {items.length > 1 && (
                        <div className='ramflix-hero-pagination'>
                            <div>
                                <IconButton aria-label='Previous featured title' onClick={() => move(-1)}>
                                    <ChevronLeft />
                                </IconButton>
                                <IconButton aria-label='Next featured title' onClick={() => move(1)}>
                                    <ChevronRight />
                                </IconButton>
                            </div>
                            <div className='ramflix-hero-dots'>
                                {items.slice(0, 8).map((title, i) => (
                                    <button
                                        key={title.Id}
                                        type='button'
                                        aria-label={`Feature ${title.Name}`}
                                        aria-pressed={i === index}
                                        className={i === index ? 'selected' : ''}
                                        onClick={() => setIndex(i)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export function FeaturedRow({ parentId, type }: Readonly<{ parentId?: string; type?: BaseItemKind }>) {
    const { data: items = [] } = useFeatured(parentId, type);
    const image = useItemImage();
    if (!items.length) return null;
    return (
        <section className='ramflix-featured-row'>
            <h2>{type === BaseItemKind.Series ? 'Featured shows' : 'Featured movies'}</h2>
            <div>
                {items.map((item) => (
                    <Link key={item.Id} to={`/details?id=${item.Id}`} aria-label={item.Name ?? ''}>
                        <img src={image(item, 'Backdrop', 640)} alt='' loading='lazy' />
                        <span>{item.Name}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
