export const durations=[10,20,30,45,60];
const price={10:300,20:600,30:900,45:1200,60:1500};
const pics=['44','49','52','45','47','48','50','51','53','54'];
const names=[['Aisha',22,true],['Nusrat',24,true],['Maya',21,false],['Tania',23,true],['Mim',25,true],['Jannat',22,false],['Riya',26,true],['Sadia',23,true],['Nila',21,false],['Puja',24,true]];
export const fallbackProfiles=names.map(([name,age,online],i)=>({id:`demo-${i+1}`,name,age,rating:5,reviews:0,online,photo:`https://randomuser.me/api/portraits/women/${pics[i]}.jpg`,gallery:[`https://randomuser.me/api/portraits/women/${pics[i]}.jpg`],bio:'Demo profile. Replace this information from the Admin Panel.',languages:['Bengali','English'],price:300,prices:price}));
export function priceFor(profileOrPrice,duration){const d=Number(duration);if(![10,20,30,45,60].includes(d))return 0;if(profileOrPrice&&typeof profileOrPrice==='object'){if(profileOrPrice.prices?.[d]!=null)return Number(profileOrPrice.prices[d])||0;const v=profileOrPrice[`price_${d}`];if(v!=null)return Number(v)||0;if(profileOrPrice.price!=null)return Math.round(Number(profileOrPrice.price)*d/10);return 0}return Math.round((Number(profileOrPrice)||0)*d/10)}
