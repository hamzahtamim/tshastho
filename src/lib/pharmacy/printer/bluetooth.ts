// Web Bluetooth connector for ESC/POS thermal printers
// Item 12 — Tshastho Pharmacy
//
// Bangladesh-এ common printers (Xprinter, Epson, Rongta, TVS) সাধারণত
// Serial-over-BLE সাপোর্ট করে। এখানে আমরা well-known service UUID ব্যবহার করছি।

import type { BluetoothPrinterDevice, PrinterConnectionType } from './types';

// Common ESC/POS BLE service UUIDs
export const BT_SERVICES: BluetoothServiceUUID[] = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic serial
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Some ESC/POS printers
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip transparent UART
];

export type WebBluetoothLike = {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  getDevices?(): Promise<BluetoothDevice[]>;
};

function getBT(): WebBluetoothLike {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const bt = (nav as any as { bluetooth?: WebBluetoothLike })?.bluetooth;
  if (!bt) throw new Error('Web Bluetooth not supported in this browser. Use Chrome/Edge on HTTPS.');
  return bt;
}

export function isBluetoothSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !!(navigator as any as { bluetooth?: any }).bluetooth;
}

/**
 * Prompt user to select a Bluetooth printer.
 */
export async function requestPrinterDevice(): Promise<BluetoothDevice> {
  const bt = getBT();
  return bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: BT_SERVICES,
  });
}

/**
 * Find a writable characteristic on the device.
 */
async function findWritableCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<{ char: BluetoothRemoteGATTCharacteristic; service: BluetoothRemoteGATTService }> {
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    try {
      const chars = await svc.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          return { char: c, service: svc };
        }
      }
    } catch {
      // Some services throw — skip
    }
  }
  throw new Error('No writable characteristic found on this device.');
}

export type ConnectedPrinter = {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
  disconnect: () => Promise<void>;
  write: (bytes: Uint8Array) => Promise<void>;
};

/**
 * Connect to a printer and get write() helper.
 */
export async function connectPrinter(device: BluetoothDevice): Promise<ConnectedPrinter> {
  if (!device.gatt) throw new Error('Device has no GATT server.');
  const server = await device.gatt.connect();
  const { char } = await findWritableCharacteristic(server);

  const write = async (bytes: Uint8Array) => {
    // Chunked write — BLE MTU is typically 20-512 bytes
    const CHUNK = 180;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.slice(i, i + CHUNK);
      if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(slice);
      } else {
        await char.writeValue(slice);
      }
      // Small delay to avoid overflowing printer buffer
      await new Promise((r) => setTimeout(r, 15));
    }
  };

  return {
    device,
    characteristic: char,
    write,
    disconnect: async () => {
      try { device.gatt?.disconnect(); } catch { /* noop */ }
    },
  };
}

/**
 * List already-paired devices (Chrome only).
 */
export async function getPairedDevices(): Promise<BluetoothPrinterDevice[]> {
  if (!isBluetoothSupported()) return [];
  try {
    const bt = getBT();
    if (!bt.getDevices) return [];
    const devices = await bt.getDevices();
    return devices
      .filter((d) => !!d.name)
      .map((d) => ({ id: d.id, name: d.name ?? 'Unknown', connected: !!d.gatt?.connected }));
  } catch {
    return [];
  }
}

export function connectionTypeLabel(t: PrinterConnectionType): string {
  switch (t) {
    case 'bluetooth': return 'Bluetooth';
    case 'usb':       return 'USB';
    case 'network':   return 'Network';
    case 'browser':   return 'Browser Print';
  }
}
