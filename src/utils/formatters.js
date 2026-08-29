import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

export function formatMessageTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (differenceInDays(new Date(), d) < 7) return format(d, 'EEEE');
  return format(d, 'M/d/yy');
}

export function formatChatListTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (differenceInDays(new Date(), d) < 7) return format(d, 'EEE');
  return format(d, 'M/d/yy');
}

export function formatLastSeen(date) {
  if (!date) return 'Last seen recently';
  const d = new Date(date);
  if (isToday(d)) return `Last seen today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Last seen yesterday at ${format(d, 'h:mm a')}`;
  return `Last seen ${format(d, 'MMM d')} at ${format(d, 'h:mm a')}`;
}

export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function truncate(str, max = 30) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}
