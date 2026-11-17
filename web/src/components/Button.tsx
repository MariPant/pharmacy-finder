import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/classNames';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'tinted' | 'ghost';
type Size = 'sm' | 'md';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /** Square button without text. Must be given an `aria-label`. */
  iconOnly?: boolean;
}

const buttonClassName = (
  { variant = 'secondary', size = 'md', iconOnly = false }: StyleProps,
  className?: string,
) => cx(styles.button, styles[variant], styles[size], iconOnly && styles.iconOnly, className);

export function Button({
  variant,
  size,
  icon,
  iconOnly,
  className,
  children,
  type = 'button',
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, iconOnly }, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  iconOnly,
  className,
  children,
  ...rest
}: StyleProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClassName({ variant, size, iconOnly }, className)} {...rest}>
      {icon}
      {children}
    </a>
  );
}
