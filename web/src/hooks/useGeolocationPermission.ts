import { useEffect, useState } from 'react';

export type GeolocationPermission = PermissionState | 'unknown';

/**
 * Reports the geolocation permission without prompting the user.
 * Lets the app locate automatically only when access was already granted, instead
 * of showing a permission prompt on page load.
 */
export function useGeolocationPermission(): GeolocationPermission {
  const [permission, setPermission] = useState<GeolocationPermission>('unknown');

  useEffect(() => {
    if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
      return;
    }

    let status: PermissionStatus | null = null;
    let cancelled = false;
    const update = () => {
      if (status) setPermission(status.state);
    };

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (cancelled) return;
        status = result;
        update();
        status.addEventListener('change', update);
      })
      .catch(() => undefined); // Some browsers reject the query; 'unknown' is a safe fallback.

    return () => {
      cancelled = true;
      status?.removeEventListener('change', update);
    };
  }, []);

  return permission;
}
