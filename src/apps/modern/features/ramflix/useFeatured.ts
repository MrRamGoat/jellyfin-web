import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

export function useFeatured(parentId?: string, type?: BaseItemKind) {
    const { api, user } = useApi();
    return useQuery({
        queryKey: ['Ramflix', 'Featured', api?.basePath, user?.Id, parentId, type],
        enabled: Boolean(api && user?.Id),
        staleTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        queryFn: async ({ signal }) => {
            const result = await getLibraryApi(api!).getItems(
                {
                    userId: user!.Id,
                    parentId,
                    recursive: true,
                    limit: 16,
                    includeItemTypes: type ? [type] : [BaseItemKind.Movie, BaseItemKind.Series],
                    sortBy: [ItemSortBy.Random],
                    imageTypes: [ImageType.Backdrop],
                    fields: [ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio],
                    enableUserData: true
                },
                { signal }
            );
            return (result.data.Items ?? []).filter((item) => item.BackdropImageTags?.length) as ItemDto[];
        }
    });
}
