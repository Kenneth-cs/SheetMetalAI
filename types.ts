export enum PartType {
  FLAT_PANEL = 'Flat Panel',
  L_BRACKET = 'L-Bracket',
  U_CHANNEL = 'U-Channel',
  BOX_PANEL = 'Box Panel (4 Bend)',
  UNKNOWN = 'Custom/Complex'
}

export interface Hole {
  id?: string;
  type: 'CIRCLE' | 'RECTANGLE';
  x: number; // Center X relative to the part's local origin (usually center or bottom-left)
  y: number; // Center Y
  diameter?: number; // For circles
  width?: number; // For rectangles
  height?: number; // For rectangles
  face?: 'MAIN' | 'FLANGE_LEFT' | 'FLANGE_RIGHT' | 'FLANGE_TOP' | 'FLANGE_BOTTOM';
}

export interface SheetMetalParams {
  type: PartType;
  width: number;
  height: number;
  depth: number;
  flangeLength: number; // For L/U brackets
  materialThickness: number;
  bendRadius: number;
  kFactor: number; // Default usually 0.33 or 0.5
  notes?: string;
  holes?: Hole[];
}

export interface UnfoldingResult {
  flatWidth: number;
  flatHeight: number;
  bendLines: BendLine[];
}

export interface BendLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'UP' | 'DOWN';
}

export interface FabricationAdvice {
  cuttingSteps: string[];
  bendingSequence: string[];
  technicalTips: string[];
}

export interface AIAnalysisResponse {
  identifiedType: PartType;
  confidence: number;
  reasoning: string;
  extractedParams: Partial<SheetMetalParams>;
  fabricationAdvice?: FabricationAdvice;
}
