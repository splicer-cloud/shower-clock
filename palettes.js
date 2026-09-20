// Curated mid-tone colors keep pearl numerals readable without repeating one mood.
const clockPalettes = [
  {name:'Apricot orchard', colors:['#b56948','#b68c55','#56836a','#307f78','#d49772']},
  {name:'Citrus grove', colors:['#718b43','#a69a4d','#448974','#427f8b','#bc8752']},
  {name:'Guava glow', colors:['#b35a68','#c88060','#9575a0','#705a91','#b89565']},
  {name:'Lagoon', colors:['#267f85','#539c92','#617ea5','#8775a0','#b17c91']},
  {name:'Saffron silk', colors:['#ac7b38','#bd9560','#ad6c61','#805f86','#6b7192']},
  {name:'Wildflower', colors:['#795da0','#a773a8','#667c9f','#548b79','#ad8b70']},
  {name:'Melon mint', colors:['#c37f69','#aa9769','#6d9b85','#398d83','#aa7190']},
  {name:'Rosewood', colors:['#965b72','#b47880','#aa8255','#71875e','#627b90']}
];
let previous = -1;
try { previous = Number(localStorage.getItem('bubble-last-palette') ?? -1); } catch (_) {}
let paletteIndex = (previous + 1 + Math.floor(Math.random() * (clockPalettes.length-1))) % clockPalettes.length;
const paletteLayers = [0,1].map(() => {
  const el = document.createElement('div');
  el.className = 'palette-layer'; el.setAttribute('aria-hidden','true');
  document.body.prepend(el); return el;
});
let activePaletteLayer = 0;
function applyClockPalette(index, initial = false) {
  paletteIndex = index;
  const palette = clockPalettes[index];
  const next = initial ? activePaletteLayer : 1-activePaletteLayer;
  paletteLayers[next].style.backgroundImage = `linear-gradient(125deg, ${palette.colors.join(', ')})`;
  paletteLayers[next].style.opacity = '1';
  if (!initial) paletteLayers[activePaletteLayer].style.opacity = '0';
  activePaletteLayer = next;
  document.body.dataset.palette = palette.name;
  try { localStorage.setItem('bubble-last-palette', String(index)); } catch (_) {}
}
applyClockPalette(paletteIndex, true);
setInterval(() => applyClockPalette((paletteIndex+1)%clockPalettes.length), 90000);
