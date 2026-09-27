/* Calendar: day 1 = 1 January, Thai seasons and the rain chance per day. */
'use strict';

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const SEASONS = {
  hot:   { th: 'ฤดูร้อน', en: 'Hot season' },
  rainy: { th: 'ฤดูฝน',  en: 'Rainy season' },
  cool:  { th: 'ฤดูหนาว', en: 'Cool season' },
};

/* Day 1 = 1 January. */
function dateOf(day) {
  let d = ((day - 1) % 365 + 365) % 365, m = 0;
  while (d >= MONTH_DAYS[m]) { d -= MONTH_DAYS[m]; m++; }
  return { month: m, date: d + 1 };
}

function seasonOf(day) {
  const m = dateOf(day).month;
  if (m >= 2 && m <= 4) return 'hot';    // Mar–May
  if (m >= 5 && m <= 9) return 'rainy';  // Jun–Oct
  return 'cool';                         // Nov–Feb
}

function rainChance(day) {
  const c = CONFIG.RAIN_CHANCE;
  return typeof c === 'number' ? c : c[seasonOf(day)];
}
