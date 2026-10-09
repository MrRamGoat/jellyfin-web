import React, { type FC } from 'react';

import { useUserSettings } from 'hooks/useUserSettings';
import { useBrandingOptions } from 'apps/dashboard/features/branding/api/useBrandingOptions';

const CustomCss: FC<{ server?: boolean }> = ({ server = true }) => {
    const { data: brandingOptions } = useBrandingOptions();
    const { customCss: userCustomCss, disableCustomCss } = useUserSettings();

    return (
        <>
            {server && !disableCustomCss && brandingOptions?.CustomCss && (
                <style>
                    {brandingOptions.CustomCss}
                </style>
            )}
            {userCustomCss && (
                <style>
                    {userCustomCss}
                </style>
            )}
        </>
    );
};

export default CustomCss;
