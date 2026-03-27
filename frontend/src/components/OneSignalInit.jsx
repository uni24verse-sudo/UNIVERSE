import { useEffect, useContext, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { AuthContext } from '../context/AuthContext';

const OneSignalInit = () => {
  const { vendor, token } = useContext(AuthContext);
  const isInitialized = useRef(false);

  useEffect(() => {
    const initOneSignal = async () => {
      if (isInitialized.current) return;
      try {
        await OneSignal.init({
          appId: "cec6a596-a353-47ac-af3b-f007f5ceeb54",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
          },
        });
        isInitialized.current = true;
        console.log("OneSignal Initialized");
        
        // Immediate sync after init
        if (vendor && (vendor.id || vendor._id)) {
          await OneSignal.login(vendor.id || vendor._id);
          console.log("OneSignal External ID linked:", vendor.id || vendor._id);
        }
      } catch (err) {
        console.error("OneSignal Init Error:", err);
      }
    };

    initOneSignal();
  }, []); // Only once on mount

  useEffect(() => {
    const syncUser = async () => {
      if (!isInitialized.current) return;
      try {
        if (vendor && (vendor.id || vendor._id)) {
          await OneSignal.login(vendor.id || vendor._id);
          console.log("OneSignal External ID synced:", vendor.id || vendor._id);
        } else if (!vendor && isInitialized.current) {
          await OneSignal.logout();
          console.log("OneSignal External ID cleared");
        }
      } catch (err) {
        console.error("OneSignal User Sync Error:", err);
      }
    };

    syncUser();
  }, [vendor, token]); // Sync when auth changes

  return null;
};

export default OneSignalInit;
