import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getPlaylistApi } from '@jellyfin/sdk/lib/utils/api/playlist-api';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import BookmarkBorder from '@mui/icons-material/BookmarkBorder';
import { useApi } from 'hooks/useApi';
import { useItemImage } from '../../features/ramflix/CinematicHero';
import type { ItemDto } from 'types/base/models/item-dto';

export default function Lists() {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const image = useItemImage();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const queryKey = ['Ramflix', 'Lists', api?.basePath, user?.Id];
    const query = useQuery({
        queryKey,
        enabled: Boolean(api && user?.Id),
        queryFn: async ({ signal }) =>
            (
                await getLibraryApi(api!).getItems(
                    { userId: user!.Id, recursive: true, includeItemTypes: [BaseItemKind.Playlist] },
                    { signal }
                )
            ).data.Items ?? []
    });
    const create = async () => {
        if (!api || !user?.Id || !name.trim() || saving) return;
        setSaving(true);
        setError('');
        try {
            await getPlaylistApi(api).createPlaylist({
                createPlaylistDto: {
                    Name: name.trim(),
                    Ids: [],
                    UserId: user.Id,
                    MediaType: MediaType.Video,
                    IsPublic: false
                }
            });
            await queryClient.invalidateQueries({ queryKey });
            setName('');
            setOpen(false);
        } catch {
            setError('Could not create the list. Please try again.');
        } finally {
            setSaving(false);
        }
    };
    return (
        <section className='ramflix-page ramflix-lists'>
            <div className='ramflix-page-heading'>
                <h1>My Lists</h1>
                <Button variant='contained' onClick={() => setOpen(true)}>
                    + New list
                </Button>
            </div>
            <Link to='/home?tab=1' className='ramflix-glass ramflix-list-link'>
                <BookmarkBorder />
                <div>
                    <strong>Favorites</strong>
                    <p>All the movies and shows you have saved</p>
                </div>
                <span>→</span>
            </Link>
            {query.isError && (
                <Alert severity='error' action={<Button onClick={() => query.refetch()}>Retry</Button>}>
                    Could not load your lists.
                </Alert>
            )}
            {query.isPending && <p role='status'>Loading your lists…</p>}
            {!query.isPending && !query.isError && !query.data?.length && (
                <div className='ramflix-glass ramflix-empty'>
                    <BookmarkBorder />
                    <h2>Your next collection starts here</h2>
                    <p>Create a list, then add titles from their More menu.</p>
                    <Button onClick={() => setOpen(true)}>Create your first list</Button>
                </div>
            )}
            {Boolean(query.data?.length) && (
                <div className='ramflix-list-grid'>
                    {query.data?.map((item) => (
                        <Link className='ramflix-glass' key={item.Id} to={`/details?id=${item.Id}`}>
                            {item.ImageTags?.Primary && (
                                <img src={image(item as ItemDto, 'Primary', 480)} alt='' loading='lazy' />
                            )}
                            <h2>{item.Name}</h2>
                        </Link>
                    ))}
                </div>
            )}
            <Dialog
                open={open}
                onClose={() => {
                    if (!saving) setOpen(false);
                }}
                fullWidth
                maxWidth='xs'
            >
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        create().catch(() => setError('Could not create the list.'));
                    }}
                >
                    <DialogTitle>New list</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            label='List name'
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                            margin='dense'
                        />
                        {error && <Alert severity='error'>{error}</Alert>}
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={saving} onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={saving || !name.trim()}>
                            Create
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </section>
    );
}
