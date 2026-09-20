// Sculpted vector artwork stays crisp on phones and large displays.
function updateWeatherUI(temp, code, isDay = 1) {
    const svg = document.getElementById('dynamic-weather-svg');
    const sun = code === 0 || code === 1;
    const rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
    const snow = (code >= 71 && code <= 77) || code === 85 || code === 86;
    const storm = code >= 95;
    const fog = code === 45 || code === 48;
    const partial = code === 2;
    const label = sun ? (isDay ? 'Sunny' : 'Clear night') : storm ? 'Thunderstorms' : snow ? 'Snow' : rain ? 'Rain' : fog ? 'Fog' : partial ? 'Partly cloudy' : 'Cloudy';
    const defs = `<defs>
      <linearGradient id="cloudPearl" x1="0" y1="0" x2=".3" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#ffffff"/><stop offset=".4" stop-color="#f4fcff"/><stop offset=".72" stop-color="#dce4f4"/><stop offset="1" stop-color="#a7b4d1"/></linearGradient>
      <radialGradient id="sunGold" cx=".32" cy=".23" r=".85"><stop stop-color="#fffcd6"/><stop offset=".38" stop-color="#ffe99b"/><stop offset=".75" stop-color="#ffc866"/><stop offset="1" stop-color="#ec9553"/></radialGradient>
      <linearGradient id="rainGlass" x2=".7" y2="1"><stop stop-color="#e2ffff"/><stop offset="1" stop-color="#62c6eb"/></linearGradient>
      <radialGradient id="moonPearl" cx=".3" cy=".2"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#c5cfec"/></radialGradient>
      <filter id="artShadow" x="-30%" y="-40%" width="170%" height="190%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#253d60" flood-opacity=".28"/></filter>
    </defs>`;
    function sunArt(cx, cy, r) {
      const rays = Array.from({length:12}, (_, i) => `<path d="M ${cx} ${cy-r-9} v -7" transform="rotate(${i*30} ${cx} ${cy})" stroke="#ffe6a2" stroke-width="5" stroke-linecap="round"/>`).join('');
      return `<g filter="url(#artShadow)"><g class="weather-rays" style="transform-origin:${cx}px ${cy}px">${rays}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sunGold)" stroke="#fff1c3" stroke-width="1.5"/><path d="M ${cx-r*.65} ${cy-r*.35} Q ${cx-r*.3} ${cy-r*.85} ${cx+r*.2} ${cy-r*.72}" fill="none" stroke="white" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/></g>`;
    }
    let art = '';
    if (sun && isDay) art = sunArt(80,70,39);
    else if (sun) art = `<g filter="url(#artShadow)"><circle cx="80" cy="70" r="42" fill="url(#moonPearl)" stroke="#eef5ff"/><circle cx="60" cy="52" r="7" fill="#9eadd0" opacity=".18"/><circle cx="102" cy="86" r="10" fill="#9eadd0" opacity=".17"/><path class="weather-stars" d="M 133 28 l 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z M 26 86 l 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#fff9d5"/></g>`;
    else {
      if (partial) art += sunArt(112,40,23);
      art += `<g class="weather-cloud" filter="url(#artShadow)"><path d="M 36 106 C 4 106 4 65 30 61 C 27 35 60 21 79 43 C 96 28 124 40 125 62 C 156 61 159 106 129 106 Z" fill="url(#cloudPearl)" stroke="#f6fbff" stroke-width="1.2"/><path d="M 38 60 C 39 39 62 34 75 48" stroke="white" stroke-width="4" stroke-linecap="round" fill="none" opacity=".85"/><path d="M 23 88 Q 20 74 32 71" stroke="white" stroke-width="3" stroke-linecap="round" fill="none" opacity=".6"/><path d="M 36 101 H 126" stroke="#9caaca" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/></g>`;
      if (storm) art += `<path class="weather-lightning" d="M 83 102 L 69 122 H 80 L 74 138 L 97 115 H 85 L 94 102 Z" fill="url(#sunGold)" stroke="#fff0b9" stroke-width="1"/>`;
      else if (rain) art += [43,80,117].map((x,i)=>`<path class="weather-rain" style="animation-delay:${-i*.7}s" d="M ${x} 113 C ${x-12} 126 ${x-7} 133 ${x} 131 C ${x+7} 129 ${x+4} 121 ${x} 113 Z" fill="url(#rainGlass)" filter="url(#artShadow)"/>`).join('');
      else if (snow) art += [43,80,117].map((x,i)=>`<g class="weather-snow" style="animation-delay:${-i*1.3}s" stroke="#efffff" stroke-width="2.5" stroke-linecap="round" filter="url(#artShadow)"><path d="M ${x} 115 v 16 M ${x-7} 119 l 14 8 M ${x-7} 127 l 14 -8"/></g>`).join('');
      else if (fog) art += `<path class="weather-fog" d="M 29 117 H 130 M 43 127 H 114" stroke="#e5f8f7" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>`;
    }
    const value = Number.isFinite(temp) ? Math.round(temp) + '\u00b0' : '--\u00b0';
    svg.setAttribute('viewBox','0 0 160 140');
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label', `${label}, ${value} Fahrenheit`);
    svg.innerHTML = `<title>${label}, ${value} Fahrenheit</title>${defs}${art}<text id="weather-temp" x="80" y="${sun ? 73 : 78}" text-anchor="middle" dominant-baseline="middle">${value}</text>`;
}
