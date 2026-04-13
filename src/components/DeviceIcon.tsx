import { useDeviceType } from '@/hooks/useDeviceType';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function DeviceIcon() {
  const device = useDeviceType();

  const icon = device === 'mobile' 
    ? <Smartphone className="h-4 w-4" /> 
    : device === 'tablet' 
    ? <Tablet className="h-4 w-4" /> 
    : <Monitor className="h-4 w-4" />;

  const label = device.charAt(0).toUpperCase() + device.slice(1);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-muted-foreground border border-border/50">
          {icon}
        </div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
