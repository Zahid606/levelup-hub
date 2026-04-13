import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 768) setDevice('mobile');
      else if (w < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return device;
}
