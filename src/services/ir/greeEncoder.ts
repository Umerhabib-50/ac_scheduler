import {FanSpeed, AcMode} from '../../types/schedule';
import {
  GREE_HDR_MARK,
  GREE_HDR_SPACE,
  GREE_BIT_MARK,
  GREE_ONE_SPACE,
  GREE_ZERO_SPACE,
  GREE_MSG_SPACE,
} from '../../constants/ir';

// Gree YAP0F protocol — 64-bit frame (2 x 32-bit blocks) with Kelvinator block checksum

const MODE_COOL = 1;

const FAN_MAP: Record<FanSpeed, number> = {
  auto: 0,
  low: 1,
  medium: 2,
  high: 3,
};

// kKelvinatorChecksumStart = 10 (from IRremoteESP8266/ir_Kelvinator.cpp)
function calcChecksum(bytes: number[]): number {
  let sum = 10;
  for (let i = 0; i < 4; i++) sum += bytes[i] & 0x0f;
  for (let i = 4; i < 7; i++) sum += bytes[i] >> 4;
  return sum & 0x0f;
}

function buildBytes(power: boolean, temp: number, fanSpeed: FanSpeed): number[] {
  const bytes = new Array<number>(8).fill(0);

  // Byte 0: mode(2:0) | power(3) | fan(5:4) | swingAuto(6) | sleep(7)
  bytes[0] =
    (MODE_COOL & 0x07) |
    (power ? 0x08 : 0x00) |
    ((FAN_MAP[fanSpeed] & 0x03) << 4);

  // Byte 1: temp - 16 in bits(3:0)
  bytes[1] = (temp - 16) & 0x0f;

  // Byte 2: Light (0x20) + ModelA bit (0x40) — AC responds to YAW1F-family commands
  bytes[2] = 0x60;

  // Byte 3: bits 4-7 = 0b0101 (fixed per Gree spec)
  bytes[3] = 0x50;

  // Byte 4: SwingV(3:0) | SwingH(6:4) — default 0 (no swing)
  bytes[4] = 0x00;

  // Byte 5: unknown2=0b100 (bit5) | DisplayTemp=Set (bits1:0=0b01) — AC rejects DisplayTemp=Off
  bytes[5] = 0x21;

  // Byte 6: unused
  bytes[6] = 0x00;

  // Byte 7: Kelvinator block checksum in high nibble
  bytes[7] = calcChecksum(bytes) << 4;

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

  // Inter-group footer: kGreeBlockFooter = 0b010 (LSB-first: 0,1,0) + standalone mark + gap
  pulses.push(GREE_BIT_MARK, GREE_ZERO_SPACE); // bit0 = 0
  pulses.push(GREE_BIT_MARK, GREE_ONE_SPACE);  // bit1 = 1
  pulses.push(GREE_BIT_MARK, GREE_ZERO_SPACE); // bit2 = 0
  pulses.push(GREE_BIT_MARK, GREE_MSG_SPACE);  // standalone mark + inter-block gap

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

export function encodeGreeOff(temp = 25, fanSpeed: FanSpeed = 'auto'): number[] {
  return encodeBytes(buildBytes(false, temp, fanSpeed));
}

// Debug only — encode arbitrary bytes with our timing constants
export function encodeRawGreeBytes(bytes: number[]): number[] {
  return encodeBytes(bytes);
}
