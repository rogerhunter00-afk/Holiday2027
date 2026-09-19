(() => {
  const ISO_CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  const ALIASES = {
    UK:'GB', 'U.K.':'GB', BRITAIN:'GB', 'GREAT BRITAIN':'GB', ENGLAND:'GB', SCOTLAND:'GB', WALES:'GB', 'NORTHERN IRELAND':'GB',
    USA:'US', 'U.S.A.':'US', 'UNITED STATES OF AMERICA':'US',
    UAE:'AE', 'U.A.E.':'AE',
    'CZECH REPUBLIC':'CZ', 'SOUTH KOREA':'KR', 'NORTH KOREA':'KP',
    RUSSIA:'RU', 'VIET NAM':'VN', BOLIVIA:'BO', TANZANIA:'TZ',
    'MOLDOVA':'MD', 'PALESTINE':'PS', 'VATICAN':'VA'
  };
  const AIRPORT_COUNTRIES = {
    EDI:'GB',GLA:'GB',PIK:'GB',ABZ:'GB',INV:'GB',DND:'GB',LHR:'GB',LGW:'GB',STN:'GB',LTN:'GB',MAN:'GB',BHX:'GB',BRS:'GB',BFS:'GB',
    MLA:'MT',FCO:'IT',CIA:'IT',MXP:'IT',LIN:'IT',VCE:'IT',NAP:'IT',PSA:'IT',BLQ:'IT',
    BCN:'ES',MAD:'ES',ALC:'ES',AGP:'ES',PMI:'ES',IBZ:'ES',TFS:'ES',LPA:'ES',SVQ:'ES',
    LIS:'PT',OPO:'PT',FAO:'PT',FNC:'PT',
    CDG:'FR',ORY:'FR',NCE:'FR',LYS:'FR',MRS:'FR',BOD:'FR',
    AMS:'NL',BRU:'BE',BER:'DE',FRA:'DE',MUC:'DE',HAM:'DE',
    ATH:'GR',JTR:'GR',HER:'GR',RHO:'GR',CFU:'GR',
    DBV:'HR',SPU:'HR',ZAD:'HR',LCA:'CY',PFO:'CY',
    IST:'TR',SAW:'TR',AYT:'TR',BJV:'TR',
    KEF:'IS',DUB:'IE',SNN:'IE',CPH:'DK',OSL:'NO',ARN:'SE',HEL:'FI',
    PRG:'CZ',BUD:'HU',KRK:'PL',WAW:'PL',VIE:'AT',ZRH:'CH',GVA:'CH',
    RAK:'MA',CMN:'MA',CAI:'EG',HRG:'EG',TUN:'TN',DXB:'AE',AUH:'AE',
    JFK:'US',EWR:'US',LAX:'US',SFO:'US',MIA:'US',ORD:'US',YYZ:'CA',YVR:'CA',
    HND:'JP',NRT:'JP',BKK:'TH',SIN:'SG',SYD:'AU',MEL:'AU',AKL:'NZ'
  };
  const CITY_HINTS = {
    'rome':'IT','roma':'IT','milan':'IT','milano':'IT','venice':'IT','florence':'IT','naples':'IT','sicily':'IT','sorrento':'IT',
    'sliema':'MT','valletta':'MT','st julian':'MT','st. julian':'MT','paola':'MT','luqa':'MT','hal luqa':'MT','gozo':'MT','mdina':'MT',
    'barcelona':'ES','madrid':'ES','alicante':'ES','malaga':'ES','málaga':'ES','seville':'ES','ibiza':'ES','mallorca':'ES','majorca':'ES','tenerife':'ES',
    'lisbon':'PT','lisboa':'PT','porto':'PT','faro':'PT','algarve':'PT','madeira':'PT',
    'paris':'FR','nice':'FR','lyon':'FR','marseille':'FR','bordeaux':'FR',
    'athens':'GR','santorini':'GR','mykonos':'GR','crete':'GR','rhodes':'GR','corfu':'GR',
    'dubrovnik':'HR','split':'HR','zadar':'HR','amsterdam':'NL','berlin':'DE','munich':'DE','hamburg':'DE','frankfurt':'DE',
    'istanbul':'TR','antalya':'TR','bodrum':'TR','glasgow':'GB','edinburgh':'GB','aberdeen':'GB','london':'GB','manchester':'GB'
  };

  const display = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], {type:'region'}) : null;
  const countryNames = ISO_CODES.map(code => ({code, name: display?.of(code) || code})).filter(x => x.name && x.name !== x.code);

  function flag(code=''){ return /^[A-Z]{2}$/.test(code) ? code.replace(/[A-Z]/g,c=>String.fromCodePoint(127397+c.charCodeAt())) : ''; }
  function canonical(code){
    code=String(code||'').trim().toUpperCase();
    if(ISO_CODES.includes(code)) return {code,name:display?.of(code)||code,flag:flag(code)};
    return null;
  }
  function fromText(text=''){
    const raw=String(text||'').trim(); if(!raw) return null;
    const upper=raw.toUpperCase();
    for(const [alias,code] of Object.entries(ALIASES)){
      const re=new RegExp('(^|[^A-Z])'+alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^A-Z]|$)','i');
      if(re.test(raw)) return canonical(code);
    }
    for(const x of countryNames){
      const n=x.name;
      const re=new RegExp('(^|[^A-Za-z])'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^A-Za-z]|$)','i');
      if(re.test(raw)) return {...x,flag:flag(x.code)};
    }
    const lower=raw.toLowerCase();
    for(const [city,code] of Object.entries(CITY_HINTS)){ if(lower.includes(city)) return canonical(code); }
    return null;
  }
  function resolve(input={}){
    const explicit=canonical(input.countryCode||input.country_code||'');
    if(explicit) return explicit;
    if(input.country){
      const byName=fromText(input.country); if(byName) return byName;
    }
    const arr=String(input?.flightMeta?.arrival_airport||input.arrival_airport||input.arrival||'').toUpperCase();
    if(AIRPORT_COUNTRIES[arr]) return canonical(AIRPORT_COUNTRIES[arr]);
    const fields=[input.location,input.address,input.destination,input.destination_text,input.title,input.description,input.note,input.source];
    for(const field of fields){ const hit=fromText(field); if(hit) return hit; }
    return null;
  }
  function enrich(input={}){
    const hit=resolve(input);
    if(!hit) return input;
    input.country=hit.name; input.countryCode=hit.code;
    return input;
  }
  window.holidayResolveCountry=resolve;
  window.holidayEnrichCountry=enrich;
})();