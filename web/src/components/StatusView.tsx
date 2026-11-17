import type { ReactNode } from 'react';
import { cx } from '../utils/classNames';
import styles from './StatusView.module.css';

type Tone = 'neutral' | 'accent' | 'danger';

interface StatusViewProps {
  icon: ReactNode;
  title: string;
  message?: string;
  actions?: ReactNode;
  tone?: Tone;
}

/** Full-width placeholder for welcome, empty and error states. */
export function StatusView({ icon, title, message, actions, tone = 'neutral' }: StatusViewProps) {
  return (
    <div className={styles.view} role={tone === 'danger' ? 'alert' : undefined}>
      <span className={cx(styles.icon, styles[tone])}>{icon}</span>
      <h2 className={styles.title}>{title}</h2>
      {message && <p className={styles.message}>{message}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

interface BannerProps {
  icon: ReactNode;
  children: ReactNode;
  tone?: 'danger' | 'warning';
  action?: ReactNode;
}

/** Inline message that sits above existing content (e.g. a failed refresh). */
export function Banner({ icon, children, tone = 'danger', action }: BannerProps) {
  return (
    <div className={cx(styles.banner, styles[`banner-${tone}`])} role="status">
      <span className={styles.bannerIcon}>{icon}</span>
      <p className={styles.bannerText}>{children}</p>
      {action}
    </div>
  );
}

export function PharmacyListSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.skeletonList} aria-busy="true" aria-label={label}>
      <p className={styles.skeletonLabel}>{label}</p>
      {[0, 1, 2].map((index) => (
        <div key={index} className={styles.skeletonCard}>
          <div className={cx(styles.skeletonLine, styles.lineTitle)} />
          <div className={cx(styles.skeletonLine, styles.lineText)} />
          <div className={cx(styles.skeletonLine, styles.lineShort)} />
        </div>
      ))}
    </div>
  );
}
