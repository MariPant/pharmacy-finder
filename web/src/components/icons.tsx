import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const PharmacyCrossIcon = (props: IconProps) => (
  <Icon {...props} stroke="none" fill="currentColor">
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
  </Icon>
);

export const LocateIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Icon>
);

export const RefreshIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const PinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const DirectionsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 11.5 21 3l-8.5 18-2.2-7.3z" />
  </Icon>
);

export const MapIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 4-6 2.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V13" />
    <path d="M12 16.5h.01" />
  </Icon>
);

export const OfflineIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 8.5a15 15 0 0 1 4.5-2.9M10.7 5.1A15 15 0 0 1 22 8.5" />
    <path d="M5 12a10 10 0 0 1 4.2-2.4M14.5 9.9A10 10 0 0 1 19 12" />
    <path d="M8.5 15.5a5 5 0 0 1 7 0" />
    <path d="M12 19h.01" />
    <path d="m3 3 18 18" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const PhoneIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Icon>
);
