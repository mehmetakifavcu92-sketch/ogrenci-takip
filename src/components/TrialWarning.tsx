import React from 'react';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';

export const TrialWarning: React.FC = () => {
  const { isTrial, daysLeft, isExpired, showWarning } = useTrialStatus();

  if (!isTrial) return null;

  if (isExpired) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-red-800">
                Deneme Süreniz Doldu! ⚠️
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Hesabınız askıya alındı. Admin ile iletişime geçin veya premium pakete geçin.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showWarning) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-yellow-800">
                Deneme Süreniz Dolmak Üzere! ⏰
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Yarın deneme süreniz dolacak. Admin ile iletişime geçin.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-blue-800">
              Deneme Paketi Aktif 📚
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {daysLeft} gün kaldı. Tüm özellikleri kullanabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
