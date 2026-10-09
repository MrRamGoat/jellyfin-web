import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import MovieOutlined from '@mui/icons-material/MovieOutlined';
import TvOutlined from '@mui/icons-material/TvOutlined';
import BookmarkBorder from '@mui/icons-material/BookmarkBorder';
import Search from '@mui/icons-material/Search';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Divider from '@mui/material/Divider';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useUserViews } from 'hooks/api/useUserViews';
import { appRouter } from 'components/router/appRouter';
import UserMenuButton from 'components/toolbar/UserMenuButton';
import SyncPlayButton from '../../components/AppToolbar/SyncPlayButton';
import RemotePlayButton from '../../components/AppToolbar/RemotePlayButton';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';

const libraryUrl = (view: BaseItemDto) =>
    appRouter.getRouteUrl(view, { context: view.CollectionType }).substring(1);

export default function RamflixNavigation() {
    const { data } = useUserViews();
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const views = data?.Items ?? [];
    const movies = views.find(
        (view) => view.CollectionType === CollectionType.Movies && !/vod/i.test(view.Name ?? '')
    );
    const shows = views.find((view) => view.CollectionType === CollectionType.Tvshows);
    const primary = [
        { label: 'Home', to: '/home', icon: <HomeOutlined /> },
        ...(movies ? [{ label: 'Movies', to: libraryUrl(movies), icon: <MovieOutlined /> }] : []),
        ...(shows ? [{ label: 'Shows', to: libraryUrl(shows), icon: <TvOutlined /> }] : []),
        { label: 'My Lists', to: '/ramflix/lists', icon: <BookmarkBorder /> }
    ];
    const close = () => setAnchor(null);
    const selected = (to: string) =>
        location.pathname === to.split('?')[0] && !(to === '/home' && location.search.includes('tab=1'));
    return (
        <>
            <Toolbar className='ramflix-toolbar' variant='dense'>
                <Link to='/home' className='ramflix-brand' aria-label='RamFLIX home'>
                    <img src='assets/ramflix/ramflix-logo.png' alt='' />
                </Link>
                <IconButton className='ramflix-back' aria-label='Back' onClick={() => navigate(-1)}>
                    <ArrowBack />
                </IconButton>
                <nav className='ramflix-desktop-nav' aria-label='Main navigation'>
                    {primary.map((item) => (
                        <Button
                            variant='text'
                            key={item.label}
                            component={Link}
                            to={item.to}
                            className={selected(item.to) ? 'selected' : ''}
                            startIcon={selected(item.to) ? item.icon : undefined}
                            aria-current={selected(item.to) ? 'page' : undefined}
                        >
                            {item.label}
                        </Button>
                    ))}
                </nav>
                <div className='ramflix-header-actions'>
                    {isMobile && <div className='ramflix-mobile-sync'>
                        <SyncPlayButton />
                    </div>}
                    <IconButton component={Link} to='/search' aria-label='Search'>
                        <Search />
                    </IconButton>
                    <IconButton
                        aria-label='More navigation and tools'
                        aria-haspopup='true'
                        aria-expanded={Boolean(anchor)}
                        onClick={(event) => setAnchor(event.currentTarget)}
                    >
                        <MoreHoriz />
                    </IconButton>
                    <UserMenuButton />
                </div>
            </Toolbar>
            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={close}
                disableEnforceFocus
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuList className='ramflix-tools' autoFocusItem aria-label='Navigation and tools'>
                    <MenuItem component={Link} to='/home?tab=1' onClick={close}>
                        Favorites
                    </MenuItem>
                    {views
                        .filter(
                            (view) =>
                                view.Id !== movies?.Id
                                && view.Id !== shows?.Id
                        )
                        .map((view) => (
                            <MenuItem key={view.Id} component={Link} to={libraryUrl(view)} onClick={close}>
                                {view.Name}
                            </MenuItem>
                        ))}
                    <MenuItem component={Link} to='/ramflix/guide' onClick={close}>
                        Channel Guide
                    </MenuItem>
                    <MenuItem component={Link} to='/ramflix/stats' onClick={close}>
                        Stats
                    </MenuItem>
                    <MenuItem component={Link} to='/ramflix/voice' onClick={close}>
                        Voice search
                    </MenuItem>
                    <Divider />
                    <div className='ramflix-native-tools'>
                        {!isMobile && <><span>Watch together</span><SyncPlayButton /></>}
                        <span>Cast to a device</span>
                        <RemotePlayButton />
                    </div>
                    <MenuItem component={Link} to='/mypreferencesdisplay' onClick={close}>
                        Display &amp; appearance
                    </MenuItem>
                </MenuList>
            </Popover>
            <nav className='ramflix-dock' aria-label='Mobile navigation'>
                {primary.map((item) => (
                    <Link
                        key={item.label}
                        to={item.to}
                        className={selected(item.to) ? 'selected' : ''}
                        aria-label={item.label}
                        aria-current={selected(item.to) ? 'page' : undefined}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </Link>
                ))}
                <Link to='/ramflix/guide' aria-label='Guide'>
                    <TvOutlined />
                    <span>Guide</span>
                </Link>
                <Link to='/search' aria-label='Search'>
                    <Search />
                    <span>Search</span>
                </Link>
            </nav>
        </>
    );
}
