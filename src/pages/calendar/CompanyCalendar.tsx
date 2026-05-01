import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type HolidayKind = 'public' | 'cuti_bersama';

interface CalendarHoliday {
  date: string;
  name: string;
  kind: HolidayKind;
}

interface IndonesiaCalendarApi {
  year: number;
  source: 'company_bundle' | 'computed';
  warnings: string[];
  publicHolidays: CalendarHoliday[];
  cutiBersama: CalendarHoliday[];
  notes: string[];
  generatedAt: string;
}

function holidaysByDate(publicHolidays: CalendarHoliday[], cutiBersama: CalendarHoliday[]): Map<string, CalendarHoliday> {
  const map = new Map<string, CalendarHoliday>();
  for (const h of cutiBersama) map.set(h.date, h);
  for (const h of publicHolidays) map.set(h.date, h);
  return map;
}

export default function CompanyCalendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();

  const { data, isLoading, error } = useQuery({
    queryKey: ['calendar-indonesia', year],
    queryFn: () => api.get<IndonesiaCalendarApi>(`/calendar/indonesia?year=${year}`),
    staleTime: 1000 * 60 * 60 * 6,
  });

  const byDate = useMemo(() => {
    if (!data) return new Map<string, CalendarHoliday>();
    return holidaysByDate(data.publicHolidays, data.cutiBersama);
  }, [data]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [selected, setSelected] = useState<Date | null>(null);
  const selectedKey = selected ? format(selected, 'yyyy-MM-dd') : null;
  const selectedHoliday = selectedKey ? byDate.get(selectedKey) : undefined;

  const upcoming = useMemo(() => {
    if (!data) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const all = [...data.publicHolidays, ...data.cutiBersama].sort((a, b) => a.date.localeCompare(b.date));
    const seen = new Set<string>();
    const dedup: CalendarHoliday[] = [];
    for (const h of all) {
      if (seen.has(h.date)) continue;
      seen.add(h.date);
      dedup.push(h);
    }
    return dedup.filter((h) => h.date >= format(today, 'yyyy-MM-dd')).slice(0, 8);
  }, [data]);

  const errMsg = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-[var(--text-primary)]">
          Holiday calendar
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant dark:text-[var(--text-secondary)]">
          Indonesia public holidays and collective leave (cuti bersama). Public holidays are mandatory paid days off;
          cuti bersama may be a working day or annual leave, depending on company policy. Dates are loaded from the
          server.
        </p>
      </div>

      {data?.source === 'computed' && data.warnings.length > 0 && (
        <div
          className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-on-surface dark:text-[var(--text-primary)]"
          role="status"
        >
          <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <ul className="list-disc space-y-1 pl-4">
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {errMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-on-surface dark:text-[var(--text-primary)]">
          Could not load calendar: {errMsg}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Card className="flex-1 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-9 p-0"
                onClick={() => setCursor((d) => addMonths(d, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-9 p-0"
                onClick={() => setCursor((d) => addMonths(d, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <span className="ml-2 font-headline text-lg font-semibold text-on-surface dark:text-[var(--text-primary)]">
                {format(cursor, 'MMMM yyyy')}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-primary/80" aria-hidden />
                Public holiday
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-amber-500/90 dark:bg-amber-400/90" aria-hidden />
                Cuti bersama
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-on-surface-variant">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-on-surface-variant dark:text-[var(--text-muted)] sm:text-sm">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const h = byDate.get(key);
                  const inMonth = isSameMonth(day, cursor);
                  const isToday = isSameDay(day, new Date());
                  const isSel = selected && isSameDay(day, selected);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(day)}
                      className={cn(
                        'relative flex min-h-[2.75rem] flex-col items-center justify-center rounded-lg border text-sm transition-colors sm:min-h-[3.25rem]',
                        !inMonth && 'opacity-35',
                        h?.kind === 'public' &&
                          'border-primary/30 bg-primary/15 font-medium text-primary dark:bg-primary/20',
                        h?.kind === 'cuti_bersama' &&
                          'border-amber-500/40 bg-amber-500/15 font-medium text-amber-900 dark:text-amber-100 dark:bg-amber-500/20',
                        !h && 'border-transparent bg-surface-container-high/50 dark:bg-[var(--hover-bg)]',
                        isToday && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-surface dark:ring-offset-[var(--bg-card)]',
                        isSel && 'ring-2 ring-on-surface/30 dark:ring-[var(--text-secondary)]'
                      )}
                    >
                      <span>{format(day, 'd')}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <div className="w-full shrink-0 space-y-4 lg:w-80">
          <Card className="p-4">
            <h2 className="font-headline text-sm font-semibold text-on-surface dark:text-[var(--text-primary)]">
              Selected day
            </h2>
            {selected ? (
              <div className="mt-2 text-sm text-on-surface-variant dark:text-[var(--text-secondary)]">
                <p className="font-medium text-on-surface dark:text-[var(--text-primary)]">
                  {format(selected, 'EEEE, d MMMM yyyy')}
                </p>
                {selectedHoliday ? (
                  <p className="mt-2">
                    <span
                      className={cn(
                        'mr-2 inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
                        selectedHoliday.kind === 'public'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-amber-500/25 text-amber-900 dark:text-amber-100'
                      )}
                    >
                      {selectedHoliday.kind === 'public' ? 'Public holiday' : 'Cuti bersama'}
                    </span>
                    {selectedHoliday.name}
                  </p>
                ) : (
                  <p className="mt-2">Regular day (no holiday on this calendar).</p>
                )}
                {selectedHoliday?.kind === 'public' && (
                  <p className="mt-2 text-xs leading-relaxed">
                    Mandatory paid day off. If you are required to work, holiday overtime rates apply (not covered on
                    this page—see HR policy).
                  </p>
                )}
                {selectedHoliday?.kind === 'cuti_bersama' && (
                  <p className="mt-2 text-xs leading-relaxed">
                    Not a mandatory national holiday by law. The company may treat this as a working day or grant it
                    using annual leave—check with HR.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-on-surface-variant dark:text-[var(--text-secondary)]">
                Tap a date on the calendar.
              </p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-headline text-sm font-semibold text-on-surface dark:text-[var(--text-primary)]">
              Next dates
            </h2>
            <ul className="mt-2 space-y-2 text-sm">
              {upcoming.length === 0 ? (
                <li className="text-on-surface-variant dark:text-[var(--text-secondary)]">No upcoming entries.</li>
              ) : (
                upcoming.map((h) => (
                  <li
                    key={`${h.date}-${h.kind}`}
                    className="flex justify-between gap-2 border-b border-outline-variant/40 pb-2 last:border-0 dark:border-[var(--border-color)]"
                  >
                    <span className="text-on-surface dark:text-[var(--text-primary)]">{h.name}</span>
                    <span className="shrink-0 text-on-surface-variant dark:text-[var(--text-muted)]">
                      {format(parseLocalDate(h.date), 'd MMM')}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>

      {data?.notes && data.notes.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h2 className="font-headline text-sm font-semibold text-on-surface dark:text-[var(--text-primary)]">
            Notes
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-on-surface-variant dark:text-[var(--text-secondary)]">
            {data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}
