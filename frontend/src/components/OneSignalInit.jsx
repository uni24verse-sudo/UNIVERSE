import { useEffect, useContext } from 'react';
import OneSignal from 'react-onesignal';
import { AuthContext } from '../context/AuthContext';

const OneSignalInit = () => {
  const { vendor, token } = useContext(AuthContext);

  useEffect(() => {
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: "cec6a596-a353-47ac-af3b-f007f5ceeb54",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
          },
        });
        console.log("OneSignal Initialized");

        // If logged in, set external ID to link user account
        if (vendor && vendor._id) {
          await OneSignal.login(vendor._id);
          console.log("OneSignal External ID set to:", vendor._id);
        } else {
          await OneSignal.logout();
        }
      } catch (err) {
        console.error("OneSignal Init Error:", err);
      }
    };

    initOneSignal();
  }, [vendor, token]);

  return null;
};

export default OneSignalInit;
