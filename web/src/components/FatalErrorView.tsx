import { useI18n } from '../i18n/useI18n';
import { Button } from './Button';
import { AlertIcon } from './icons';
import { StatusView } from './StatusView';

export function FatalErrorView() {
  const { t } = useI18n();
  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '10vh auto' }}>
      <StatusView
        tone="danger"
        icon={<AlertIcon size={26} />}
        title={t('errorTitle')}
        message={t('errorFatalBody')}
        actions={
          <Button variant="primary" onClick={() => window.location.reload()}>
            {t('errorReload')}
          </Button>
        }
      />
    </div>
  );
}
