// src/pages/errors/NetworkError.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorPageLayout } from '../../components/ui/ErrorPageLayout';
import { reloadErrorReturnPath } from '../../utils/errorRedirect';

export const NetworkError: React.FC = () => {
    const { t } = useTranslation("common");

    // Auto-retry when connection is restored
    React.useEffect(() => {
        const interval = setInterval(() => {
            if (navigator.onLine) {
                reloadErrorReturnPath();
            }
        }, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <ErrorPageLayout
            errorCode="503"
            title={t("errors.network.title")}
            description={t("errors.network.description")}
            primaryActionLabel={t("errors.network.tryAgain")}
            onPrimaryAction={reloadErrorReturnPath}
            showBackButton={false}
        />
    );
};

export default NetworkError;
