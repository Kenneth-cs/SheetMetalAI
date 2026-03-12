import { SheetMetalParams, PartType, UnfoldingResult } from '../types';

/**
 * Simplified Bend Deduction calculation.
 * BD = 2 * (BendAllowance + Setback) - simplified for visualization.
 * We will use a standard approximation: Flat Length = Leg1 + Leg2 - BendDeduction
 * For visualization, we mostly care about the overall flat boundaries.
 */
const calculateBendDeduction = (thickness: number, radius: number, k: number): number => {
    // Simple DIN 6935 formula approximation for 90 deg
    // BA = (pi/2) * (radius + k * thickness)
    // OSS (Outside Setback) = radius + thickness
    // BD = 2 * OSS - BA
    const oss = radius + thickness;
    const ba = (Math.PI / 2) * (radius + k * thickness);
    return (2 * oss) - ba;
};

export const calculateFlatPattern = (params: SheetMetalParams): UnfoldingResult => {
    const { type, width, height, depth, flangeLength, materialThickness, bendRadius, kFactor } = params;
    const bd = calculateBendDeduction(materialThickness, bendRadius, kFactor);

    let flatWidth = width;
    let flatHeight = height;
    const bendLines: any[] = [];

    switch (type) {
        case PartType.FLAT_PANEL:
            // No bends
            break;

        case PartType.L_BRACKET:
            // Width is the length of the bracket.
            // Height is Leg A, Flange is Leg B.
            // Flat Height = Height + Flange - BD
            flatHeight = height + flangeLength - bd;
            
            // Bend line position relative to top
            // Distance from top edge = Height - OSS + (BA/2) ... simplified:
            // Visually, let's put it at 'height - (bd/2)' approx for the drawing
            bendLines.push({
                x1: 0, y1: height - (bd/2),
                x2: width, y2: height - (bd/2),
                type: 'UP'
            });
            break;

        case PartType.U_CHANNEL:
            // Width is fixed length.
            // Profile is Depth (leg1) - Width (base) - Depth (leg2) ... wait, standard U channel is usually defined as Base Width + 2 Flanges
            // Let's assume 'width' is the base, 'height' is length, 'depth' is flange height.
            // Actually usually: Width (base), Flange (depth).
            
            // Let's interpret params:
            // Width = Base width
            // Height = Length of channel
            // Depth = Height of the two legs (flanges)
            
            flatWidth = width + (2 * depth) - (2 * bd);
            // Bend lines run along the Height
            
            const flangeFlat = depth - (bd/2); // approximate for vis
            
            bendLines.push({
                x1: flangeFlat, y1: 0,
                x2: flangeFlat, y2: height,
                type: 'UP'
            });
            bendLines.push({
                x1: flatWidth - flangeFlat, y1: 0,
                x2: flatWidth - flangeFlat, y2: height,
                type: 'UP'
            });
            break;

        case PartType.BOX_PANEL:
            // Base W x H. 
            // 4 Flanges of height 'depth'.
            flatWidth = width + (2 * depth) - (2 * bd);
            flatHeight = height + (2 * depth) - (2 * bd);
            
            const dFlat = depth - (bd/2);

            // Left Bend
            bendLines.push({ x1: dFlat, y1: dFlat, x2: dFlat, y2: flatHeight - dFlat, type: 'UP' });
            // Right Bend
            bendLines.push({ x1: flatWidth - dFlat, y1: dFlat, x2: flatWidth - dFlat, y2: flatHeight - dFlat, type: 'UP' });
            // Top Bend
            bendLines.push({ x1: dFlat, y1: dFlat, x2: flatWidth - dFlat, y2: dFlat, type: 'UP' });
            // Bottom Bend
            bendLines.push({ x1: dFlat, y1: flatHeight - dFlat, x2: flatWidth - dFlat, y2: flatHeight - dFlat, type: 'UP' });
            break;
    }

    return { flatWidth, flatHeight, bendLines };
};
