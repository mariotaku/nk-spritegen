#!/usr/bin/env node

import fs from 'fs';
import { Bin, IOption, MaxRectsPacker, Rectangle } from 'maxrects-packer';
import path from 'path';
import sharp, { OutputInfo, OverlayOptions } from 'sharp';
import { promisify } from 'util';
import yargs from 'yargs';
const { hideBin } = require('yargs/helpers');

const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);

interface SpriteItem {
    file: string;
    name: string;
    width: number;
    height: number;
}

let packer = new MaxRectsPacker(1024, 1024, 0, <IOption>{
    allowRotation: false
});
let opts = yargs(hideBin(process.argv))
    .option('name', { alias: 'n', type: 'string', description: 'Name for generated spritesheets and header', required: true })
    .option('input', { alias: 'i', type: 'string', description: 'Input directory for sprites', required: true })
    .option('output', { alias: 'o', type: 'string', description: 'Output directory for generated spritesheets (and header if not set)', required: true })
    .option('header', { alias: 'c', type: 'string', description: 'Output directory for generated header' })
    .option('scale', { alias: 's', type: 'array', description: 'Scale factor for original image', default: [1] })
    .argv;

function genSprite(bin: Bin<Rectangle>, name: string, scale: number = 1): Promise<OutputInfo> {
    return sharp({
        create: {
            width: bin.width * scale,
            height: bin.height * scale,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    }).composite(bin.rects.map(rect => {
        return <OverlayOptions>{
            input: rect.data.file,
            blend: 'add',
            left: rect.x * scale,
            top: rect.y * scale,
            density: 72 * scale
        };
    })).png().toFile(path.join(opts.output, `spritesheet_${name}@${scale}x.png`));
}

function genHeader(bin: Bin<Rectangle>, sheetname: string, scale: number[]): Promise<any> {
    var source = '#pragma once\n\n';

    source += '#ifndef NK_NUKLEAR_H_\n';
    source += '#include "nuklear.h"\n';
    source += '#endif\n';

    source += '\n\n';

    // Write struct for spritesheet
    source += `struct nk_spritesheet_${sheetname} {\n`;
    bin.rects.forEach(rect => {
        source += `    struct nk_image ${rect.data.name};\n`;
    });
    source += '};\n\n';

    for (const s of scale) {
        source += `void nk_spritesheet_init_${sheetname}_${s}x(struct nk_image sprites, struct nk_spritesheet_${sheetname} *sheet);\n`;
    }
    source += '\n\n';

    source += '#ifdef NK_IMPLEMENTATION\n\n';

    for (const s of scale) {
        source += `void nk_spritesheet_init_${sheetname}_${s}x(struct nk_image sprites, struct nk_spritesheet_${sheetname} *sheet)\n`;
        source += '{\n';
        bin.rects.forEach(rect => {
            source += `    sheet->${rect.data.name} = nk_subimage_handle(sprites.handle, ${bin.width * s}, ${bin.height * s}, nk_rect(${rect.x * s}, ${rect.y * s}, ${rect.width * s}, ${rect.height * s}));\n`;
        });
        source += '}\n\n';
    }

    source += '#endif\n';

    return writeFile(path.join(opts.header ?? opts.output, `spritesheet_${sheetname}.h`), source);
}

readdir(opts.input).then(async files => {
    return Promise.all(files.map(async file => {
        let meta = await sharp(path.join(opts.input, file)).metadata();
        if (!meta.width || !meta.height) return null;
        return <SpriteItem>{
            file: path.join(opts.input, file),
            name: path.parse(file).name,
            width: meta.width,
            height: meta.height
        };
    }));
}).then((data) => {
    return data.filter((item): item is SpriteItem => item !== null)
}).then(data => {
    data.forEach(item => {
        packer.add(item.width, item.height, { file: item.file, name: item.name });
    });
    return packer.bins[0];
}).then(bin => {
    return Promise.all([...opts.scale.map(scale => genSprite(bin, opts.name, scale)), genHeader(bin, opts.name, opts.scale)]);
}).then(info => {
    console.log(info);
}).catch(reason => {
    console.log(reason);
});