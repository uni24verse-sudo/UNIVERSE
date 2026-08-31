import { useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const OneSignalInit = () => {
  const { vendor } = useContext(AuthContext);

  useEffect(() => {
    // 1. Initialize OneSignal v16 using the provided Deferred pattern
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: "a2a1bddd-7fdd-46bf-8424-dee74aeb0bdf",
        safari_web_id: "web.onesignal.auto.3a850f03-75f9-40a0-acb5-2bc8b318c823",
        notifyButton: {
          enable: true,
        },
        allowLocalhostAsSecureOrigin: true, // Useful for testing
      });

      // 2. Automatically link user identity when vendor logs in
      if (vendor) {
        const userId = vendor.id || vendor._id;
        if (userId) {
          const cleanId = String(userId).trim();
          await OneSignal.login(cleanId);
          console.log("OneSignal v16: Identity linked for vendor", cleanId);
        }
      } else {
        await OneSignal.logout();
        console.log("OneSignal v16: Guest session (logged out)");
      }
    });

  }, [vendor]);

  return null;
};

export default OneSignalInit;
