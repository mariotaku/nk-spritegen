# nk-spritegen ![npm](https://img.shields.io/npm/v/nk-spritegen)

This is a spritesheet generator for [Nuklear](https://github.com/Immediate-Mode-UI/Nuklear).
It generates spritesheet image from SVG images (more formats will follow) with desired density,
and header for referencing each sprite as sub-image.

## Install

`npm install -g nk-spritegen`

## Usage

```
      --help     Show help                                             [boolean]
      --version  Show version number                                   [boolean]
  -n, --name     Name for generated spritesheets and header  [string] [required]
  -i, --input    Input directory for sprites                 [string] [required]
  -o, --output   Output directory for generated spritesheets (and header if not
                 set)                                        [string] [required]
  -c, --header   Output directory for generated header                  [string]
  -s, --scale    Scale factor for original image          [array] [default: [1]]
```
