import { CommercialShell } from './commercial-shell';

describe('CommercialShell', () => {
  it('lists the commercial sections', () => {
    const shell = new CommercialShell() as unknown as { sections: { links: unknown[] }[] };

    expect(shell.sections.flatMap(section => section.links)).toHaveLength(5);
  });
});
