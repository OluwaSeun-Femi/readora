import { formatDate } from "./format";

/** WhatsApp wants the number in international form without "+": 0803… becomes 234803…. */
export function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
}

/** A wa.me link that opens WhatsApp with the message typed in. Without a phone, the member picks a chat. */
export function whatsappLink(message: string, phone?: string | null) {
  const to = phone ? whatsappNumber(phone) : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

/** A friendly due-date reminder from the library. */
export function reminderMessage(name: string, title: string, dueOn: string, daysLeft: number) {
  const first = name.split(" ")[0];
  if (daysLeft < 0) {
    return `Hello ${first}, this is Readora Library. "${title}" was due back on ${formatDate(dueOn)}. Please bring it back when you can, or reply here if you need a little more time. Thank you!`;
  }
  if (daysLeft === 0) {
    return `Hello ${first}, this is Readora Library. "${title}" is due back today. Thank you for bringing it in!`;
  }
  return `Hello ${first}, a gentle reminder from Readora Library: "${title}" is due back on ${formatDate(dueOn)}. Happy reading!`;
}
