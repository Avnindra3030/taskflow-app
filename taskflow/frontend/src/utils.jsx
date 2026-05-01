import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns';

export function getAvatarStyle(avatar) {
  if (!avatar) return { background: '#6366f1' };
  const [, color] = avatar.split('|');
  return { background: color || '#6366f1' };
}

export function getAvatarInitials(avatar) {
  if (!avatar) return '?';
  return avatar.split('|')[0];
}

export function Avatar({ name, avatar, size = 'md', className = '' }) {
  const style = getAvatarStyle(avatar);
  const initials = avatar ? getAvatarInitials(avatar) : (name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?');
  return (
    <div className={`avatar avatar-${size} ${className}`} style={style} title={name}>
      {initials}
    </div>
  );
}

export function timeAgo(dateStr) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  }
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  try {
    return isPast(parseISO(dateStr));
  } catch {
    return false;
  }
}

export function statusLabel(status) {
  return { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }[status] || status;
}

export function priorityLabel(p) {
  return { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }[p] || p;
}

export function priorityDot(p) {
  return { low: '🟢', medium: '🔵', high: '🟠', urgent: '🔴' }[p] || '⚪';
}

export function getErrorMessage(err) {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.response?.data?.errors) return err.response.data.errors.map(e => e.msg).join(', ');
  return err?.message || 'An unexpected error occurred';
}

export function progressPercent(taskCount, doneCount) {
  if (!taskCount) return 0;
  return Math.round((doneCount / taskCount) * 100);
}
