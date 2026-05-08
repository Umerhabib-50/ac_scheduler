import {NativeModules, Platform} from 'react-native';
import {GREE_FREQUENCY} from '../../constants/ir';
import {FanSpeed, AcMode} from '../../types/schedule';
import {encodeGreeOn, encodeGreeOff} from './greeEncoder';

const {IrBlasterModule} = NativeModules;

export function isIrSupported(): boolean {
  if (Platform.OS !== 'android') return false;
  return IrBlasterModule?.hasIrEmitter() ?? false;
}

function decodeBytes(pulses: number[]): string {
  const bytes = new Array<number>(8).fill(0);
  let pos = 2; // skip header mark+space
  for (let b = 0; b < 4; b++) {
    for (let bit = 0; bit < 8; bit++) {
      pos++; // skip mark
      if (pulses[pos++] > 1000) bytes[b] |= 1 << bit;
    }
  }
  pos += 8; // skip footer (3 bit pairs + standalone mark+gap)
  for (let b = 4; b < 8; b++) {
    for (let bit = 0; bit < 8; bit++) {
      pos++; // skip mark
      if (pulses[pos++] > 1000) bytes[b] |= 1 << bit;
    }
  }
  return bytes.map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(', ');
}

async function send(pattern: number[]): Promise<void> {
  if (!IrBlasterModule) throw new Error('IrBlasterModule not available');
  console.log('[IR] pulse count:', pattern.length);
  console.log('[IR] bytes:', decodeBytes(pattern));
  await IrBlasterModule.sendCommand(GREE_FREQUENCY, pattern);
}

export async function sendAcOn(
  temp: number,
  fanSpeed: FanSpeed,
  mode: AcMode = 'cool',
): Promise<void> {
  await send(encodeGreeOn(temp, fanSpeed, mode));
}

export async function sendAcOff(temp = 25, fanSpeed: FanSpeed = 'auto'): Promise<void> {
  await send(encodeGreeOff(temp, fanSpeed));
}

export async function sendRawDebug(pulses: number[]): Promise<void> {
  if (!IrBlasterModule) throw new Error('IrBlasterModule not available');
  console.log('[IR][RAW] pulse count:', pulses.length);
  await IrBlasterModule.sendCommand(GREE_FREQUENCY, pulses);
}
