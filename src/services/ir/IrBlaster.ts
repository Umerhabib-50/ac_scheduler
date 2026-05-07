import {NativeModules, Platform} from 'react-native';
import {GREE_FREQUENCY} from '../../constants/ir';
import {FanSpeed, AcMode} from '../../types/schedule';
import {encodeGreeOn, encodeGreeOff} from './greeEncoder';

const {IrBlasterModule} = NativeModules;

export function isIrSupported(): boolean {
  if (Platform.OS !== 'android') return false;
  return IrBlasterModule?.hasIrEmitter() ?? false;
}

async function send(pattern: number[]): Promise<void> {
  if (!IrBlasterModule) throw new Error('IrBlasterModule not available');
  await IrBlasterModule.sendCommand(GREE_FREQUENCY, pattern);
}

export async function sendAcOn(
  temp: number,
  fanSpeed: FanSpeed,
  mode: AcMode = 'cool',
): Promise<void> {
  await send(encodeGreeOn(temp, fanSpeed, mode));
}

export async function sendAcOff(): Promise<void> {
  await send(encodeGreeOff());
}
