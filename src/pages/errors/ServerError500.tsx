// src/pages/errors/ServerError500.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorPageLayout } from '../../components/ui/ErrorPageLayout';
import { reloadErrorReturnPath } from '../../utils/errorRedirect';

export const ServerError500: React.FC = () => {
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
            errorCode="500"
            title={t("errors.serverError.title")}
            description={t("errors.serverError.description")}
            primaryActionLabel={t("errors.network.tryAgain")}
            onPrimaryAction={reloadErrorReturnPath}
        />
    );
};

export default ServerError500;
