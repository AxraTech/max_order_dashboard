import dayjs from 'dayjs';

/**
 * Standard Date & Time formatting utilities for MaxOrder Admin Dashboard.
 * Formats:
 * - Date: MM/DD/YYYY (e.g. 10/28/2026)
 * - Time: hh:mm A (e.g. 10:30 AM)
 */

export const formatDate = (date: string | number | Date | dayjs.Dayjs | null | undefined): string => {
  if (!date) return '—';
  const d = dayjs(date);
  return d.isValid() ? d.format('MM/DD/YYYY') : '—';
};

export const formatTime = (date: string | number | Date | dayjs.Dayjs | null | undefined): string => {
  if (!date) return '—';
  const d = dayjs(date);
  return d.isValid() ? d.format('hh:mm A') : '—';
};

export const formatDateTime = (date: string | number | Date | dayjs.Dayjs | null | undefined): { date: string; time: string } => {
  return {
    date: formatDate(date),
    time: formatTime(date),
  };
};
