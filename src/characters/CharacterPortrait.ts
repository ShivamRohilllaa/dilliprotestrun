import type { CharacterAppearance, CharacterDefinition } from './CharacterDefinitions';

const escape = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (value) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[value]!,
  );
const color = (value: string): string => (/^#[0-9a-f]{6}$/i.test(value) ? value : '#48534b');

/** Original code-drawn portraits: no embedded photos, network requests, or SVG scripts. */
export function characterPortrait(definition: CharacterDefinition): string {
  const look: CharacterAppearance = definition.appearance ?? {
    skin: '#bc754b',
    hair: '#252d36',
    hairStyle: 'swept',
    beard: 'none',
    moustache: false,
    glasses: 'none',
    clothing: 'shirt',
    build: 'regular',
    trousers: '#304757',
  };
  const skin = color(look.skin);
  const hair = color(look.hair);
  const outfit = color(definition.color);
  const accent = color(definition.accent);
  const width = look.build === 'broad' ? 64 : look.build === 'slim' ? 51 : 57;
  const left = 120 - width;
  const right = 120 + width;
  const jaw = look.build === 'broad' ? 174 : 168;
  const shoulders = look.build === 'broad' ? '22 224 Q24 181 80 175' : '34 224 Q35 184 80 175';
  const clothes = clothing(look, outfit, accent);
  const beard =
    look.beard === 'none'
      ? ''
      : `<path d="M${left + 4} 111 Q${left + 9} 130 76 134 Q91 146 120 143 Q149 146 164 134 Q${right - 9} 130 ${right - 4} 111 L${right - 8} 151 Q155 ${look.beard === 'long' ? 195 : jaw + 12} 120 ${look.beard === 'long' ? 199 : jaw + 14} Q85 ${look.beard === 'long' ? 195 : jaw + 12} ${left + 8} 151 Z" fill="${hair}" opacity="${look.beard === 'stubble' ? '.48' : '1'}"/>`;
  const moustache = look.moustache
    ? `<path d="M94 137 Q104 128 120 134 Q136 128 146 137 L141 143 Q129 138 120 139 Q111 138 99 143Z" fill="${hair}"/>`
    : '';
  const saltPepper =
    definition.id === 'pappu'
      ? `<g stroke="#d6d7ce" stroke-width="4" stroke-linecap="round"><path d="M80 148l9 9m1-4 8 9m61-14-9 9m-1-4-8 9m-28 3 4 7m12-7-4 7"/></g>`
      : '';
  const glasses =
    look.glasses === 'none'
      ? ''
      : glassesSvg(
          look.glasses,
          definition.id === 'mobi' || definition.id === 'amit' ? '#8a8576' : '#28303a',
        );
  const tilak = look.tilak
    ? '<path d="M117 70v20m6-20v20" stroke="#c34f22" stroke-width="4" stroke-linecap="round"/>'
    : '';
  const headwear =
    look.headwear === 'saffron-band'
      ? `<path d="M${left} 77q${width} 13 ${width * 2} 0v13q-${width} 13-${width * 2} 0Z" fill="#ee811d"/><path d="M${right - 2} 82l18 21-8 31-10-45Z" fill="#ee811d"/>`
      : look.headwear === 'black-cap'
        ? '<path d="M63 61 68 25 120 15 172 25 177 61q-57-9-114 0Z" fill="#202328"/>'
        : '';
  let accessory = '';
  if (definition.accessory === 'scarf')
    accessory = `<path d="M78 176q42 24 84 0l7 21q-48 25-98 0Z" fill="${accent}"/><path d="M140 193h24v55h-24z" fill="${accent}"/>`;
  if (definition.accessory === 'apron')
    accessory = `<path d="M91 186h58l11 62H80z" fill="${accent}"/><path d="M99 216h42v20H99z" fill="#eed6ae"/><path d="M68 55q-3-23 20-24 4-22 26-11 20-17 34 5 27-3 25 29Z" fill="#eed6ae"/>`;
  if (definition.accessory === 'headphones')
    accessory = `<path d="M57 110V88q0-64 63-64t63 64v22" fill="none" stroke="${accent}" stroke-width="11"/><rect x="47" y="91" width="22" height="43" rx="9" fill="${accent}"/><rect x="171" y="91" width="22" height="43" rx="9" fill="${accent}"/>`;
  if (definition.accessory === 'crown')
    accessory = `<path d="M70 52 65 14l29 18 26-27 26 27 29-18-5 38Z" fill="${accent}" stroke="#be8c37" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 248" role="img" aria-label="${escape(definition.name)} — original caricature"><title>${escape(definition.name)}</title>
    <circle cx="120" cy="116" r="98" fill="${accent}" opacity=".12"/>
    <path d="M${shoulders} L160 175 Q${look.build === 'broad' ? '216' : '205'} 184 ${look.build === 'broad' ? '218' : '206'} 224L216 248H24Z" fill="${outfit}"/>
    <path d="M99 151h42v33q-20 18-42 0Z" fill="${skin}"/>
    ${clothes}
    <ellipse cx="${left}" cy="111" rx="11" ry="18" fill="${skin}"/><ellipse cx="${right}" cy="111" rx="11" ry="18" fill="${skin}"/>
    <path d="M${left} 88Q${left} 35 120 35T${right} 88v41Q${right - 2} ${jaw} 120 ${jaw + 5}Q${left + 2} ${jaw} ${left} 129Z" fill="${skin}"/>
    <path d="M${left + 8} 118q3 27 14 29m${width * 2 - 44}-29q-3 27-14 29" stroke="#9c6748" stroke-opacity=".25" stroke-width="3" fill="none"/>
    ${beard}${hairSvg(look.hairStyle, hair, left, right)}
    <g fill="#f8ead8"><ellipse cx="97" cy="109" rx="12" ry="6"/><ellipse cx="143" cy="109" rx="12" ry="6"/></g>
    <g fill="#27313a"><circle cx="98" cy="109" r="4"/><circle cx="142" cy="109" r="4"/></g>
    <path d="M84 97q12-7 25-1m22 0q13-6 25 1" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round"/>
    <path d="M119 108l-6 23q7 5 14 0" fill="none" stroke="#9c6748" stroke-width="3" stroke-linecap="round"/>
    <path d="M108 147q12 7 24 0" fill="none" stroke="#824b3c" stroke-width="3" stroke-linecap="round"/>
    ${moustache}${saltPepper}${glasses}${tilak}${accessory}${headwear}
  </svg>`;
}

function hairSvg(
  style: CharacterAppearance['hairStyle'],
  hair: string,
  left: number,
  right: number,
): string {
  if (style === 'shaved') return '';
  const sides = `<path d="M${left} 81q-7 23 0 40l9-19V74Zm${right - left} 0q7 23 0 40l-9-19V74Z" fill="${hair}"/>`;
  if (style === 'bald') return sides;
  if (style === 'receding')
    return (
      sides +
      `<path d="M${left} 83q-7-34 24-43l2 18q-12 10-17 28Zm${right - left} 0q7-34-24-43l-2 18q12 10 17 28Z" fill="${hair}"/>`
    );
  if (style === 'tousled')
    return (
      sides +
      `<path d="M${left - 2} 89Q49 57 65 43l-1-13 19 6Q99 12 118 26l17-13 7 16q25-3 34 15l9 2-8 16 5 22-16-11q-11-18-30-17-31 24-65 15Z" fill="${hair}"/>`
    );
  if (style === 'swept')
    return (
      sides +
      `<path d="M${left} 91Q48 54 74 39q29-26 64-13 36-2 42 30l-7 27-18-25q-36 22-82 12Z" fill="${hair}"/>`
    );
  return (
    sides +
    `<path d="M${left} 83q-8-29 16-43l14-9 13 4 17-7 15 6 15-1q25 9 29 26l-4 25-16-20q-42 9-79 0Z" fill="${hair}"/>`
  );
}

function glassesSvg(style: 'round' | 'rectangular', frame: string): string {
  const lenses =
    style === 'round'
      ? '<circle cx="96" cy="111" r="18"/><circle cx="144" cy="111" r="18"/>'
      : '<rect x="75" y="97" width="41" height="28" rx="5"/><rect x="124" y="97" width="41" height="28" rx="5"/>';
  return `<g fill="none" stroke="${frame}" stroke-width="3.5">${lenses}<path d="M114 107q6-4 12 0M62 102l13 4m90 0 13-4"/></g>`;
}

function clothing(look: CharacterAppearance, outfit: string, accent: string): string {
  if (look.clothing === 'robe')
    return `<path d="M90 174q13 36 56 74h42q-57-52-67-74Z" fill="${accent}"/><path d="M91 177q-9 27 15 47t51 9" fill="none" stroke="#754625" stroke-width="6" stroke-dasharray="2 7" stroke-linecap="round"/>`;
  if (look.clothing === 'vest')
    return `<path d="M80 175l27 15h26l27-15 18 73H62Z" fill="${accent}"/><path d="M106 178v17h28v-17" fill="${accent}" stroke="${outfit}" stroke-width="2"/><path d="M120 196v52" stroke="#303b44" stroke-opacity=".25" stroke-width="2"/><g fill="#ddc9a6"><circle cx="122" cy="206" r="2"/><circle cx="122" cy="222" r="2"/><circle cx="122" cy="238" r="2"/></g>`;
  if (look.clothing === 'sweater')
    return `<path d="M82 174q38 32 76 0" fill="none" stroke="${accent}" stroke-width="7"/><path d="M38 216h166v17H38Z" fill="${accent}"/>`;
  return `<path d="M90 173l30 17-17 19-20-32m67-4-30 17 17 19 20-32" fill="${accent}"/><path d="M120 190v${look.clothing === 'polo' ? '30' : '58'}" stroke="${accent}" stroke-width="2"/><g fill="${accent}"><circle cx="125" cy="204" r="2"/><circle cx="125" cy="216" r="2"/>${look.clothing === 'polo' ? '' : '<circle cx="125" cy="229" r="2"/>'}</g>${look.clothing === 'shirt' ? `<path d="M148 210h24v20h-24Z" fill="none" stroke="${accent}" stroke-width="2"/>` : ''}`;
}
