import { PartType, SheetMetalParams } from './types';

export const DEFAULT_PARAMS: SheetMetalParams = {
  type: PartType.FLAT_PANEL,
  width: 200,
  height: 300,
  depth: 0,
  flangeLength: 20,
  materialThickness: 2.0,
  bendRadius: 2.0,
  kFactor: 0.33,
  notes: '',
};

export const PART_TYPE_OPTIONS = [
  { value: PartType.FLAT_PANEL, label: '平板 (Flat Panel)' },
  { value: PartType.L_BRACKET, label: 'L型折弯 (L-Bracket)' },
  { value: PartType.U_CHANNEL, label: 'U型槽 (U-Channel)' },
  { value: PartType.BOX_PANEL, label: '封板/盒盖 (Box Panel)' },
];
