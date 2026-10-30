import { TestBed } from '@angular/core/testing';
import { DateSelect } from './date-select';

describe('DateSelect', () => {
  function create(): { select: DateSelect; root: HTMLElement; changes: string[]; detect(): void } {
    const fixture = TestBed.createComponent(DateSelect);
    fixture.componentRef.setInput('fromYear', 1990);
    fixture.componentRef.setInput('toYear', 2026);
    const changes: string[] = [];
    fixture.componentInstance.registerOnChange(value => changes.push(value));
    fixture.detectChanges();
    return { select: fixture.componentInstance, root: fixture.nativeElement, changes, detect: () => fixture.detectChanges() };
  }

  function pick(root: HTMLElement, index: number, value: string): void {
    const select = root.querySelectorAll('select')[index]!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  it('emits an ISO date only when day, month and year are chosen', () => {
    const { root, changes, detect } = create();
    pick(root, 2, '1992'); detect();
    pick(root, 1, '04'); detect();
    pick(root, 0, '10');
    expect(changes).toEqual(['', '', '1992-04-10']);
    expect(root.querySelectorAll('select')[2]!.options[1]!.value).toBe('2026');
  });

  it('shows a written value and drops a day the month does not have', () => {
    const { select, root, changes, detect } = create();
    select.writeValue('1992-03-31'); detect();
    expect(root.querySelectorAll('select')[0]!.value).toBe('31');
    pick(root, 1, '04'); detect();
    expect(changes.at(-1)).toBe('');
    // April: the "Día" placeholder plus 30 days.
    expect(root.querySelectorAll('select')[0]!.options.length).toBe(31);
    select.setDisabledState(true); detect();
    expect(root.querySelector('select')!.disabled).toBe(true);
    select.writeValue(null);
  });
});
