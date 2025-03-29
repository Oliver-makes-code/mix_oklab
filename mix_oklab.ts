import { CLI, named, optional, Builtin } from "https://oliver-makes-code.github.io/ts-cli/mod.tsx";

type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];

function mat3MultiplyVec3(mat: Mat3, vec: Vec3): Vec3 {
    return [
        mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2],
        mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2],
        mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2]
    ];
}

function mix(a: Vec3, b: Vec3, h: number): Vec3 {
    return [
        a[0] * (1 - h) + b[0] * h,
        a[1] * (1 - h) + b[1] * h,
        a[2] * (1 - h) + b[2] * h
    ];
}

function powVec3(vec: Vec3, exp: number): Vec3 {
    return [
        Math.pow(vec[0], exp),
        Math.pow(vec[1], exp),
        Math.pow(vec[2], exp)
    ];
}

const kCONEtoLMS: Mat3 = [
    [0.4121656120,  0.2118591070,  0.0883097947],
    [0.5362752080,  0.6807189584,  0.2818474174],
    [0.0514575653,  0.1074065790,  0.6302613616]
];

const kLMStoCONE: Mat3 = [
    [ 4.0767245293, -1.2681437731, -0.0041119885],
    [-3.3072168827,  2.6093323231, -0.7034763098],
    [ 0.2307590544, -0.3411344290,  1.7068625689]
];

function oklabMix(colA: Vec3, colB: Vec3, h: number): Vec3 {
    const lmsA = powVec3(mat3MultiplyVec3(kCONEtoLMS, colA), 1.0 / 3.0);
    const lmsB = powVec3(mat3MultiplyVec3(kCONEtoLMS, colB), 1.0 / 3.0);

    const lms = mix(lmsA, lmsB, h);

    return mat3MultiplyVec3(kLMStoCONE, [
        lms[0] * lms[0] * lms[0],
        lms[1] * lms[1] * lms[1],
        lms[2] * lms[2] * lms[2]
    ]);
}

function linearRGBtoHex(rgb: Vec3): number {
    let r = rgb[0];
    let g = rgb[1];
    let b = rgb[2];

    r = r <= 0.0031308 ? (r * 12.92) : (1.055 * Math.pow(r, 1 / 2.4) - 0.055);
    g = g <= 0.0031308 ? (g * 12.92) : (1.055 * Math.pow(g, 1 / 2.4) - 0.055);
    b = b <= 0.0031308 ? (b * 12.92) : (1.055 * Math.pow(b, 1 / 2.4) - 0.055);

    r = (r * 255 + 0.5) | 0;
    g = (g * 255 + 0.5) | 0;
    b = (b * 255 + 0.5) | 0;

    return (r << 16) | (g << 8) | b;
}

function hexToLinearRGB(hex: number): Vec3 {
    let r = (hex >> 16) & 0xFF;
    let g = (hex >> 8) & 0xFF;
    let b = hex & 0xFF;

    r /= 255;
    g /= 255;
    b /= 255;

    r = r <= 0.04045 ? (r / 12.92) : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.04045 ? (g / 12.92) : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.04045 ? (b / 12.92) : Math.pow((b + 0.055) / 1.055, 2.4);

    return [r, g, b];
}

function hexToString(hex: number): string {
    const r = (hex >> 16) & 0xFF;
    const g = (hex >> 8) & 0xFF;
    const b = hex & 0xFF;

    return "#" +
        ((r < 16 ? "0" : "") + r.toString(16)) +
        ((g < 16 ? "0" : "") + g.toString(16)) +
        ((b < 16 ? "0" : "") + b.toString(16));
}

function stringToHex(hexStr: string): number {
    if (!/^#?[0-9A-Fa-f]{6}$/.test(hexStr))
        throw new Error("Invalid hex color format.");

    if (hexStr[0] === "#")
        hexStr = hexStr.slice(1);

    return parseInt(hexStr, 16);
}

const cli = new CLI();

cli.register({
    args: [named(Builtin.STRING, "Start"), named(Builtin.STRING, "End"), named(optional(Builtin.NUMBER), "Midpoints")],
    call(start: string, end: string, midpoints?: number) {
        const Start = hexToLinearRGB(stringToHex(start));
        const End = hexToLinearRGB(stringToHex(end));
        midpoints = midpoints ?? 1;

        console.log("Start: " + start);
        console.log("End: " + end);
        console.log("Midpoints: " + midpoints);

        midpoints += 1;
        for (let i = 0; i <= midpoints; i++) {
            const color = oklabMix(Start, End, i / midpoints);

            const hexColor = linearRGBtoHex(color);
            const hexString = hexToString(hexColor);

            const r = (hexColor >> 16) & 0xFF;
            const g = (hexColor >> 8) & 0xFF;
            const b = hexColor & 0xFF;

            const ansiBlock = `\x1b[48;2;${r};${g};${b}m    \x1b[0m`;

            console.log(`${ansiBlock} ${hexString}`);
        }
    },
    description: "Blends hex colors, converting to and from the OKLAB color space to blend the colors."
});

cli.execute();
