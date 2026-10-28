import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/messaging";

type Props = {
  name?: string | null | undefined;
  url?: string | null | undefined;
  /** The shared Admin Team conversation shows a group icon instead of initials. */
  team?: boolean | undefined;
  className?: string | undefined;
};

export function PersonAvatar({ name, url, team, className }: Props) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {url && !team ? <AvatarImage src={url} alt="" /> : null}
      <AvatarFallback
        className={cn(
          "text-sm font-semibold",
          team
            ? "bg-primary text-primary-foreground"
            : "bg-accent/10 text-accent",
        )}
      >
        {team ? (
          <Users className="h-[45%] w-[45%]" aria-hidden />
        ) : (
          initials(name)
        )}
      </AvatarFallback>
    </Avatar>
  );
}
