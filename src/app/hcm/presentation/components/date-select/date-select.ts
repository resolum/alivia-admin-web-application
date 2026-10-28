import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Day, month and year pickers that read and write an ISO date ("1992-04-10"), or "" while incomplete. */
@Component({
  selector: 'app-date-select', templateUrl: './date-select.html', styleUrl: './date-select.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateSelect), multi: true }],
})
export class DateSelect implements ControlValueAccessor {
  readonly label = input('Fecha');
  readonly fromYear = input(new Date().getFullYear() - 100);
  readonly toYear = input(new Date().getFullYear());
  protected readonly months = MONTHS;
  protected readonly day = signal(''); protected readonly month = signal(''); protected readonly year = signal('');
  protected readonly disabled = signal(false);
  protected readonly years = computed(() => Array.from({ length: this.toYear() - this.fromYear() + 1 }, (_, index) => String(this.toYear() - index)));
  protected readonly days = computed(() => {
    const total = new Date(Number(this.year()) || 2000, Number(this.month()) || 1, 0).getDate();
    return Array.from({ length: total }, (_, index) => String(index + 1).padStart(2, '0'));
  });
  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    const [year = '', month = '', day = ''] = (value ?? '').split('-');
    this.year.set(year); this.month.set(month); this.day.set(day);
  }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled.set(disabled); }

  protected set(part: 'day' | 'month' | 'year', event: Event): void {
    this[part].set((event.target as HTMLSelectElement).value);
    // A day that does not exist in the new month (31 in April) is cleared.
    if (Number(this.day()) > this.days().length) this.day.set('');
    const complete = this.day() && this.month() && this.year();
    this.onChange(complete ? `${this.year()}-${this.month()}-${this.day()}` : '');
  }
}
