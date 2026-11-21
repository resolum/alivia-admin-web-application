import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { limaToday } from '../../../../operations/domain/technical-order.entity';
import {
  activityTypeLabel, AgendaItem, CareNotification, CareShift, isReminder, mergeAgenda, priorityLabel, reminderOf, statusText, timeRange, upcoming,
} from '../../../domain/care.entity';
import { AssistanceApi } from '../../../infrastructure/assistance.api';

const addDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
const mondayOf = (date: string) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const REFRESH_MS = 60_000;

/** The caregiver's week of shifts and activities, with the reminders due soon and the alerts apart (US-36). */
@Component({ selector: 'app-care-agenda', templateUrl: './care-agenda.html', styleUrl: './care-agenda.css' })
export class CareAgenda implements OnInit {
  private readonly api = inject(AssistanceApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activities = signal<AgendaItem[]>([]);
  private readonly shifts = signal<CareShift[]>([]);
  /** Null until read; a caregiver sees only these shifts, a relative (empty list) sees all. */
  private myCaregiverIds: number[] | null = null;
  protected readonly shiftsError = signal<string | null>(null);
  protected readonly notifications = signal<CareNotification[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  protected readonly mode = signal<'list' | 'calendar'>('list');
  protected readonly monday = signal(mondayOf(limaToday()));
  protected readonly now = signal(new Date());
  protected readonly today = limaToday();
  protected readonly typeLabel = activityTypeLabel;
  protected readonly priorityLabel = priorityLabel;
  protected readonly statusText = statusText;
  protected readonly reminderOf = reminderOf;
  protected readonly time = timeRange;
  /** Shift states depend on the clock, so the merge follows `now`. */
  protected readonly items = computed(() => mergeAgenda(this.activities(), this.shifts(), this.myCaregiverIds ?? [], this.now()));

  protected readonly days = computed(() => {
    const format = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(this.monday(), index);
      return { date, label: format.format(new Date(`${date}T00:00:00Z`)), isToday: date === this.today, items: this.items().filter(item => item.date === date) };
    });
  });

  protected readonly range = computed(() => {
    const format = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return `${format.format(new Date(`${this.monday()}T00:00:00Z`))} – ${format.format(new Date(`${addDays(this.monday(), 6)}T00:00:00Z`))}`;
  });

  /** Offline nothing is announced; once back, only reminders still ahead of their start show up. */
  protected readonly dueSoon = computed(() => this.online() ? upcoming(this.items(), this.now()) : []);
  protected readonly reminders = computed(() => this.notifications().filter(item => isReminder(item) && item.status === 'UNREAD'));
  protected readonly alerts = computed(() => this.notifications().filter(item => !isReminder(item) && item.status === 'UNREAD'));

  ngOnInit(): void {
    void this.load();
    // Polling keeps the agenda current after a reassignment made by someone else.
    const timer = setInterval(() => { this.now.set(new Date()); void this.load(true); }, REFRESH_MS);
    const goOnline = () => { this.online.set(true); void this.load(true); };
    const goOffline = () => this.online.set(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    this.destroyRef.onDestroy(() => { clearInterval(timer); window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); });
  }

  protected async load(quiet = false): Promise<void> {
    if (!this.online()) return;
    if (!quiet) { this.loading.set(true); this.error.set(null); }
    try {
      const [activities, notifications] = await Promise.all([
        this.api.agenda(this.monday(), addDays(this.monday(), 6)),
        this.api.notifications().catch(() => this.notifications()),
        this.loadShifts(),
      ]);
      this.activities.set(activities);
      this.notifications.set(notifications);
      this.error.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo consultar tu agenda.');
    } finally { this.loading.set(false); }
  }

  /** Shifts come from another endpoint; if it fails the activities still show, with a notice. */
  private async loadShifts(): Promise<void> {
    try {
      this.myCaregiverIds ??= await this.api.myCaregiverIds();
      this.shifts.set(await this.api.shifts(this.monday(), addDays(this.monday(), 6)));
      this.shiftsError.set(null);
    } catch (error) {
      this.shifts.set([]);
      this.shiftsError.set(`No se pudieron cargar los turnos. ${error instanceof Error ? error.message : ''}`.trim());
    }
  }

  protected move(weeks: number): void { this.monday.set(addDays(this.monday(), weeks * 7)); void this.load(); }
  protected goToday(): void { this.monday.set(mondayOf(this.today)); void this.load(); }
  protected person(item: AgendaItem): string { return item.assistedPerson?.name ?? 'Persona asistida'; }
  protected responsible(item: AgendaItem): string { return item.responsible?.name ?? (item.responsible?.type === 'RELATIVE' ? 'Familiar' : 'Sin asignar'); }
  protected css(value: string): string { return value.toLowerCase().replace('_', '-'); }
}
