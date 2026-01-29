interface OfflineBannerProps {
  isOffline: boolean;
}

export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (!isOffline) return null;
  return (
    <div className="sticky top-0 z-50 w-full bg-amber-200 px-6 py-2 text-center text-xs font-semibold text-amber-900">
      Offline mode enabled — viewing cached pages and saved pitches.
    </div>
  );
}
