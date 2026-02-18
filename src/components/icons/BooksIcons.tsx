import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function LibraryIcon(props: IconProps): JSX.Element {
  return (
    <BaseIcon {...props}>
      <path d="M4 4h4v16H4zM10 4h4v16h-4zM16 4h4v16h-4z" />
    </BaseIcon>
  );
}

export function ClockIcon(props: IconProps): JSX.Element {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </BaseIcon>
  );
}

export function TagIcon(props: IconProps): JSX.Element {
  return (
    <BaseIcon {...props}>
      <path d="M3.5 12.5 12 4h7v7l-8.5 8.5a2 2 0 0 1-2.8 0l-4.2-4.2a2 2 0 0 1 0-2.8Z" />
      <circle cx="16.5" cy="7.5" r="1" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps): JSX.Element {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </BaseIcon>
  );
}

export function SlidersIcon(props: IconProps): JSX.Element {
  return (
    <BaseIcon {...props}>
      <path d="M4 6h6M14 6h6M10 6v0M4 12h10M18 12h2M14 12v0M4 18h2M10 18h10M8 18v0" />
    </BaseIcon>
  );
}

export function NoteIcon(props: IconProps): JSX.Element {
  return (
    <BaseIcon {...props}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v5h4" />
      <path d="M9 13h6M9 17h6" />
    </BaseIcon>
  );
}
