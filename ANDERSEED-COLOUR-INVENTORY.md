# Anderseed Website Colour Inventory

Audited from the currently built website in `dist/` on 22 August 2026.

## Summary

- 286 unique hex literals (285 visually unique hex shades after expanding `#FFF` to `#FFFFFF`)
- 122 unique RGB/RGBA/HSL/HSLA literal forms
- Named colour keywords in use: `currentColor`, `transparent`, and `white`
- Scope: homepage, assessment, portfolio visuals, blog, checkout, legal/about/FAQ pages, social icons, and the assessment admin report

## Core Anderseed palette

| Role | CSS token | Code |
|---|---|---|
| Deep pine | `--assessment-pine` / dark panels | `#0F2E22` |
| Forest green | `--leaf-dark`, `--assessment-forest` | `#1F6B52` |
| Primary leaf green | `--leaf`, `--assessment-leaf` | `#2E8268` |
| Legacy/secondary leaf | Used in some older page components | `#318A6E` |
| Sage highlight | `--assessment-sage`, assessment gold highlight | `#7ED4A0` |
| Mint surface | `--mint` | `#EAF5E8` |
| Primary ink | `--ink`, `--assessment-ink` | `#171918` |
| Secondary ink | `--soft-ink`, `--assessment-muted` | `#4F5857` |
| Paper | `--paper`, `--assessment-paper` | `#FFFDF8` |
| Warm stone | `--warm`, `--assessment-stone` | `#F6EFE2` |
| White | `--white` | `#FFFFFF` / `#FFF` |
| Standard border | `--line`, `--assessment-line` | `#DDD5C8` |
| Control border | `--control-line` | `#829089` |
| Focus ring | `--focus-ring` | `#0F6A4D` |
| Gold accent | `--gold` | `#C8A55A` |
| Terracotta accent | `--terracotta` | `#B76F4F` |

## Copyable core CSS

```css
:root {
  --pine: #0F2E22;
  --forest: #1F6B52;
  --leaf: #2E8268;
  --sage: #7ED4A0;
  --mint: #EAF5E8;
  --ink: #171918;
  --soft-ink: #4F5857;
  --paper: #FFFDF8;
  --warm: #F6EFE2;
  --white: #FFFFFF;
  --line: #DDD5C8;
  --control-line: #829089;
  --focus-ring: #0F6A4D;
  --gold: #C8A55A;
  --terracotta: #B76F4F;
}
```

## Portfolio case palettes

| Case | Strong | Accent | Soft | Tint | Light | Border |
|---|---|---|---|---|---|---|
| CRM | `#0F2E22` | `#1F6B52` | `#EDF7F0` | `#DCEFE2` | `#BFE8CC` | `#B9D6C5` |
| HCM | `#0F2E22` | `#3E6F5B` | `#EEF5F0` | `#DDEAE2` | `#CBE5D5` | `#BDCEC4` |
| ERP | `#0F2E22` | `#5F713C` | `#F3F5E8` | `#E4E9D1` | `#DAE5B8` | `#CBD2AF` |

Additional prototype accents include HCM purples `#7052BD`, `#8F68D8`, `#9B71E4`, `#C7A8FF`; and ERP browns/oranges `#3B2A0F`, `#8F5400`, `#B66A00`, `#C98719`, `#FFE0A3`.

## Social/service brand colours

| Brand | Codes used |
|---|---|
| LinkedIn | `#0A66C2` |
| Telegram | `#229ED9`, `#1C93CC` |
| WhatsApp | `#25D366` |
| Instagram | `#D62976`, `#962FBF`, `#FEDA75` |
| YouTube | `#FF0000` |

## Assessment report/admin palette

| Role | Code |
|---|---|
| Ink | `#17352B` |
| Muted | `#68766F` |
| Green | `#267A61` |
| Dark green | `#185844` |
| Mint | `#EAF5F0` |
| Cream | `#F7F4EC` |
| Border | `#DBE4DE` |
| White | `#FFFFFF` |

## Additional source-only literals

These two blog-card overlays exist in the editable source but are not present in the current `dist/` build:

- `rgba(0,136,204,.35)` — community-card border
- `rgba(0,136,204,.04)` — community-card background

The icon system otherwise inherits colour through `currentColor`; most SVG files do not hard-code their own shade.

## Complete hex-literal inventory

This is the exhaustive literal list used by the current built website. Short and long forms are preserved exactly as written.

```text
#0A66C2  #0F2E22  #0F6A4D  #101411  #111  #161616  #16221D  #171918
#17211E  #17352B  #174F3E  #18201B  #185844  #1B1F1C  #1C93CC  #1D2E27
#1F2925  #1F2C19  #1F6B52  #1F7AE0  #1F7E5B  #1F8A57  #202623  #202723
#202925  #203015  #21183A  #222  #229ED9  #23302C  #24312D  #25312C
#25332F  #25D366  #26322D  #263330  #267A61  #27312E  #29322E  #2C3933
#2D3431  #2E8268  #2F5FB8  #2F7D46  #303634  #303A36  #31403A  #318A6E
#323B38  #323C37  #34402C  #34413B  #34413D  #34423B  #34423C  #35403C
#355246  #363F3D  #36423E  #37403D  #3A4842  #3B2A0F  #3B4642  #3D4944
#3E6F5B  #3F4947  #3F4B45  #43886F  #44534C  #45504C  #45514C  #46534E
#48534E  #4A5751  #4F5857  #4F5BD5  #505955  #52605A  #53615A  #59635E
#59655F  #596661  #5B91D5  #5D6762  #5E6864  #5F713C  #60706A  #626764
#635BFF  #63A67E  #65706A  #65746F  #68716D  #68766F  #69716D  #6A706D
#6AA2DF  #6E8B73  #7052BD  #718078  #727A76  #737A77  #762C20  #76570C
#795D17  #79A9EF  #7ED4A0  #829089  #8AA5A0  #8E9A94  #8F5400  #8F68D8
#8FA824  #962FBF  #96E3B2  #9A7D30  #9AB89F  #9B5A00  #9B71E4  #9DC8EB
#9F2D2D  #9FB1A6  #9FB2A6  #9FCEA7  #A6533F  #A9D6B6  #AAC7E7  #AEB0AA
#AEB9B2  #AEBDB5  #AEBFB4  #AFC0B5  #AFDAC2  #B66A00  #B6CF34  #B76F4F
#B7CF35  #B7D0BF  #B84C18  #B8C0BA  #B9AA96  #B9C9BF  #B9CABD  #B9D6C5
#B9D7CA  #BAC9C0  #BAF3CD  #BDC8C1  #BDCEC4  #BF8C12  #BFC8C2  #BFC8C4
#BFD0C5  #BFE8CC  #C0E4C9  #C26F88  #C44868  #C6E0CE  #C7A8FF  #C7DFCC
#C8A55A  #C8D2CA  #C8D5CD  #C98719  #C9D7CE  #CBD2AF  #CBD6CE  #CBD7D0
#CBD8CE  #CBD9D0  #CBD9F7  #CBE2D8  #CBE5D5  #CFD7D3  #D0DDD5  #D5E0D8
#D62976  #D6A15F  #D6E6DC  #D6EFE0  #D7DFD5  #D8D1C4  #D8D1C5  #D8D2C8
#D8DFDA  #D8E2DB  #D8E5DC  #D9D2C7  #D9E2DC  #DAE5B8  #DBE4DE  #DBE5E1
#DBE6DE  #DCE5DE  #DCEFE2  #DDD5C8  #DDD6CA  #DDEAE2  #DDEFE2  #DED6C9
#DED8CD  #DFEAD8  #DFF3E8  #E0D9CD  #E2E9E4  #E36A2C  #E3AD22  #E3EAE5
#E4D7FF  #E4D9C9  #E4DED3  #E4E9D1  #E4F2E9  #E5B02A  #E5CA83  #E5DED3
#E6F5EC  #E7DDD0  #E7EFFF  #E8DDD2  #E8FFF0  #E9ECEA  #EADFD1  #EAF5E8
#EAF5F0  #EAF7F0  #ECF6EF  #EDF1EE  #EDF4FF  #EDF5EF  #EDF6EF  #EDF7F0
#EEF5F0  #EEF6EF  #EEF6F0  #EFD2A7  #EFF8F2  #F1EAFF  #F1ECFF  #F2C8D7
#F2F5F4  #F3EAD1  #F3F5E8  #F4EFFF  #F4F0E9  #F4F1EB  #F4F6EC  #F4F7F3
#F4F7F5  #F5F2EC  #F5F8FF  #F6EFE2  #F6FBF8  #F7F2FF  #F7F3EA  #F7F4EC
#F7F5F1  #F7FBF7  #F8ECD0  #F8FAF6  #F8FBF8  #F9F2E6  #FBFAF6  #FBFCFB
#FBFCFD  #FBFDF9  #FDEBF1  #FEDA75  #FF0000  #FFB3C7  #FFE0A3  #FFE5B7
#FFF  #FFF0EC  #FFF0F4  #FFF1DC  #FFF3DD  #FFF6DE  #FFF6E8  #FFF7EB
#FFF8EB  #FFF8EC  #FFFAF0  #FFFAF1  #FFFDF8  #FFFFFF
```

## Complete RGB/RGBA/HSL/HSLA inventory

These are mainly shadows, overlays, borders, focus states, glass effects, grids, and diagram fills.

```text
rgba(0,0,0,.08)  rgba(0,0,0,.09)  rgba(0,0,0,.18)  rgba(0,0,0,.72)
rgba(0,0,0,.8)  rgba(112,82,189,.25)  rgba(112,82,189,.28)  rgba(126,212,160,.025)
rgba(126,212,160,.035)  rgba(126,212,160,.04)  rgba(126,212,160,.08)  rgba(126,212,160,.09)
rgba(126,212,160,.15)  rgba(126,212,160,.22)  rgba(126,212,160,.24)  rgba(126,212,160,.25)
rgba(126,212,160,.32)  rgba(14,44,34,.028)  rgba(145,167,35,.14)  rgba(15,46,34,.025)
rgba(15,46,34,.035)  rgba(15,46,34,.04)  rgba(15,46,34,.055)  rgba(15,46,34,.12)
rgba(15,46,34,.14)  rgba(15,46,34,.15)  rgba(15,46,34,.16)  rgba(15,46,34,.18)
rgba(15,46,34,.28)  rgba(15,46,34,.38)  rgba(15,46,34,.82)  rgba(159,198,172,.12)
rgba(159,198,172,.19)  rgba(159,198,172,.5)  rgba(182,106,0,.28)  rgba(182,106,0,.30)
rgba(189,141,21,.45)  rgba(200,165,90,.16)  rgba(207,199,184,.78)  rgba(221,213,200,.86)
rgba(221,213,200,.92)  rgba(221,213,200,.95)  rgba(23,53,43,.06)  rgba(234,245,232,.28)
rgba(251,248,240,.4)  rgba(251,248,240,.92)  rgba(251,248,240,.94)  rgba(255,252,245,.9)
rgba(255,252,245,.94)  rgba(255,253,248,.92)  rgba(255,253,248,.94)  rgba(255,253,248,.98)
rgba(255,255,255,.035)  rgba(255,255,255,.045)  rgba(255,255,255,.08)  rgba(255,255,255,.1)
rgba(255,255,255,.12)  rgba(255,255,255,.14)  rgba(255,255,255,.15)  rgba(255,255,255,.16)
rgba(255,255,255,.18)  rgba(255,255,255,.2)  rgba(255,255,255,.24)  rgba(255,255,255,.27)
rgba(255,255,255,.28)  rgba(255,255,255,.3)  rgba(255,255,255,.54)  rgba(255,255,255,.72)
rgba(255,255,255,.75)  rgba(255,255,255,.78)  rgba(255,255,255,.8)  rgba(255,255,255,.82)
rgba(255,255,255,.9)  rgba(255,255,255,.92)  rgba(255,255,255,.94)  rgba(255,255,255,.96)
rgba(28,49,39,.1)  rgba(31,107,82,.2)  rgba(34,158,217,.32)  rgba(38,122,97,.28)
rgba(38,43,39,.08)  rgba(38,43,39,.09)  rgba(46,130,104,.018)  rgba(46,130,104,.028)
rgba(46,130,104,.08)  rgba(46,130,104,.11)  rgba(46,130,104,.12)  rgba(46,130,104,.13)
rgba(46,130,104,.2)  rgba(47,95,184,.16)  rgba(49,138,110,.07)  rgba(49,138,110,.08)
rgba(49,138,110,.09)  rgba(49,138,110,.1)  rgba(49,138,110,.10)  rgba(49,138,110,.12)
rgba(49,138,110,.14)  rgba(49,138,110,.15)  rgba(49,138,110,.16)  rgba(49,138,110,.18)
rgba(49,138,110,.2)  rgba(49,138,110,.22)  rgba(49,138,110,.24)  rgba(49,138,110,.36)
rgba(49,138,110,.38)  rgba(49,138,110,.42)  rgba(49,138,110,.45)  rgba(49,138,110,.52)
rgba(49,138,110,.55)  rgba(49,138,110,.62)  rgba(49,138,110,.7)  rgba(49,138,110,.72)
rgba(49,138,110,.75)  rgba(49,43,31,.035)  rgba(49,43,31,.04)  rgba(49,43,31,.045)
rgba(49,43,31,.05)  rgba(49,43,31,.06)  rgba(49,43,31,.07)  rgba(49,43,31,.1)
rgba(49,43,31,.10)  rgba(49,43,31,.12)
```
