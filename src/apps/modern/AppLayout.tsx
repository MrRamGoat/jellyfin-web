import React, { StrictMode, useCallback, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import { type Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { CinematicHero, FeaturedRow } from './features/ramflix/CinematicHero';
import './features/ramflix/ramflix.scss';

import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import OffsetAppBar from 'components/OffsetAppBar';
import ThemeCss from 'components/ThemeCss';
import { useApi } from 'hooks/useApi';

import AppToolbar from './components/AppToolbar';
import AppDrawer, { isDrawerPath } from './components/drawers/AppDrawer';
import LibraryToolbar from './features/libraries/components/LibraryToolbar';
import { LibraryProvider } from './features/libraries/hooks/useLibrary';
import { isLibraryPath } from './features/libraries/utils/path';

import './AppOverrides.scss';

export const Component = () => {
    const [isDrawerActive, setIsDrawerActive] = useState(false);
    const { user } = useApi();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const active = Boolean(user) && location.pathname !== '/video';
    const catalog = active && ['/movies', '/tv'].includes(location.pathname);
    const cinematic = catalog || (active && location.pathname === '/home' && searchParams.get('tab') !== '1');
    const itemType = location.pathname === '/tv' ? BaseItemKind.Series : BaseItemKind.Movie;
    const parentId = searchParams.get('topParentId') ?? searchParams.get('parentId') ?? undefined;
    const [artwork, setArtwork] = useState('');
    useEffect(() => {
        if (!cinematic) setArtwork('');
    }, [cinematic]);

    const isMediumScreen = useMediaQuery((t: Theme) => t.breakpoints.up('md'));
    const isDrawerAvailable = isDrawerPath(location.pathname) && Boolean(user) && !isMediumScreen;
    const isDrawerOpen = isDrawerActive && isDrawerAvailable;

    const onToggleDrawer = useCallback(() => {
        setIsDrawerActive(!isDrawerActive);
    }, [isDrawerActive, setIsDrawerActive]);

    return (
        <LibraryProvider>
            <Box
                className={active ? 'ramflix-app' : undefined}
                sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                }}
            >
                <StrictMode>
                    <OffsetAppBar dense>
                        <AppToolbar
                            isDrawerAvailable={!isMediumScreen && isDrawerAvailable}
                            isDrawerOpen={isDrawerOpen}
                            onDrawerButtonClick={onToggleDrawer}
                        />
                        {isLibraryPath(location.pathname) && !catalog && <LibraryToolbar />}
                    </OffsetAppBar>

                    {isDrawerAvailable && (
                        <AppDrawer open={isDrawerOpen} onClose={onToggleDrawer} onOpen={onToggleDrawer} />
                    )}
                </StrictMode>

                <Box
                    component='main'
                    className={cinematic ? 'ramflix-cinematic-content' : undefined}
                    style={
                        {
                            '--ramflix-artwork': artwork ? `url("${artwork}")` : 'none'
                        } as React.CSSProperties
                    }
                    sx={{
                        position: 'relative',
                        width: '100%',
                        flexGrow: 1
                    }}
                >
                    <AppBody>
                        {cinematic && (
                            <CinematicHero
                                parentId={parentId}
                                type={catalog ? itemType : undefined}
                                onArtworkChange={setArtwork}
                            />
                        )}
                        {catalog && (
                            <div className='ramflix-catalog-heading'>
                                <h1>{itemType === BaseItemKind.Series ? 'TV Series' : 'Movies'}</h1>
                                <LibraryToolbar />
                            </div>
                        )}
                        {catalog && <FeaturedRow parentId={parentId} type={itemType} />}
                        <Outlet />
                    </AppBody>
                </Box>
            </Box>
            <ThemeCss />
            <CustomCss server={false} />
        </LibraryProvider>
    );
};
