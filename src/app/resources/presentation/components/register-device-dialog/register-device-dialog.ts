import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { ResourcesStore } from '../../../application/resources.store';
import { AssetKind, CHANNEL_LABELS, channelMacs, EDGE_TYPES, isEdgeKind, isValidMac, KIND_LABELS } from '../../../domain/device.entity';

/** "Registrar dispositivo": adds an edge (MAC), a microphone (alias and MAC) or an actuator module (alias and the
 * ESP32's MAC base, from which its four servo devices are registered) to the inventory of the business. */
@Component({ selector: 'app-register-device-dialog', templateUrl: './register-device-dialog.html', styleUrl: './register-device-dialog.css' })
export class RegisterDeviceDialog implements OnInit {
  private readonly store = inject(ResourcesStore);
  readonly initialKind = input<AssetKind>('MICROPHONE');
  readonly closed = output<void>();
  readonly registered = output<AssetKind>();

  protected readonly edgeKinds = EDGE_TYPES;
  protected readonly deviceKinds: AssetKind[] = ['MICROPHONE', 'ACTUATOR_MODULE'];
  protected readonly channelLabels = CHANNEL_LABELS;
  protected readonly labels = KIND_LABELS;
  protected readonly kind = signal<AssetKind>('MICROPHONE');
  protected readonly alias = signal('');
  protected readonly mac = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEdge = computed(() => isEdgeKind(this.kind()));
  protected readonly isModule = computed(() => this.kind() === 'ACTUATOR_MODULE');
  /** MACs of the four servo channels, shown so the administrator can compare them with the ESP32's serial output. */
  protected readonly channels = computed(() => this.isModule() && isValidMac(this.mac()) ? channelMacs(this.mac()) : []);
  protected readonly macInvalid = computed(() => this.mac().trim() !== '' && !isValidMac(this.mac()));
  protected readonly canSubmit = computed(() =>
    !this.saving() && isValidMac(this.mac()) && (this.isEdge() || this.alias().trim().length > 0));

  ngOnInit(): void { this.kind.set(this.initialKind()); }

  protected value(event: Event): string { return (event.target as HTMLInputElement | HTMLSelectElement).value; }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) return;
    this.saving.set(true); this.error.set(null);
    try {
      await this.store.register(this.kind(), this.alias(), this.mac());
      this.registered.emit(this.kind());
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo registrar el dispositivo.'); }
    finally { this.saving.set(false); }
  }
}
