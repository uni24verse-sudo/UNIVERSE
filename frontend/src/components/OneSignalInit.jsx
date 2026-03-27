import { useEffect, useContext, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { AuthContext } from '../context/AuthContext';

const OneSignalInit = () => {
  const { vendor } = useContext(AuthContext);
  const [sdkReady, setSdkReady] = useState(false);

  // 1. Initialize SDK
  useEffect(() => {
    const init = async () => {
      try {
        await OneSignal.init({
          appId: "cec6a596-a353-47ac-af3b-f007f5ceeb54",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: true },
        });
        setSdkReady(true);
        console.log("OneSignal SDK Ready");
      } catch (err) {
        console.error("OneSignal Init Error:", err);
      }
    };
    init();
  }, []);

  // 2. Sync User Identity when SDK and Vendor are both ready
  useEffect(() => {
    const syncUser = async () => {
      if (!sdkReady) return;

      try {
        const userId = vendor?.id || vendor?._id;
        
        if (userId) {
          const cleanId = String(userId).trim();
          await OneSignal.login(cleanId);
          console.log("OneSignal identity linked:", cleanId);
        } else {
          await OneSignal.logout();
          console.log("OneSignal identity cleared (Guest)");
        }
      } catch (err) {
        console.error("OneSignal Identity Sync Error:", err);
      }
    };

    syncUser();
  }, [sdkReady, vendor]);

  return null;
};

export default OneSignalInit;
