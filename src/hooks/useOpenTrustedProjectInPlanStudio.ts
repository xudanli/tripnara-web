import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import { trustedProjectsApi } from '@/api/trusted-projects';
import {
  buildCreateTripRequestFromListing,
  buildPlanStudioUrl,
} from '@/lib/trusted-project-plan-studio-bridge';
import type { TrustedProjectListing } from '@/types/trusted-projects';

async function resolveTripIdForListing(listing: TrustedProjectListing): Promise<string> {
  if (listing.tripId) {
    try {
      const trip = await tripsApi.getById(listing.tripId);
      if (trip.status === 'PLANNING') {
        return listing.tripId;
      }
      throw new Error('NOT_PLANNING');
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_PLANNING') {
        throw error;
      }
    }
  }

  const created = await tripsApi.create(buildCreateTripRequestFromListing(listing));
  await trustedProjectsApi.linkTrip(listing.id, created.id);
  return created.id;
}

export function useOpenTrustedProjectInPlanStudio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listing: TrustedProjectListing) => {
      try {
        const tripId = await resolveTripIdForListing(listing);
        return { tripId, listingId: listing.id };
      } catch (error) {
        if (error instanceof Error && error.message === 'NOT_PLANNING' && listing.tripId) {
          return { tripId: listing.tripId, listingId: listing.id, notPlanning: true as const };
        }
        throw error;
      }
    },
    onSuccess: ({ tripId, listingId, notPlanning }) => {
      void queryClient.invalidateQueries({ queryKey: ['trusted-projects', listingId] });
      void queryClient.invalidateQueries({ queryKey: ['trusted-projects', 'mine'] });

      if (notPlanning) {
        toast.message('关联行程已不在规划中', {
          description: '已打开行程详情，如需调整请从详情进入规划工作台。',
        });
        navigate(`/dashboard/trips/${tripId}`);
        return;
      }

      toast.success('已打开规划工作台');
      navigate(buildPlanStudioUrl(tripId));
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : '无法打开规划工作台，请稍后重试';
      toast.error(message);
    },
  });
}
