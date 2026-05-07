import {FanSpeed, AcMode} from '../../types/schedule';
import {
  GREE_HDR_MARK,
  GREE_HDR_SPACE,
  GREE_BIT_MARK,
  GREE_ONE_SPACE,
  GREE_ZERO_SPACE,
  GREE_MSG_SPACE,
} from '../../constants/ir';

// Gree YAP0F protocol — encodes full AC state in 64-bit frame (2 x 32-bit groups)

const MODE_COOL = 1;

const FAN_MAP: Record<FanSpeed, number> = {
  auto: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function buildBytes(power: boolean, temp: number, fanSpeed: FanSpeed): number[] {
  const bytes = new Array<number>(8).fill(0);

  // Byte 0: mode(2:0) | power(3) | fan(5:4) | swingAuto(6) | sleep(7)
  bytes[0] =
    (MODE_COOL & 0x07) |
    (power ? 0x08 : 0x00) |
    ((FAN_MAP[fanSpeed] & 0x03) << 4);

  // Byte 1: temp - 16 in bits(3:0)
  bytes[1] = (temp - 16) & 0x0f;

  // Byte 2: 0x00
  bytes[2] = 0x00;

  // Byte 3: fixed 0x50 (bits 6:4 = 101) per Gree spec
  bytes[3] = 0x50;

  // Bytes 4–7: second group — complement pattern
  bytes[4] = ((bytes[0] & 0xf0) ^ 0xf0) | (bytes[0] & 0x0f);
  bytes[5] = bytes[1] ^ 0xff;
  bytes[6] = 0x00;
  bytes[7] = bytes[3] ^ 0xff;

  return bytes;
}

function encodeBytes(bytes: number[]): number[] {
  const pulses: number[] = [];

  // Header
  pulses.push(GREE_HDR_MARK, GREE_HDR_SPACE);

  // First 32 bits (bytes 0–3)
  for (let b = 0; b < 4; b++) {
    for (let bit = 0; bit < 8; bit++) {
      pulses.push(GREE_BIT_MARK);
      pulses.push(bytes[b] & (1 << bit) ? GREE_ONE_SPACE : GREE_ZERO_SPACE);
    }
  }

  // Inter-group gap: 3-bit footer marker then long space
  pulses.push(GREE_BIT_MARK, GREE_ONE_SPACE);
  pulses.push(GREE_BIT_MARK, GREE_ZERO_SPACE);
  pulses.push(GREE_BIT_MARK, GREE_MSG_SPACE);

  // Second 32 bits (bytes 4–7)
  for (let b = 4; b < 8; b++) {
    for (let bit = 0; bit < 8; bit++) {
      pulses.push(GREE_BIT_MARK);
      pulses.push(bytes[b] & (1 << bit) ? GREE_ONE_SPACE : GREE_ZERO_SPACE);
    }
  }

  // Final mark
  pulses.push(GREE_BIT_MARK);

  return pulses;
}

export function encodeGreeOn(
  temp: number,
  fanSpeed: FanSpeed,
  _mode: AcMode = 'cool',
): number[] {
  return encodeBytes(buildBytes(true, temp, fanSpeed));
}

export function encodeGreeOff(): number[] {
  // Power off: send last state with power=false (cool, 25°C, auto fan)
  return encodeBytes(buildBytes(false, 25, 'auto'));
}
