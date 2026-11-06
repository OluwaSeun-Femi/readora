import { MessageCircle } from "lucide-react";
import { reminderMessage, whatsappLink } from "@/lib/whatsapp";
import { button } from "@/components/ui/button";

/** Opens WhatsApp with a friendly due-date reminder typed in, addressed to the member. */
export function RemindButton({
  member,
  phone,
  title,
  dueOn,
  daysLeft,
}: {
  member: string;
  phone: string | null;
  title: string;
  dueOn: string;
  daysLeft: number;
}) {
  if (!phone) return null;
  return (
    <a
      href={whatsappLink(reminderMessage(member, title, dueOn, daysLeft), phone)}
      target="_blank"
      rel="noreferrer"
      className={`${button.icon} ${daysLeft < 0 ? "text-alarm hover:!bg-alarm-soft hover:!text-alarm" : ""}`}
      aria-label={`Remind ${member} on WhatsApp`}
      title={`Remind ${member} on WhatsApp`}
    >
      <MessageCircle className="size-[18px]" />
    </a>
  );
}
