import {FanSpeed, AcMode, AcOnParams, SwingVPosition, SwingHPosition, DisplayTemp} from '../../types/schedule';
import {
  GREE_HDR_MARK,
  GREE_HDR_SPACE,
  GREE_BIT_MARK,
  GREE_ONE_SPACE,
  GREE_ZERO_SPACE,
  GREE_MSG_SPACE,
} from '../../constants/ir';

// Gree YAP0F protocol — 64-bit frame (2 x 32-bit blocks) with Kelvinator block checksum

const MODE_MAP: Record<AcMode, number> = {
  auto: 0,
  cool: 1,
  dry: 2,
  fan: 3,
  heat: 4,
};

const DISPLAY_TEMP_MAP: Record<DisplayTemp, number> = {
  set: 0x01,
  indoor: 0x02,
  outdoor: 0x03,
};

// Source: IRremoteESP8266/ir_Gree.cpp
const SWING_V_MAP: Record<SwingVPosition, number> = {
  off: 0, auto: 1, up: 2, midUp: 3, middle: 4, midDown: 5, down: 6,
};

const SWING_H_MAP: Record<SwingHPosition, number> = {
  off: 0, auto: 1, fullLeft: 2, left: 3, center: 4, right: 5, fullRight: 6,
};

// Gree protocol supports 2-bit fan (bits 4-5 of byte 0), values 0-3.
// Bars 4-5 map to protocol max (3) until 3-bit support is confirmed on device.
const FAN_MAP: Record<FanSpeed, number> = {
  auto: 0,
  low: 1,
  medLow: 2,
  medium: 3,
  medHigh: 3,
  high: 3,
};

// kKelvinatorChecksumStart = 10 (from IRremoteESP8266/ir_Kelvinator.cpp)
function calcChecksum(bytes: number[]): number {
  let sum = 10;
  for (let i = 0; i < 4; i++) sum += bytes[i] & 0x0f;
  for (let i = 4; i < 7; i++) sum += bytes[i] >> 4;
  return sum & 0x0f;
}

function buildBytes(power: boolean, params: Omit<AcOnParams, 'temp'> & {temp: number}): number[] {
  const {
    temp, fanSpeed, mode,
    turbo = false, sleep = false,
    swingH = 'off' as SwingHPosition, swingV = 'off' as SwingVPosition,
    xFan = false, light = true, displayTemp = 'set' as DisplayTemp,
    healthy = false, scavenging = false,
  } = params;

  const bytes = new Array<number>(8).fill(0);

  // Byte 0: mode(2:0) | power(3) | fan(5:4) | sleep(7)
  bytes[0] =
    (MODE_MAP[mode] & 0x07) |
    (power ? 0x08 : 0x00) |
    ((FAN_MAP[turbo ? 'high' : fanSpeed] & 0x03) << 4) |
    (sleep ? 0x80 : 0x00);

  // Byte 1: temp - 16 in bits(3:0)
  bytes[1] = (temp - 16) & 0x0f;

  // Byte 2: scavenging(2) | healthy(3) | turbo(4) | light(5) | modelA(6) | xFan(7)
  // Source: IRremoteESP8266/ir_Gree.cpp — turbo=bit4, light=bit5, modelA=bit6, xFan=bit7
  bytes[2] =
    (scavenging ? 0x04 : 0x00) |
    (healthy ? 0x08 : 0x00) |
    (turbo ? 0x10 : 0x00) |
    (light ? 0x20 : 0x00) |
    0x40 |
    (xFan ? 0x80 : 0x00);

  // Byte 3: fixed per Gree spec
  bytes[3] = 0x50;

  // Byte 4: swingV(3:0) | swingH(6:4)
  bytes[4] =
    (SWING_V_MAP[swingV ?? 'off'] & 0x0F) |
    ((SWING_H_MAP[swingH ?? 'off'] & 0x07) << 4);

  // Byte 5: unknown2(5) | displayTemp(1:0)
  bytes[5] = 0x20 | DISPLAY_TEMP_MAP[displayTemp];

  // Byte 6: unused
  bytes[6] = 0x00;

  // Byte 7: Kelvinator block checksum in high nibble
  bytes[7] = calcChecksum(bytes) << 4;

  return bytes;
}

function encodeBytes(bytes: number[]): number[] {
  const pulses: number[] = [];

  pulses.push(GREE_HDR_MARK, GREE_HDR_SPACE);

  for (let b = 0; b < 4; b++) {
    for (let bit = 0; bit < 8; bit++) {
      pulses.push(GREE_BIT_MARK);
      pulses.push(bytes[b] & (1 << bit) ? GREE_ONE_SPACE : GREE_ZERO_SPACE);
    }
  }

  // Inter-group footer: kGreeBlockFooter = 0b010 (LSB-first) + standalone mark + gap
  pulses.push(GREE_BIT_MARK, GREE_ZERO_SPACE);
  pulses.push(GREE_BIT_MARK, GREE_ONE_SPACE);
  pulses.push(GREE_BIT_MARK, GREE_ZERO_SPACE);
  pulses.push(GREE_BIT_MARK, GREE_MSG_SPACE);

  for (let b = 4; b < 8; b++) {
    for (let bit = 0; bit < 8; bit++) {
      pulses.push(GREE_BIT_MARK);
      pulses.push(bytes[b] & (1 << bit) ? GREE_ONE_SPACE : GREE_ZERO_SPACE);
    }
  }

  pulses.push(GREE_BIT_MARK);

  return pulses;
}

export function encodeGreeOn(params: AcOnParams): number[] {
  return encodeBytes(buildBytes(true, params));
}

export function encodeGreeOff(temp = 25, fanSpeed: FanSpeed = 'auto'): number[] {
  return encodeBytes(buildBytes(false, {temp, fanSpeed, mode: 'cool'}));
}

// Debug only — encode arbitrary bytes with our timing constants
export function encodeRawGreeBytes(bytes: number[]): number[] {
  return encodeBytes(bytes);
}
